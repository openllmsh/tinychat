import { connection } from "next/server";
import { routes } from "@/lib/openllm";

export const GET = async (req: Request): Promise<Response> => {
  await connection();
  return routes.callback(req);
};
