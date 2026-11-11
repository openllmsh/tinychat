import { connection } from "next/server";
import { encodeTextStream, isOpenLLMError } from "@openllmsh/sdk/connect";
import type { TChatParams } from "@openllmsh/sdk/connect";
import { currentUser } from "@/lib/openllm";

const fail = (status: number, code: string, message: string): Response =>
  Response.json({ error: { code, message } }, { status });

/** One chat turn, streamed back as plain text. Same for both ways in. */
export const POST = async (req: Request): Promise<Response> => {
  await connection();
  const user = await currentUser();
  if (!user) return fail(401, "not_connected", "Add an API key or connect first.");
  const body = (await req.json().catch(() => null)) as TChatParams | null;
  if (!body || typeof body.model !== "string" || !Array.isArray(body.messages))
    return fail(400, "bad_request", "Send { model, messages }");
  try {
    const text = await user.stream(body, req.signal);
    return new Response(encodeTextStream(text), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (err) {
    if (!isOpenLLMError(err)) throw err;
    return fail(err.status, err.code, err.message);
  }
};
