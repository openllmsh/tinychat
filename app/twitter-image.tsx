import type { ImageResponse } from "next/og";
import { OG_SIZE, ogImage } from "@/lib/brand-image";

export const alt = "tinychat: chat with your own AI, built on @openllmsh/sdk";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image(): Promise<ImageResponse> {
  return ogImage();
}
