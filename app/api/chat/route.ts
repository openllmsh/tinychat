import { OpenLLMError, openllmFetch } from "@/lib/openllm-connect";
import { openllm } from "@/lib/openllm";
import { clearConnection, loadConnection, saveConnection } from "@/lib/store";

type TBody = { model: string; messages: { role: "user" | "assistant"; content: string }[] };

const fail = (status: number, code: string, message: string): Response =>
  Response.json({ error: { code, message } }, { status });

/** Proxies one chat turn to OpenLLM and streams back plain text deltas. */
export async function POST(req: Request): Promise<Response> {
  const conn = await loadConnection();
  if (!conn) return fail(401, "not_connected", "Connect with OpenLLM first");
  const { model, messages } = (await req.json()) as TBody;

  let upstream: Response;
  try {
    upstream = await openllmFetch(
      openllm(),
      conn,
      "/v1/chat/completions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
      },
      saveConnection,
    );
  } catch (err) {
    if (err instanceof OpenLLMError) {
      if (err.code === "connector_reconnect" || err.code === "connector_auth") await clearConnection();
      return fail(err.status, err.code, err.message);
    }
    return fail(500, "chat_failed", String(err));
  }

  if (!upstream.ok || !upstream.body) {
    const body = (await upstream.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    const code = body.error?.code ?? "openllm_error";
    if (code === "connector_reconnect" || code === "connector_auth") await clearConnection();
    return fail(upstream.status, code, body.error?.message ?? `OpenLLM answered ${upstream.status}`);
  }

  // SSE `data: {...choices[0].delta.content}` → raw text.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const text = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.trim().replace(/^data:\s*/, "");
          if (!line.startsWith("data:") || data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (typeof delta === "string") controller.enqueue(encoder.encode(delta));
          } catch {}
        }
      },
    }),
  );
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
