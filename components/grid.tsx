// OpenLLM's board vocabulary: tiles divided by 1px seams, screw heads in the
// corners (openllm/components/grid-container.tsx, illustrations/screw.tsx).
import { cn } from "@/lib/utils";

/** A screw head: a ringed well with the slot cut at 45°. */
const Screw = ({ className }: { className: string }): React.ReactElement => (
  <span
    aria-hidden
    className={cn(
      "group absolute grid size-2.5 place-items-center rounded-full ring-1 ring-[var(--border-illustration)]",
      className,
    )}
  >
    <span className="h-px w-1.5 rotate-45 bg-[var(--border-illustration)] transition-transform group-hover:rotate-90" />
  </span>
);

/** A tile. `screws` mounts it board-style. */
export const Tile = ({
  className,
  screws = false,
  children,
}: {
  className?: string;
  screws?: boolean;
  children?: React.ReactNode;
}): React.ReactElement => (
  <div className={cn("relative bg-[var(--grid-tile)]", className)}>
    {screws && (
      <>
        <Screw className="top-2 left-2" />
        <Screw className="top-2 right-2" />
        <Screw className="bottom-2 left-2" />
        <Screw className="right-2 bottom-2" />
      </>
    )}
    {children}
  </div>
);

/** The seam colour shows through the gaps between tiles. */
export const Board = ({ className, children }: { className?: string; children: React.ReactNode }): React.ReactElement => (
  <div className={cn("grid gap-[var(--grid-gap)] bg-[var(--grid-seam)]", className)}>{children}</div>
);
