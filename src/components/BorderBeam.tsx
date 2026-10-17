import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// A light that travels around a card's border (MagicUI "Border Beam", pure CSS - see .border-beam
// in index.css). Place inside a `relative` element with rounded corners; it inherits the radius.
// Hidden for visitors who prefer reduced motion and on browsers without offset-path shapes.

type BorderBeamProps = {
  /** Seconds per lap. */
  duration?: number;
  /** Length of the beam in px. */
  size?: number;
  /** Must match the card's corner radius so the beam hugs the corners. */
  radius?: string;
  delay?: number;
  className?: string;
};

export const BorderBeam = ({ duration = 10, size = 140, radius = "1.5rem", delay = 0, className }: BorderBeamProps) => (
  <div
    aria-hidden="true"
    className={cn("border-beam", className)}
    style={
      {
        "--beam-duration": `${duration}s`,
        "--beam-size": `${size}px`,
        "--beam-radius": radius,
        "--beam-delay": `${delay}s`,
      } as CSSProperties
    }
  />
);
