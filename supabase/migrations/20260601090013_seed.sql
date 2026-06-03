-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0013 — Seed (preset démo & questions éditoriales)
-- ════════════════════════════════════════════════════════════════════════
-- Données de référence non liées à un utilisateur :
--   • le council démo par défaut (4 modèles :free + Chairman)
--   • les questions inspirantes du first-run (servies sans inscription)
-- Idempotent : ON CONFLICT DO NOTHING / WHERE NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Council démo par défaut (preset système) ────────────────────────────
insert into public.councils (id, owner_id, name, description, delegates, chairman_model, is_preset, is_default)
values (
  '00000000-0000-0000-0000-0000000c0de1',
  null,
  'Assemblée démo',
  'Quatre modèles gratuits multi-provider (Cerebras / Groq / Gemini) + Chairman. Council par défaut du mode démo.',
  '[
    {"slot":"A","model_id":"llama-3.1-8b-instant","label":"Llama 3.1 8B"},
    {"slot":"B","model_id":"llama-3.3-70b-versatile","label":"Llama 3.3 70B"},
    {"slot":"C","model_id":"gemini-2.5-flash-lite","label":"Gemini 2.5 Flash Lite"},
    {"slot":"D","model_id":"openai/gpt-oss-120b","label":"GPT-OSS 120B"}
  ]'::jsonb,
  'llama-3.3-70b-versatile',
  true,
  true
)
on conflict (id) do nothing;

-- ─── Questions inspirantes du first-run (éditoriales) ────────────────────
insert into public.questions (body, is_editorial)
select v.body, true
from (values
  ('La conscience peut-elle être simulée, ou est-elle fondamentalement biologique ?'),
  ('Quelle décision a eu le plus grand impact sur l''histoire de l''humanité ?'),
  ('Comment la musique crée-t-elle de l''émotion ?')
) as v(body)
where not exists (
  select 1 from public.questions q where q.body = v.body and q.is_editorial
);
