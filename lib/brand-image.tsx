// The images that brand tinychat outside the page: the icon tile (favicon
// sizes, Apple touch icon, manifest) and the social card. Same treatments as
// openllm.sh: a white tile with the black mark, and a white card with the
// wordmark over an emerald grid.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, ICON_ASPECT, ICON_PATH, ICON_VIEWBOX, SITE, WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/lib/brand";

/** `rounded` for tabs and bookmarks; `full-bleed` where the host masks it (iOS). */
export const iconImage = (size: number, shape: "rounded" | "full-bleed" = "rounded"): ImageResponse => {
  const mark = Math.round(size * (shape === "rounded" ? 0.6 : 0.58));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND.tile,
        borderRadius: shape === "rounded" ? Math.round(size * 0.22) : 0,
      }}
    >
      <svg width={mark} height={Math.round(mark * ICON_ASPECT)} viewBox={ICON_VIEWBOX} fill="none">
        <path d={ICON_PATH} fill={BRAND.mark} />
      </svg>
    </div>,
    { width: size, height: size },
  );
};

export const OG_SIZE = { width: 1200, height: 630 } as const;

const font = (file: string): Promise<Buffer> => readFile(path.join(process.cwd(), "app/fonts", file));

export const ogImage = async (): Promise<ImageResponse> => {
  const [regular, semibold] = await Promise.all([font("Geist-Regular.ttf"), font("Geist-SemiBold.ttf")]);
  const markHeight = 520;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: BRAND.tile,
        color: BRAND.mark,
        fontFamily: "Geist",
        position: "relative",
      }}
    >
      {/* Backdrop: a faint emerald grid and the mark, right-aligned. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 80,
          backgroundImage: `linear-gradient(${BRAND.accent}0f 1px, transparent 1px), linear-gradient(90deg, ${BRAND.accent}0f 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      >
        <svg width={Math.round(markHeight / ICON_ASPECT)} height={markHeight} viewBox={ICON_VIEWBOX} fill="none">
          <path d={ICON_PATH} fill={`${BRAND.accent}14`} />
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="300" height="66" viewBox={WORDMARK_VIEWBOX} fill="none">
          <path d={WORDMARK_PATH} fill={BRAND.mark} />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: BRAND.accent,
            border: `2px solid ${BRAND.accent}40`,
            borderRadius: 999,
            padding: "6px 18px",
          }}
        >
          {SITE.name}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          Chat with your own AI.
        </div>
        <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: `${BRAND.mark}a6`, maxWidth: 860 }}>
          A tiny chat app built on @openllmsh/sdk. Paste an API key or Connect with OpenLLM.
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
};
