<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openllmsh/sdk/main/assets/openllm-light.svg">
    <img alt="OpenLLM" src="https://raw.githubusercontent.com/openllmsh/sdk/main/assets/openllm.svg" width="300">
  </picture>
</p>

<p align="center"><b>tinychat</b> — a demo chat app built on <a href="https://www.npmjs.com/package/@openllmsh/sdk"><code>@openllmsh/sdk</code></a>.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@openllmsh/sdk"><img alt="@openllmsh/sdk" src="https://img.shields.io/npm/v/@openllmsh/sdk.svg?label=%40openllmsh%2Fsdk"></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js%2016-App%20Router-black.svg">
  <img alt="demo" src="https://img.shields.io/badge/type-demo-blue.svg">
</p>

---

A small Next.js + shadcn chat that runs on **the visitor's own OpenLLM
account**. They click *Connect with OpenLLM*, approve, and chat with their
own models and keys. The app never holds a provider key and pays for no
tokens.

It exists to show how little code **Connect with OpenLLM** takes. Everything
OpenLLM-specific (OAuth, key pickup, token refresh, model list, streaming
chat and the HTTP routes) comes from `@openllmsh/sdk/connect`. The app adds
one file, [`lib/openllm.ts`](./lib/openllm.ts), about 30 lines.

## How the SDK is used

**1. Set it up once** — [`lib/openllm.ts`](./lib/openllm.ts)

```ts
import { connectRoutes, createConnect, encryptedConnectionStore } from "@openllmsh/sdk/connect";

export const connect = createConnect({
  store: encryptedConnectionStore(files, process.env.CONNECTION_SECRET),
});

export const routes = connectRoutes(connect, { userKey: () => LOCAL_USER });
```

`createConnect` reads the `OPENLLM_*` env vars. You give it only two things:

- **where to keep each user's connection** — any `get` / `set` / `delete`
  string store. `encryptedConnectionStore` encrypts it (AES-256-GCM) before
  it reaches the store. This demo uses files in `.data/`; a real app uses a
  database column.
- **who the current user is** — `userKey`. This demo has one local user; a
  real app returns its signed-in user id.

**2. Mount the routes** — each route file is one line:

| Route | SDK handler | What it does |
| --- | --- | --- |
| [`app/api/connect/start`](./app/api/connect/start/route.ts) | `routes.start` | Sends the user to OpenLLM consent. |
| [`app/callback`](./app/callback/route.ts) | `routes.callback` | Picks up the user's key and saves the connection. |
| [`app/api/chat`](./app/api/chat/route.ts) | `routes.chat` | One chat turn, streamed back as text. |
| [`app/api/disconnect`](./app/api/disconnect/route.ts) | `routes.disconnect` | Forgets the connection. |

**3. Use it in the page** — [`app/page.tsx`](./app/page.tsx)

```ts
import { connectButtonUrl, isOpenLLMError } from "@openllmsh/sdk/connect";

const user = await connect.user(LOCAL_USER); // null if not connected
const models = await user?.models();          // the user's own model list
```

`connectButtonUrl(connect.config)` gives the official button image.
`isOpenLLMError(err) && err.needsReconnect` tells you when the user revoked
access, so the page shows the button again.

**4. The chat UI** — [`components/chat.tsx`](./components/chat.tsx) is plain
React. It posts to `/api/chat` and reads the text stream. `MODEL_ALIASES`
from `@openllmsh/sdk/connect/chat` fills the model picker.

That is the whole integration. Everything else in the repo is UI.

## Run it

1. Create an app in OpenLLM → **Settings → Developers → Apps**, and add
   `http://localhost:3005/callback` as a callback URL.
2. Copy the env file and paste the app's `.env` block into it:

   ```sh
   cp .env.example .env.local
   openssl rand -base64 32   # → CONNECTION_SECRET
   ```

3. Start it:

   ```sh
   bun install
   bun dev        # http://localhost:3005
   ```

4. Click **Connect with OpenLLM**, approve, and chat.

## Stack

- [`@openllmsh/sdk`](https://www.npmjs.com/package/@openllmsh/sdk) (`/connect`)
- Next.js 16 App Router, React 19
- shadcn/ui + Tailwind CSS 4

[OpenLLM](https://www.openllm.sh) routes your API keys, local vendors and
local models through one endpoint. See the
[documentation](https://docs.openllm.sh) and the
[SDK README](https://github.com/openllmsh/sdk#readme).
