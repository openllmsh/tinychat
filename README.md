# Tiny Chat — Connect with OpenLLM test app

Next.js + shadcn chat that runs on the signed-in user's OpenLLM account.
All the OpenLLM work (OAuth, key pickup, token refresh, chat streaming,
the routes) comes from `@openllmsh/sdk/connect`. This app only supplies
where to store each connection and who its current user is (`lib/openllm.ts`).

1. `cp .env.example .env.local` and paste your app's `.env` block
   (OpenLLM → Settings → Developers → Apps). Register
   `http://localhost:3005/callback` as a callback URL on the app.
2. `bun dev` → http://localhost:3005 → Connect with OpenLLM → chat.

- `app/api/connect/start` → OpenLLM consent → `app/callback` (key pickup)
- `app/api/chat` — one turn, streamed back as text
- `.data/<user>.connection` — the connection, AES-256-GCM under `CONNECTION_SECRET` (test only)
