-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0006 — Résultats des stages (responses / reviews / verdicts)
-- ════════════════════════════════════════════════════════════════════════

-- ─── model_responses · Stage 1 ───────────────────────────────────────────
-- Réponse de chaque délégué à la question. Une ligne par slot (A..D).
create table public.model_responses (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.runs (id) on delete cascade,
  -- Slot logique du délégué dans l'assemblée ('A','B','C','D').
  slot        text not null,
  -- Identifiant OpenRouter réel du modèle (ex. mistralai/mistral-7b-instruct:free).
  model_id    text not null,
  content     text,
  status      text not null default 'streaming'
              check (status in ('streaming','complete','error','timeout')),
  error       text,
  latency_ms  int,
  tokens_in   int,
  tokens_out  int,
  created_at  timestamptz not null default now(),

  unique (run_id, slot)
);

comment on table  public.model_responses is
  'Stage 1 — réponse parallèle de chaque délégué. 1 ligne par slot (A..D).';
comment on column public.model_responses.slot is
  'Slot logique du délégué (A..D), stable au sein du run.';
comment on column public.model_responses.status is
  'streaming → complete | error | timeout (dégradation gracieuse côté flow).';

create index model_responses_run_id_idx on public.model_responses (run_id);

-- ─── reviews · Stage 2 (peer-review aveugle) ─────────────────────────────
-- Chaque délégué classe les réponses des AUTRES, présentées anonymisées
-- ("Modèle A/B/C"). Le mapping label anonyme → slot réel est conservé
-- côté serveur dans `ranking` (jamais montré au modèle évaluateur).
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references public.runs (id) on delete cascade,
  -- Slot du délégué qui ÉVALUE (sa propre réponse est exclue du lot).
  reviewer_slot  text not null,
  reviewer_model text not null,
  -- Classement structuré et désanonymisé côté serveur :
  --   [{ "position": 1, "anon_label": "Modèle B", "target_slot": "C",
  --      "reason": "..." }, ...]
  ranking        jsonb not null,
  -- Sortie brute du modèle (audit du parsing FINAL RANKING / fallback regex).
  raw_output     text,
  -- false = parsing échoué → vote ignoré dans l'agrégation Borda (log interne).
  parse_ok       boolean not null default true,
  created_at     timestamptz not null default now(),

  unique (run_id, reviewer_slot)
);

comment on table  public.reviews is
  'Stage 2 — classement aveugle produit par chaque délégué sur les réponses des autres.';
comment on column public.reviews.ranking is
  'Classement désanonymisé côté serveur : position, label anonyme montré, slot réel ciblé, raison.';
comment on column public.reviews.parse_ok is
  'false si le bloc FINAL RANKING n''a pu être parsé → vote ignoré (Borda).';

create index reviews_run_id_idx on public.reviews (run_id);

-- ─── verdicts · Stage 3 (synthèse Chairman) ──────────────────────────────
-- Une synthèse unique par run : verdict éditorial, score de consensus,
-- désaccords assumés, et scores Borda agrégés depuis les reviews.
create table public.verdicts (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null unique references public.runs (id) on delete cascade,
  chairman_model  text not null,
  -- Verdict final (2-4 paragraphes), synthèse des convergences.
  body            text not null,
  -- Score de consensus 0–100 (accord inter-modèles).
  consensus_score int not null check (consensus_score between 0 and 100),
  -- Points de divergence listés honnêtement : ["...", "..."].
  disagreements   jsonb not null default '[]'::jsonb,
  -- Agrégation Borda des votes Stage 2 : { "A": 7, "B": 5, ... }.
  borda_scores    jsonb not null default '{}'::jsonb,
  raw_output      text,
  created_at      timestamptz not null default now()
);

comment on table  public.verdicts is
  'Stage 3 — synthèse Chairman : verdict, score de consensus, désaccords, scores Borda.';
comment on column public.verdicts.consensus_score is
  'Score de consensus 0–100 reflétant l''accord entre délégués.';
comment on column public.verdicts.borda_scores is
  'Agrégation Borda des classements Stage 2 (1er=3, 2e=2, 3e=1 pt) par slot.';

create index verdicts_run_id_idx on public.verdicts (run_id);
