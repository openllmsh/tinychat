import { cookies } from "next/headers";
import { connection } from "next/server";
import { currentUser, KEY_COOKIE, routes } from "@/lib/openllm";

/** Sign out: revoke the Connect connection, or forget the pasted key. */
export const POST = async (req: Request): Promise<Response> => {
  await connection();
  const user = await currentUser();
  if (user?.via === "connect" && routes) return routes.disconnect(req);
  (await cookies()).delete(KEY_COOKIE);
  return Response.json({ ok: true });
};
