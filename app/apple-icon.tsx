import type { ImageResponse } from "next/og";
import { iconImage } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS rounds the corners itself, so the tile is full-bleed. */
export default function AppleIcon(): ImageResponse {
  return iconImage(180, "full-bleed");
}
