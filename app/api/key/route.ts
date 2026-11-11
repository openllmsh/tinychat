import { cookies } from "next/headers";
import { connection } from "next/server";
import { isOpenLLMError } from "@openllmsh/sdk/connect";
import { apiKeyUser, KEY_COOKIE } from "@/lib/openllm";

/** Save a pasted API key, after checking it works. */
export const POST = async (req: Request): Promise<Response> => {
  await connection();
  const { key } = ((await req.json().catch(() => ({}))) as { key?: unknown }) ?? {};
  if (typeof key !== "string" || !key.trim().startsWith("sk-llm-"))
    return Response.json({ error: "That doesn't look like an OpenLLM key (sk-llm-…)." }, { status: 400 });
  try {
    await apiKeyUser(key.trim()).models();
  } catch (err) {
    const message = isOpenLLMError(err) ? err.message : "Couldn't reach OpenLLM.";
    return Response.json({ error: `OpenLLM didn't accept that key: ${message}` }, { status: 400 });
  }
  (await cookies()).set(KEY_COOKIE, key.trim(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
};
