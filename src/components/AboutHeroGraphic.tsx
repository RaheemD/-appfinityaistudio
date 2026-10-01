import { useId, type ComponentType, type SVGProps } from "react";
import { Cpu, Globe, Smartphone, Zap, Palette, Lightbulb } from "lucide-react";

// Brand illustration for the About page: the Appfinity hexagon/infinity mark at the core,
// connected to our six services. Drawn with the site's theme tokens (hsl(var(--...))), so it
// follows light/dark mode automatically. Animations respect prefers-reduced-motion.

type Node = { x: number; y: number; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; labelAbove?: boolean };

const CX = 300;
const CY = 225;
const NODE = 56;

const NODES: Node[] = [
  { x: 300, y: 72, label: "AI Apps", icon: Cpu, labelAbove: true },
  { x: 474, y: 150, label: "Web & SaaS", icon: Globe },
  { x: 474, y: 300, label: "Mobile", icon: Smartphone },
  { x: 300, y: 378, label: "Automation", icon: Zap },
  { x: 126, y: 300, label: "UI/UX Design", icon: Palette },
  { x: 126, y: 150, label: "Custom Solutions", icon: Lightbulb },
];

const STARS = [
  [60, 60], [540, 50], [565, 400], [40, 405], [200, 30], [420, 425], [575, 225], [25, 225],
];

const color = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(var(--${token}))` : `hsl(var(--${token}) / ${alpha})`;

export const AboutHeroGraphic = ({ className }: { className?: string }) => {
  const id = useId().replace(/:/g, "");
  const gradient = `${id}-brand`;
  // Lines need user-space coordinates: a bounding-box gradient doesn't render on a perfectly vertical line.
  const lineGradient = `${id}-line`;
  const glow = `${id}-glow`;

  return (
    <svg
      viewBox="0 0 600 450"
      className={className}
      role="img"
      aria-label="Appfinity AI Studio connects AI apps, web and SaaS, mobile, automation, UI/UX design and custom solutions"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: color("primary") }} />
          <stop offset="100%" style={{ stopColor: color("accent") }} />
        </linearGradient>
        <linearGradient id={lineGradient} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="600" y2="450">
          <stop offset="0%" style={{ stopColor: color("primary") }} />
          <stop offset="100%" style={{ stopColor: color("accent") }} />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0%" style={{ stopColor: color("primary"), stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: color("primary"), stopOpacity: 0 }} />
        </radialGradient>
        <style>{`
          .${id}-flow { stroke-dasharray: 5 9; animation: ${id}-flow 2.6s linear infinite; }
          .${id}-pulse { transform-box: fill-box; transform-origin: center; animation: ${id}-pulse 3.2s ease-in-out infinite; }
          .${id}-orbit { transform-origin: ${CX}px ${CY}px; animation: ${id}-spin 90s linear infinite; }
          @keyframes ${id}-flow { to { stroke-dashoffset: -28; } }
          @keyframes ${id}-pulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
          @keyframes ${id}-spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) {
            .${id}-flow, .${id}-pulse, .${id}-orbit { animation: none; }
          }
        `}</style>
      </defs>

      {/* Ambient glow and stars */}
      <circle cx={CX} cy={CY} r="190" fill={`url(#${glow})`} />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.5 : 1.6} style={{ fill: color("primary", 0.35) }} />
      ))}

      {/* Orbits */}
      <ellipse cx={CX} cy={CY} rx="250" ry="195" fill="none" style={{ stroke: color("border") }} strokeWidth="1" />
      <ellipse
        className={`${id}-orbit`}
        cx={CX}
        cy={CY}
        rx="200"
        ry="150"
        fill="none"
        style={{ stroke: color("primary", 0.3) }}
        strokeWidth="1.5"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />

      {/* Connections from the core to each service */}
      {NODES.map((node) => (
        <g key={`link-${node.label}`}>
          <line x1={CX} y1={CY} x2={node.x} y2={node.y} style={{ stroke: color("primary", 0.18) }} strokeWidth="2" />
          <line
            className={`${id}-flow`}
            x1={CX}
            y1={CY}
            x2={node.x}
            y2={node.y}
            stroke={`url(#${lineGradient})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Core: Appfinity mark */}
      <circle cx={CX} cy={CY} r="92" style={{ fill: color("card"), stroke: color("primary", 0.25) }} strokeWidth="1.5" />
      <circle className={`${id}-pulse`} cx={CX} cy={CY} r="104" fill="none" style={{ stroke: color("primary", 0.35) }} strokeWidth="1.5" />
      <g transform={`translate(${CX} ${CY}) scale(0.72) translate(-100 -100)`}>
        <path
          d="M100 20 L170 60 L170 140 L100 180 L30 140 L30 60 Z"
          stroke={`url(#${gradient})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M70 100 C70 85 90 85 100 100 C110 115 130 115 130 100 C130 85 110 85 100 100 C90 115 70 115 70 100 Z"
          stroke={`url(#${gradient})`}
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        {[
          [100, 20],
          [170, 60],
          [170, 140],
          [100, 180],
          [30, 140],
          [30, 60],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="7" style={{ fill: color("accent") }} />
        ))}
      </g>

      {/* Service nodes */}
      {NODES.map(({ x, y, label, icon: Icon, labelAbove }) => (
        <g key={label}>
          <rect
            x={x - NODE / 2}
            y={y - NODE / 2}
            width={NODE}
            height={NODE}
            rx="16"
            style={{
              fill: color("card"),
              stroke: color("border"),
              filter: `drop-shadow(0 6px 14px ${color("primary", 0.18)})`,
            }}
            strokeWidth="1.5"
          />
          <Icon x={x - 13} y={y - 13} width={26} height={26} style={{ color: color("primary") }} strokeWidth={1.8} />
          <text
            x={x}
            y={labelAbove ? y - NODE / 2 - 12 : y + NODE / 2 + 22}
            textAnchor="middle"
            style={{ fill: color("muted-foreground"), fontSize: 17, fontWeight: 600 }}
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
};
