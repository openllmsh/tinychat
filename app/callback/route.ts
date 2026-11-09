import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { finishConnect, OpenLLMError, reconnectTokens } from "@/lib/openllm-connect";
import { OAUTH_COOKIE, openllm } from "@/lib/openllm";
import { loadConnection, saveConnection } from "@/lib/store";

export async function GET(req: NextRequest): Promise<Response> {
  const home = (error?: string): NextResponse => {
    const to = new URL("/", req.url);
    if (error) to.searchParams.set("error", error);
    const res = NextResponse.redirect(to);
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  };

  const params = req.nextUrl.searchParams;
  const denied = params.get("error");
  if (denied) return home(denied);

  let kept: { state: string; codeVerifier: string } | null = null;
  try {
    kept = JSON.parse(req.cookies.get(OAUTH_COOKIE)?.value ?? "null");
  } catch {}
  const code = params.get("code");
  if (!kept || !code || params.get("state") !== kept.state) return home("state_mismatch");

  try {
    await saveConnection(await finishConnect(openllm(), { code, codeVerifier: kept.codeVerifier }));
  } catch (err) {
    // Connected before: the key can be collected only once, keep the stored one.
    const stored = await loadConnection();
    const next = stored && reconnectTokens(stored, err);
    if (!next) return home(err instanceof OpenLLMError ? err.code : "connect_failed");
    await saveConnection(next);
  }
  return home();
}
