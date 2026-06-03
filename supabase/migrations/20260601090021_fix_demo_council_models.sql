-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0021 — Correctif modèles OpenRouter :free du council démo
-- ════════════════════════════════════════════════════════════════════════
-- Le seed 0013 (ON CONFLICT DO NOTHING) n'écrase pas un enregistrement déjà
-- présent : l'« Assemblée démo » conserve donc en BDD les anciens slugs :free
-- (mistral-7b, gemma-2-9b, qwen3-235b) désormais retirés d'OpenRouter → 404.
-- On force ici les IDs à jour (juin 2026), alignés sur _shared/models.ts.
-- ════════════════════════════════════════════════════════════════════════

update public.councils
set
  delegates = '[
    {"slot":"A","model_id":"meta-llama/llama-3.3-70b-instruct:free","label":"Llama 3.3 70B"},
    {"slot":"B","model_id":"qwen/qwen3-next-80b-a3b-instruct:free","label":"Qwen3 Next 80B"},
    {"slot":"C","model_id":"google/gemma-4-31b-it:free","label":"Gemma 4 31B"},
    {"slot":"D","model_id":"openai/gpt-oss-120b:free","label":"GPT-OSS 120B"}
  ]'::jsonb,
  chairman_model = 'meta-llama/llama-3.3-70b-instruct:free'
where id = '00000000-0000-0000-0000-0000000c0de1';
