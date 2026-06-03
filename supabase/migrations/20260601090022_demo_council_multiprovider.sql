-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0022 — Council démo multi-provider (Cerebras / Groq / Gemini)
-- ════════════════════════════════════════════════════════════════════════
-- Abandon des modèles OpenRouter `:free` (trop limités) pour le mode démo au
-- profit de providers gratuits OpenAI-compatibles. Le routage model_id→provider
-- est porté côté Edge Function (_shared/models.ts · DEMO_PROVIDER_BY_MODEL) ;
-- la base ne stocke que les model_id. Aligné sur le seed 0013.
-- Le BYOK (OpenRouter) reste inchangé.
-- ════════════════════════════════════════════════════════════════════════

update public.councils
set
  description = 'Quatre modèles gratuits multi-provider (Cerebras / Groq / Gemini) + Chairman. Council par défaut du mode démo.',
  delegates = '[
    {"slot":"A","model_id":"zai-glm-4.7","label":"GLM 4.7"},
    {"slot":"B","model_id":"llama-3.3-70b-versatile","label":"Llama 3.3 70B"},
    {"slot":"C","model_id":"gemini-2.5-flash-lite","label":"Gemini 2.5 Flash Lite"},
    {"slot":"D","model_id":"gpt-oss-120b","label":"GPT-OSS 120B"}
  ]'::jsonb,
  chairman_model = 'llama-3.3-70b-versatile'
where id = '00000000-0000-0000-0000-0000000c0de1';
