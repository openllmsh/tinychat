import { connection } from "next/server";
import { routes } from "@/lib/openllm";

/** One chat turn, streamed back as plain text. */
export const POST = async (req: Request): Promise<Response> => {
  await connection();
  return routes.chat(req);
};
