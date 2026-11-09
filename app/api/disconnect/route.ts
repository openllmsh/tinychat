import { disconnect } from "@/lib/openllm-connect";
import { openllm } from "@/lib/openllm";
import { clearConnection, loadConnection } from "@/lib/store";

export async function POST(): Promise<Response> {
  const conn = await loadConnection();
  if (conn) await disconnect(openllm(), conn).catch(() => undefined);
  await clearConnection();
  return Response.json({ ok: true });
}
