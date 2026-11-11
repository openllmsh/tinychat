import { connection } from "next/server";
import { routes } from "@/lib/openllm";

/** Connect mode only; 404 when the app runs on an API key. */
export const GET = async (req: Request): Promise<Response> => {
  await connection();
  return routes ? routes.start(req) : new Response("Not found", { status: 404 });
};
