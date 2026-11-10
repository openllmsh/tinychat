# Tiny Chat — Connect with OpenLLM test app

Next.js + shadcn chat that runs on the signed-in user's OpenLLM account.

1. `cp .env.example .env.local` and paste your app's `.env` block
   (OpenLLM → Settings → Developers → Apps). Register
   `http://localhost:3005/callback` as a callback URL on the app.
2. `bun dev` → http://localhost:3005 → Connect with OpenLLM → chat.

- `lib/openllm-connect.ts` — the official helper, copied unchanged
- `app/api/connect/start` → OpenLLM consent → `app/callback` (key pickup)
- `app/api/chat` — streams `/v1/chat/completions` back as text
- `.data/connection.json` — the one connection, AES-256-GCM under `CONNECTION_SECRET` (test only)
