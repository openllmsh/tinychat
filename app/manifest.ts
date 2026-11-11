import type { MetadataRoute } from "next";
import { SITE } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.title,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#010101",
    theme_color: "#010101",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icons/192", type: "image/png", sizes: "192x192" },
      { src: "/icons/512", type: "image/png", sizes: "512x512" },
    ],
  };
}
