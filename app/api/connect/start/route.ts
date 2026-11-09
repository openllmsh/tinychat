import { NextResponse } from "next/server";
import { startConnect } from "@/lib/openllm-connect";
import { OAUTH_COOKIE, openllm } from "@/lib/openllm";

export async function GET(): Promise<Response> {
  const config = openllm();
  const { url, state, codeVerifier } = await startConnect(config);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.redirectUri.startsWith("https:"),
    maxAge: 600,
    path: "/",
  });
  return res;
}
