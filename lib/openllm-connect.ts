/**
 * openllm-connect.ts — "Connect with OpenLLM" for your app, in one file.
 *
 * Your users sign in with OpenLLM and run AI on their own account: their
 * subscriptions, their devices, their keys. You never pay for their inference
 * and never see their provider keys. Full guide: https://docs.openllm.sh/connect
 *
 * Copy this file into your server code (it must never run in a browser: it
 * holds your client secret and private key). No dependencies — it needs only
 * `fetch` and WebCrypto with X25519 (Node 20+, Bun, Deno, Cloudflare Workers,
 * Vercel Functions).
 *
 *   const openllm = openllmConfigFromEnv();
 *
 *   // 1. Your "Connect with OpenLLM" button links to a route that does:
 *   const { url, state, codeVerifier } = await startConnect(openllm);
 *   //    save { state, codeVerifier } in a short-lived httpOnly cookie,
 *   //    then redirect the browser to `url`.
 *
 *   // 2. Your callback route (OPENLLM_REDIRECT_URI) does:
 *   //    check `state` matches the cookie, then
 *   const connection = await finishConnect(openllm, { code, codeVerifier });
 *   //    store `connection` for your user (server-side, encrypted at rest).
 *
 *   // 3. Call OpenLLM (OpenAI-compatible) as that user:
 *   const res = await openllmFetch(openllm, connection, "/v1/chat/completions", {
 *     method: "POST",
 *     headers: { "content-type": "application/json" },
 *     body: JSON.stringify({ model: "plus", messages: [{ role: "user", content: "Hi" }] }),
 *   }, (next) => saveConnection(user, next)); // called when tokens refresh
 *
 * Licence: MIT. Use it, change it, ship it.
 */

/** What your app needs, from the .env block OpenLLM showed you once. */
export type OpenLLMConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  /** Your app's X25519 private key: base64 PKCS#8 (`OPENLLM_PRIVATE_KEY`). */
  readonly privateKey: string;
  /** The OAuth issuer; authorize, token and revoke live under it. */
  readonly issuer: string;
  /** Always sent as `resource`, or the access token comes back opaque. */
  readonly resource: string;
  /** OpenLLM's origin: key pickup and the `/v1` API live here. */
  readonly apiOrigin: string;
  /** Exactly one of the callback URLs you registered. */
  readonly redirectUri: string;
};

/** One user's connection. Store it per user; it is a credential. */
export type OpenLLMConnection = {
  /** The OpenLLM user id (the token's `sub`). Key your storage on it. */
  readonly userId: string;
  /** The connection's own `sk-llm-…` key, sent as `X-OpenLLM-Key`. */
  readonly apiKey: string;
  readonly accessToken: string;
  readonly refreshToken: string | null;
  /** Unix ms when `accessToken` expires (tokens live about an hour). */
  readonly expiresAt: number;
};

/** OpenLLM said no; `code` says why (see the guide's error table). */
export class OpenLLMError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OpenLLMError";
    this.status = status;
    this.code = code;
  }
  /**
   * Send them through connect again. The user revoked access or reset their
   * vault, or (`invalid_grant`) the refresh token stopped working: keep the
   * stored connection for that one, `reconnectTokens` needs it.
   */
  get needsReconnect(): boolean {
    return (
      this.code === "connector_reconnect" ||
      this.code === "connector_auth" ||
      this.code === "invalid_grant"
    );
  }
}

type TEnv = Readonly<Record<string, string | undefined>>;

/** Read the config from the variables in the .env block. */
export const openllmConfigFromEnv = (
  env: TEnv = (globalThis as { process?: { env: TEnv } }).process?.env ?? {},
): OpenLLMConfig => {
  const need = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name} is not set`);
    return value;
  };
  return {
    clientId: need("OPENLLM_CLIENT_ID"),
    clientSecret: need("OPENLLM_CLIENT_SECRET"),
    privateKey: need("OPENLLM_PRIVATE_KEY"),
    issuer: need("OPENLLM_ISSUER").replace(/\/+$/, ""),
    resource: env.OPENLLM_RESOURCE?.trim() || "https://openllm.sh/v1",
    apiOrigin: need("OPENLLM_API_ORIGIN").replace(/\/+$/, ""),
    redirectUri: need("OPENLLM_REDIRECT_URI"),
  };
};

// ── encoding helpers ───────────────────────────────────────────────────────

const b64 = (bytes: Uint8Array): string => {
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s);
};
/** Copied into a fresh ArrayBuffer: a `BufferSource` on every TS version. */
const buf = (bytes: Uint8Array): ArrayBuffer => {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
};
const unb64 = (value: string): ArrayBuffer =>
  buf(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
const b64url = (bytes: Uint8Array): string =>
  b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomToken = (bytes = 32): string =>
  b64url(crypto.getRandomValues(new Uint8Array(bytes)));
const utf8 = (value: string): ArrayBuffer =>
  buf(new TextEncoder().encode(value));

const jwtSub = (token: string): string => {
  const part = token.split(".")[1];
  if (part === undefined)
    throw new OpenLLMError(
      401,
      "connector_opaque_token",
      "The access token is not a JWT: send `resource` on authorize and token",
    );
  const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
  const sub = (JSON.parse(json) as { sub?: unknown }).sub;
  if (typeof sub !== "string") throw new Error("access token has no sub");
  return sub;
};

// ── 1. start ───────────────────────────────────────────────────────────────

/**
 * Where to send the user, plus the `state` and `codeVerifier` to keep (in an
 * httpOnly cookie) until the callback. PKCE S256; `prompt=consent` so OpenLLM
 * shows its consent screen, which is where the user's key is made for you.
 */
export const startConnect = async (
  config: OpenLLMConfig,
): Promise<{ url: string; state: string; codeVerifier: string }> => {
  const codeVerifier = randomToken(48);
  const challenge = b64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(codeVerifier))),
  );
  const state = randomToken(24);
  const url = new URL(`${config.issuer}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid offline_access",
    resource: config.resource,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    prompt: "consent",
  }).toString();
  return { url: url.toString(), state, codeVerifier };
};

// ── 2. finish ──────────────────────────────────────────────────────────────

type TTokens = {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: number;
};

const tokenRequest = async (
  config: OpenLLMConfig,
  params: Record<string, string>,
): Promise<TTokens> => {
  const res = await fetch(`${config.issuer}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${btoa(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`)}`,
    },
    body: new URLSearchParams({ ...params, resource: config.resource }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || typeof body.access_token !== "string")
    throw new OpenLLMError(
      res.status,
      body.error ?? "token_error",
      body.error_description ?? `token endpoint answered ${res.status}`,
    );
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
};

const apiError = async (res: Response): Promise<OpenLLMError> => {
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  return new OpenLLMError(
    res.status,
    body.error?.code ?? "openllm_error",
    body.error?.message ?? `OpenLLM answered ${res.status}`,
  );
};

const SEAL_DOMAIN = "openllm-connector-seal-v1";

/**
 * Open the sealed key OpenLLM made for this connection. X25519 with your
 * private key → HKDF-SHA256 (empty salt, info = JSON of [domain, epk, your
 * public key]) → AES-256-GCM, AAD = JSON of [domain, client_id, user_id,
 * grant_id]. Exported for testing against the published vectors.
 */
export const openSealedKey = async (input: {
  readonly privateKeyPkcs8B64: string;
  readonly sealed: { v: 1; epk: string; nonce: string; ct: string };
  readonly clientId: string;
  readonly userId: string;
  readonly grantId: string;
}): Promise<string> => {
  if (input.sealed.v !== 1) throw new Error("unknown sealed key version");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    unb64(input.privateKeyPkcs8B64),
    { name: "X25519" },
    true,
    ["deriveBits"],
  );
  // Your public key, as OpenLLM holds it (base64 SPKI), is part of the info.
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x },
    { name: "X25519" },
    true,
    [],
  );
  const recipient = b64(
    new Uint8Array(await crypto.subtle.exportKey("spki", publicKey)),
  );
  const peer = await crypto.subtle.importKey(
    "spki",
    unb64(input.sealed.epk),
    { name: "X25519" },
    false,
    [],
  );
  const shared = await crypto.subtle.deriveBits(
    { name: "X25519", public: peer },
    privateKey,
    256,
  );
  const hkdf = await crypto.subtle.importKey("raw", shared, "HKDF", false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new ArrayBuffer(0),
      info: utf8(JSON.stringify([SEAL_DOMAIN, input.sealed.epk, recipient])),
    },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: unb64(input.sealed.nonce),
      additionalData: utf8(
        JSON.stringify([
          SEAL_DOMAIN,
          input.clientId,
          input.userId,
          input.grantId,
        ]),
      ),
    },
    key,
    unb64(input.sealed.ct),
  );
  return new TextDecoder().decode(plain);
};

/**
 * Exchange the callback's `code`, collect the connection's key (once) and
 * open it. A user who was already connected gets no new key: this throws an
 * `OpenLLMError` with `code: "already_picked_up"` — pass it to
 * `reconnectTokens` with the connection you stored to keep their key and take
 * the fresh tokens.
 */
export const finishConnect = async (
  config: OpenLLMConfig,
  input: { readonly code: string; readonly codeVerifier: string },
): Promise<OpenLLMConnection> => {
  const tokens = await tokenRequest(config, {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: config.redirectUri,
    code_verifier: input.codeVerifier,
  });
  const userId = jwtSub(tokens.accessToken);
  const res = await fetch(`${config.apiOrigin}/api/connect/grants/pickup`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${tokens.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ code_verifier: input.codeVerifier }),
  });
  if (!res.ok) {
    const err = await apiError(res);
    if (err.code === "already_picked_up")
      // Not enumerable: apps log errors, and live tokens must not go with them.
      throw Object.defineProperties(err, {
        tokens: { value: tokens, enumerable: false },
        userId: { value: userId, enumerable: false },
      });
    throw err;
  }
  const picked = (await res.json()) as { sealed: string; grant_id: string };
  const apiKey = await openSealedKey({
    privateKeyPkcs8B64: config.privateKey,
    sealed: JSON.parse(picked.sealed),
    clientId: config.clientId,
    userId,
    grantId: picked.grant_id,
  });
  return { userId, apiKey, ...tokens };
};

/**
 * A user who was already connected signed in again (`finishConnect` threw
 * `already_picked_up`): keep their stored key, take the new tokens.
 */
export const reconnectTokens = (
  stored: OpenLLMConnection,
  err: unknown,
): OpenLLMConnection | null => {
  const e = err as { code?: string; tokens?: TTokens; userId?: string };
  if (e.code !== "already_picked_up" || e.tokens === undefined) return null;
  if (e.userId !== stored.userId) return null;
  return { ...stored, ...e.tokens };
};

// ── 3. use ─────────────────────────────────────────────────────────────────

/** A fresh access token, refreshed a minute before it expires. */
export const refreshConnection = async (
  config: OpenLLMConfig,
  connection: OpenLLMConnection,
): Promise<OpenLLMConnection> => {
  if (connection.expiresAt - Date.now() > 60_000) return connection;
  if (connection.refreshToken === null)
    throw new OpenLLMError(
      401,
      "connector_reconnect",
      "The access token expired and there is no refresh token: connect again",
    );
  const tokens = await tokenRequest(config, {
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
  });
  return {
    ...connection,
    ...tokens,
    refreshToken: tokens.refreshToken ?? connection.refreshToken,
  };
};

/**
 * `fetch` against OpenLLM as this user, with both headers it needs. Refreshes
 * the token first when it is about to expire and hands you the new
 * connection to store (`onRefresh`). Paths: `/v1/chat/completions`,
 * `/v1/messages`, `/v1/responses`, `/v1/models`, `/v1/embeddings`, …
 */
export const openllmFetch = async (
  config: OpenLLMConfig,
  connection: OpenLLMConnection,
  path: string,
  init: RequestInit = {},
  onRefresh?: (next: OpenLLMConnection) => void | Promise<void>,
): Promise<Response> => {
  const fresh = await refreshConnection(config, connection);
  if (fresh !== connection) await onRefresh?.(fresh);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${fresh.accessToken}`);
  headers.set("x-openllm-key", fresh.apiKey);
  return fetch(`${config.apiOrigin}${path}`, { ...init, headers });
};

/** Disconnect this user from your side: their key stops working at once. */
export const disconnect = async (
  config: OpenLLMConfig,
  connection: OpenLLMConnection,
): Promise<void> => {
  const res = await openllmFetch(
    config,
    connection,
    "/api/connect/grants/revoke",
    {
      method: "POST",
    },
  );
  if (!res.ok && res.status !== 404) throw await apiError(res);
};
