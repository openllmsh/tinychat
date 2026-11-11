// Everything OpenLLM-specific in this app. Two ways to chat:
//
//   API key   The visitor pastes an OpenLLM key (sk-llm-…) in the UI. It is
//             kept in an httpOnly cookie and used with `@openllmsh/sdk/client`.
//   Connect   "Connect with OpenLLM" (OAuth): the visitor approves this app on
//             their own account. `@openllmsh/sdk/connect` does the OAuth, key
//             pickup, token refresh and the routes. Optional: on only when the
//             app's OPENLLM_* block is in .env.local.
//
// Both give the page and the chat route the same `TChatUser`.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { createClient } from "@openllmsh/sdk/client";
import {
  chatTextStream,
  connectRoutes,
  createConnect,
  encryptedConnectionStore,
  errorFromResponse,
} from "@openllmsh/sdk/connect";
import type { TChatParams, TModelInfo, TStringStore } from "@openllmsh/sdk/connect";

export const API_ORIGIN = process.env.OPENLLM_API_ORIGIN || "https://www.openllm.sh";

/** Who the page is chatting as, whichever way they came in. */
export type TChatUser = {
  readonly via: "apiKey" | "connect";
  readonly label: string;
  readonly models: () => Promise<readonly TModelInfo[]>;
  readonly stream: (params: TChatParams, signal: AbortSignal) => Promise<ReadableStream<string>>;
};

// ── API key ─────────────────────────────────────────────────────────────────
export const KEY_COOKIE = "tinychat_key";

/** A `TChatUser` on one OpenLLM API key, via `@openllmsh/sdk/client`. */
export const apiKeyUser = (apiKey: string): TChatUser => {
  const client = createClient({ origin: API_ORIGIN, apiKey, transport: { fetch, websocket: WebSocket } });
  return {
    via: "apiKey",
    label: `API key ${apiKey.slice(0, 10)}…`,
    models: async () => {
      const res = await client.http.request("/v1/models");
      if (!res.ok) throw await errorFromResponse(res);
      return ((await res.json()) as { data: TModelInfo[] }).data;
    },
    stream: async (params, signal) => {
      const res = await client.chat.completions.create({ ...params, stream: true }, { signal });
      if (!res.ok || !res.body) throw await errorFromResponse(res);
      return chatTextStream(res.body);
    },
  };
};

// ── Connect (optional) ──────────────────────────────────────────────────────
// A demo keeps one local user's connection in a file. A real app uses a DB
// column keyed by its own user id; the store encrypts the value either way.
const DIR = path.join(process.cwd(), ".data");
const fileFor = (key: string): string => path.join(DIR, `${encodeURIComponent(key)}.connection`);

const files: TStringStore = {
  get: async (key) => readFile(fileFor(key), "utf8").catch(() => null),
  set: async (key, value) => {
    await mkdir(DIR, { recursive: true });
    await writeFile(fileFor(key), value, { mode: 0o600 });
  },
  delete: (key) => rm(fileFor(key), { force: true }),
};

/** The one local user. A real app returns its signed-in user id here. */
const LOCAL_USER = "local";

const CONNECT_ENV = ["OPENLLM_CLIENT_ID", "OPENLLM_CLIENT_SECRET", "OPENLLM_PRIVATE_KEY", "OPENLLM_ISSUER", "CONNECTION_SECRET"];

/** `null` until the app's Connect block is filled in. */
export const connect = CONNECT_ENV.every((name) => process.env[name])
  ? createConnect({ store: encryptedConnectionStore(files, process.env.CONNECTION_SECRET ?? "") })
  : null;

export const routes = connect ? connectRoutes(connect, { userKey: () => LOCAL_USER }) : null;

// ── Both ────────────────────────────────────────────────────────────────────
/** The current chat user: a Connect connection first, then a pasted key. */
export const currentUser = async (): Promise<TChatUser | null> => {
  const user = connect ? await connect.user(LOCAL_USER) : null;
  if (user)
    return {
      via: "connect",
      label: user.userId,
      models: user.models,
      stream: (params, signal) => user.chat.stream(params, { signal }),
    };
  const key = (await cookies()).get(KEY_COOKIE)?.value;
  return key ? apiKeyUser(key) : null;
};
