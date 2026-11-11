// The OpenLLM mark and wordmark.
import { ICON_PATH, ICON_VIEWBOX, WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The full "OpenLLM" wordmark, in `currentColor`. */
export const Logo = ({ className }: { className?: string }): React.ReactElement => (
  <svg aria-label="OpenLLM" role="img" viewBox={WORDMARK_VIEWBOX} className={cn("h-6 w-auto", className)}>
    <path d={WORDMARK_PATH} fill="currentColor" />
  </svg>
);

/** The mark alone. */
export const LogoMark = ({ className }: { className?: string }): React.ReactElement => (
  <svg aria-hidden viewBox={ICON_VIEWBOX} className={cn("size-5", className)}>
    <path d={ICON_PATH} fill="currentColor" />
  </svg>
);
