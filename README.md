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
  <a href="https://github.com/openllmsh/tinychat/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

---

A small Next.js chat built on `@openllmsh/sdk`, styled like OpenLLM. Open it,
pick a way in, and chat with every model on an OpenLLM account:

| Way in | What you do | SDK |
| --- | --- | --- |
| **API key** (quickest) | Get a key at [openllm.sh/keys](https://www.openllm.sh/keys) and paste it in the app. | `@openllmsh/sdk/client` |
| **Connect with OpenLLM** (optional) | Click the button and approve. Each visitor uses **their own** OpenLLM account; the app holds no provider key and pays for no tokens. | `@openllmsh/sdk/connect` |

All the OpenLLM code is in one file, [`lib/openllm.ts`](./lib/openllm.ts).

## Run it

```sh
bun install
bun dev        # http://localhost:3005
```

Paste your API key on the start page. That's it: no config needed.

The pasted key is checked against OpenLLM, then kept in an httpOnly cookie on
the app's server, so the page's JavaScript never sees it.

**To turn on Connect:** the first `bun dev` creates `.env.local` from
`.env.example`. Create an app in OpenLLM → **Settings → Developers → Apps**,
add `http://localhost:3005/callback` as a callback URL, paste the app's `.env`
block into `.env.local`, set `CONNECTION_SECRET=$(openssl rand -base64 32)`,
and restart. The Connect card turns into a button.

## How the SDK is used

Both ways in give the page and the chat route the same small user object
(`currentUser()` in `lib/openllm.ts`): a label, `models()` and `stream()`.

### API key — `@openllmsh/sdk/client`

```ts
import { createClient } from "@openllmsh/sdk/client";
import { chatTextStream } from "@openllmsh/sdk/connect";

const client = createClient({
  origin: "https://www.openllm.sh",
  apiKey, // pasted in the UI, read from an httpOnly cookie
  transport: { fetch, websocket: WebSocket },
});

const res = await client.chat.completions.create({ model, messages, stream: true });
const text = chatTextStream(res.body);              // SSE → text deltas
const models = await client.http.request("/v1/models");
```

[`app/api/key`](./app/api/key/route.ts) checks a pasted key with one
`/v1/models` call before saving it. [`app/api/chat`](./app/api/chat/route.ts)
sends `text` back with `encodeTextStream`, for both ways in.

### Connect with OpenLLM — `@openllmsh/sdk/connect`

```ts
import { connectRoutes, createConnect, encryptedConnectionStore } from "@openllmsh/sdk/connect";

const connect = createConnect({
  store: encryptedConnectionStore(files, process.env.CONNECTION_SECRET),
});
const routes = connectRoutes(connect, { userKey: () => LOCAL_USER });

const user = await connect.user(LOCAL_USER);   // null until connected
await user.models();
await user.chat.stream({ model, messages });
```

`createConnect` reads the `OPENLLM_*` env vars. You give it two things:

- **where to keep each user's connection**: any `get` / `set` / `delete`
  string store. `encryptedConnectionStore` encrypts it (AES-256-GCM) first.
  This demo uses files in `.data/`; a real app uses a database column.
- **who the current user is**: `userKey`. This demo has one local user; a
  real app returns its signed-in user id.

The SDK does the OAuth, key pickup and token refresh. Each route file is one
line (they answer 404 until Connect is set up):

| Route | SDK handler | What it does |
| --- | --- | --- |
| [`app/api/connect/start`](./app/api/connect/start/route.ts) | `routes.start` | Sends the user to OpenLLM consent. |
| [`app/callback`](./app/callback/route.ts) | `routes.callback` | Picks up the user's key and saves the connection. |
| [`app/api/disconnect`](./app/api/disconnect/route.ts) | `routes.disconnect` | Revokes the connection (or forgets a pasted key). |

In [`app/page.tsx`](./app/page.tsx), `connectButtonUrl(connect.config)` gives
the official button image, and `isOpenLLMError(err) && err.needsReconnect`
tells you the user revoked access, so the page shows the button again.

### The chat UI

[`components/chat.tsx`](./components/chat.tsx) is plain React. It posts to
`/api/chat` and reads the text stream. `MODEL_ALIASES` from
`@openllmsh/sdk/connect/chat` fills the model picker. Everything else in the
repo is UI.

## Stack

- [`@openllmsh/sdk`](https://www.npmjs.com/package/@openllmsh/sdk) (`/client`, `/connect`)
- Next.js 16 App Router, React 19
- shadcn/ui + Tailwind CSS 4

[OpenLLM](https://www.openllm.sh) routes your API keys, local vendors and
local models through one endpoint. See the
[documentation](https://docs.openllm.sh) and the
[SDK README](https://github.com/openllmsh/sdk#readme).

## License

**MIT** © OpenLLM, INC. See [`LICENSE`](./LICENSE).
