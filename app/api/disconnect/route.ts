import { connection } from "next/server";
import { routes } from "@/lib/openllm";

export const POST = async (req: Request): Promise<Response> => {
  await connection();
  return routes.disconnect(req);
};
