import { iconImage } from "@/lib/brand-image";

const SIZES = [32, 48, 192, 512] as const;

export const generateStaticParams = (): { size: string }[] => SIZES.map((s) => ({ size: String(s) }));

/** PNG favicon / manifest tiles: /icons/32, /icons/48, /icons/192, /icons/512. */
export const GET = async (_req: Request, ctx: RouteContext<"/icons/[size]">): Promise<Response> => {
  const size = Number((await ctx.params).size);
  if (!SIZES.includes(size as (typeof SIZES)[number])) return new Response("Not found", { status: 404 });
  return iconImage(size);
};
