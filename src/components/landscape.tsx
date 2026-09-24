import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/*
 * A misty mountain range, drawn from seeded noise so every render is the same
 * picture. Dawn in the light theme, moonlight in the dark one: every colour is
 * a CSS variable (see `.landscape` in globals.css), so the toggle repaints it
 * without a re-render.
 *
 * `panorama` is the landing hero: wide, and its nearest ridge dissolves into
 * the page. `lake` is the tall auth panel, where the range stands over still
 * water that mirrors it.
 */

type Variant = 'panorama' | 'lake';

type Peak = { x: number; h: number; w: number };

type RidgeSpec = {
  seed: number;
  /** Resting height of the ridge line, in viewBox units from the top. */
  base: number;
  /** Size of the fractal detail. */
  amp: number;
  /** 0.4 rolls, 0.6 is jagged. */
  roughness: number;
  peaks?: Peak[];
  /** Rolling hills instead of broken rock: fewer points, joined by curves. */
  smooth?: boolean;
};

type Scene = {
  width: number;
  height: number;
  /** Where the land meets water (lake) or fades into the page (panorama). */
  floor: number;
  sun: { x: number; y: number; r: number };
  ridges: RidgeSpec[];
  mist: { y: number; h: number; x: number; w: number }[];
  /** Long, thin streaks of cloud high in the sky. */
  clouds: { y: number; h: number; x: number; w: number }[];
};

const SCENES: Record<Variant, Scene> = {
  panorama: {
    width: 1600,
    height: 640,
    floor: 640,
    sun: { x: 1010, y: 318, r: 40 },
    ridges: [
      { seed: 11, base: 348, amp: 34, roughness: 0.56, peaks: [{ x: 830, h: 150, w: 190 }, { x: 1180, h: 70, w: 150 }, { x: 330, h: 90, w: 220 }] },
      { seed: 23, base: 392, amp: 30, roughness: 0.54, peaks: [{ x: 540, h: 84, w: 200 }, { x: 1320, h: 76, w: 240 }] },
      { seed: 37, base: 440, amp: 24, roughness: 0.52, peaks: [{ x: 1000, h: 56, w: 260 }, { x: 180, h: 44, w: 200 }] },
      { seed: 41, base: 492, amp: 16, roughness: 0.48, smooth: true, peaks: [{ x: 660, h: 46, w: 300 }, { x: 1460, h: 40, w: 260 }] },
      { seed: 53, base: 544, amp: 12, roughness: 0.45, smooth: true, peaks: [{ x: 1120, h: 38, w: 340 }, { x: 260, h: 30, w: 320 }] },
      { seed: 67, base: 596, amp: 8, roughness: 0.42, smooth: true, peaks: [{ x: 760, h: 26, w: 420 }] },
    ],
    mist: [
      { y: 424, h: 120, x: 420, w: 1300 },
      { y: 476, h: 120, x: 1160, w: 1400 },
      { y: 536, h: 130, x: 640, w: 1700 },
    ],
    clouds: [
      { y: 214, h: 34, x: 1290, w: 560 },
      { y: 250, h: 28, x: 300, w: 480 },
    ],
  },
  lake: {
    width: 800,
    height: 1000,
    floor: 770,
    sun: { x: 520, y: 548, r: 30 },
    ridges: [
      { seed: 5, base: 590, amp: 22, roughness: 0.57, peaks: [{ x: 390, h: 132, w: 110 }, { x: 640, h: 60, w: 90 }, { x: 110, h: 54, w: 110 }] },
      { seed: 17, base: 628, amp: 20, roughness: 0.55, peaks: [{ x: 230, h: 62, w: 130 }, { x: 700, h: 58, w: 120 }] },
      { seed: 29, base: 668, amp: 16, roughness: 0.52, peaks: [{ x: 520, h: 42, w: 150 }] },
      { seed: 31, base: 706, amp: 11, roughness: 0.47, smooth: true, peaks: [{ x: 150, h: 30, w: 170 }, { x: 760, h: 26, w: 140 }] },
      { seed: 43, base: 742, amp: 8, roughness: 0.44, smooth: true, peaks: [{ x: 470, h: 22, w: 220 }] },
    ],
    mist: [
      { y: 652, h: 70, x: 260, w: 760 },
      { y: 702, h: 64, x: 600, w: 820 },
      { y: 750, h: 54, x: 330, w: 900 },
    ],
    clouds: [
      { y: 200, h: 40, x: 210, w: 420 },
      { y: 300, h: 34, x: 650, w: 440 },
      { y: 404, h: 26, x: 150, w: 320 },
    ],
  },
};

/* ------------------------------------------------------------- generation */

function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Midpoint displacement: a crest line that is rough at every scale. */
function crest(rand: () => number, segments: number, amp: number, roughness: number) {
  const ys = new Array<number>(segments + 1).fill(0);
  ys[0] = (rand() * 2 - 1) * amp;
  ys[segments] = (rand() * 2 - 1) * amp;
  let scale = amp;
  for (let step = segments; step > 1; step /= 2) {
    const half = step / 2;
    for (let i = half; i < segments; i += step) {
      ys[i] = (ys[i - half] + ys[i + half]) / 2 + (rand() * 2 - 1) * scale;
    }
    scale *= roughness * 2 * Math.SQRT1_2;
  }
  return ys;
}

/** Ridge outline plus the top of its crest, for the gradient that lights it. */
function ridgePath(spec: RidgeSpec, width: number, floor: number) {
  // Past both edges, so the pointer parallax never uncovers a corner.
  const overscan = 48;
  const segments = spec.smooth ? 32 : 256;
  const rand = random(spec.seed);
  const noise = crest(rand, segments, spec.amp, spec.roughness);

  const points: [number, number][] = noise.map((n, i) => {
    const x = -overscan + ((width + overscan * 2) * i) / segments;
    let lift = 0;
    for (const p of spec.peaks ?? []) {
      // A sharpened bell: broad shoulders, a narrow summit.
      const d = Math.abs(x - p.x) / p.w;
      lift += p.h * Math.exp(-d * d * 1.6) * (1 + 0.35 * Math.exp(-d * 9));
    }
    return [x, Math.min(floor - 4, spec.base - lift + n)];
  });

  const top = Math.min(...points.map(([, y]) => y));
  let d = `M${round(points[0][0])} ${floor}L${round(points[0][0])} ${round(points[0][1])}`;

  if (spec.smooth) {
    // Catmull–Rom through the points, as cubic Béziers.
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`;
    }
  } else {
    // Whole units are finer than a pixel at any size this is drawn.
    for (const [x, y] of points.slice(1)) d += `L${Math.round(x)} ${Math.round(y)}`;
  }

  const last = points[points.length - 1];
  d += `L${round(last[0])} ${floor}Z`;
  return { d, top };
}

/** `from`: the highest a star may sit; they fade in over the band below it. */
function stars(width: number, from: number, to: number) {
  const rand = random(97);
  return Array.from({ length: Math.round(width / 16) }, () => {
    const x = rand() * width;
    // Denser high up, thinning out toward the glow over the ridges.
    const y = from + Math.pow(rand(), 1.6) * (to - from);
    const fade = Math.min(1, (y - from) / 90);
    return {
      x: round(x),
      y: round(y),
      r: round(0.5 + rand() * rand() * 1.5),
      o: round((0.25 + rand() * 0.7) * fade),
      twinkle: rand() < 0.22,
      delay: round(rand() * 6),
    };
  });
}

function ripples({ width, height, floor, sun }: Scene) {
  const rand = random(71);
  const wind = Array.from({ length: 5 }, (_, i) => {
    const t = (i + 0.5) / 5;
    return {
      x: round(rand() * width),
      y: round(floor + 10 + t * t * (height - floor - 20)),
      w: round(90 + rand() * 180 + t * 120),
      h: 1.4 + t,
      sun: false,
      delay: round(-rand() * 8),
    };
  });
  // Short dashes that scatter wider the nearer they are, under the sun.
  const path = Array.from({ length: 16 }, (_, i) => {
    const t = (i + 0.5) / 16;
    return {
      x: round(sun.x + (rand() * 2 - 1) * (8 + t * 70)),
      y: round(floor + 5 + t * t * (height - floor - 30)),
      w: round(14 + rand() * 30 + t * 40),
      h: 1.2 + t * 1.6,
      sun: true,
      delay: round(-rand() * 8),
    };
  });
  return [...wind, ...path];
}

/* ------------------------------------------------------------------ render */

const stop = (color: string, opacity?: number): CSSProperties => ({
  stopColor: color,
  stopOpacity: opacity,
});

/** Depth for the parallax: 0 is the sky, 1 the nearest ridge. */
const depth = (i: number, count: number): CSSProperties =>
  ({ '--depth': round((i + 1) / count), '--i': i }) as CSSProperties;

export function Landscape({ id, variant, className }: { id: string; variant: Variant; className?: string }) {
  const scene = SCENES[variant];
  const { width, height, floor, sun } = scene;
  const ridges = scene.ridges.map((spec) => ridgePath(spec, width, floor));
  const count = ridges.length;
  const lake = variant === 'lake';
  // The hero's text sits over the top of the panorama's sky.
  const sky = stars(width, lake ? 0 : 150, sun.y - 40);
  const ref = (name: string) => `url(#${id}-${name})`;

  const land = (
    <>
      <g className="ls-layer ls-sun" style={depth(-0.6, count)}>
        <circle cx={sun.x} cy={sun.y} r={sun.r * 9} fill={ref('halo')} />
        <circle cx={sun.x} cy={sun.y} r={sun.r} fill={ref('disc')} />
      </g>

      {ridges.map((ridge, i) => (
        <g key={i} className="ls-layer" style={depth(i, count)}>
          <path d={ridge.d} fill={ref(`r${i}`)} />
          {/* Mist pooling in the valley in front of this ridge. */}
          {scene.mist[i - 1] ? (
            <g className="ls-drift" style={{ '--drift': `${56 + i * 14}s` } as CSSProperties}>
              <ellipse
                cx={scene.mist[i - 1].x}
                cy={scene.mist[i - 1].y}
                rx={scene.mist[i - 1].w / 2}
                ry={scene.mist[i - 1].h / 2}
                fill={ref('mist')}
              />
            </g>
          ) : null}
        </g>
      ))}
    </>
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMax slice"
      className={cn('landscape block', lake ? 'landscape-lake' : 'landscape-panorama', className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2={floor} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('var(--ls-sky-1)')} />
          <stop offset="0.5" style={stop('var(--ls-sky-2)')} />
          <stop offset="0.86" style={stop('var(--ls-sky-3)')} />
          <stop offset="1" style={stop('var(--ls-sky-4)')} />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" style={stop('var(--ls-glow)', 0.9)} />
          <stop offset="0.22" style={stop('var(--ls-glow)', 0.38)} />
          <stop offset="0.55" style={stop('var(--ls-glow)', 0.1)} />
          <stop offset="1" style={stop('var(--ls-glow)', 0)} />
        </radialGradient>
        <radialGradient id={`${id}-disc`}>
          <stop offset="0" style={stop('var(--ls-sun-1)')} />
          <stop offset="1" style={stop('var(--ls-sun-2)')} />
        </radialGradient>
        <radialGradient id={`${id}-mist`}>
          <stop offset="0" style={stop('var(--ls-mist)', 0.6)} />
          <stop offset="0.5" style={stop('var(--ls-mist)', 0.25)} />
          <stop offset="1" style={stop('var(--ls-mist)', 0)} />
        </radialGradient>
        <radialGradient id={`${id}-cloud`}>
          <stop offset="0" style={stop('var(--ls-cloud)', 0.9)} />
          <stop offset="0.6" style={stop('var(--ls-cloud)', 0.35)} />
          <stop offset="1" style={stop('var(--ls-cloud)', 0)} />
        </radialGradient>
        {ridges.map((ridge, i) => {
          // Lit at the crest, dissolving into haze further down the slope.
          const fade = Math.min(floor, ridge.top + (lake ? 150 : 210));
          return (
            <linearGradient
              key={i}
              id={`${id}-r${i}`}
              x1="0"
              y1={round(ridge.top)}
              x2="0"
              y2={round(fade)}
              gradientUnits="userSpaceOnUse"
            >
              {i === 0 ? <stop offset="0" style={stop('var(--ls-snow)')} /> : null}
              <stop offset={i === 0 ? 0.16 : 0} style={stop(`var(--ls-r${i}-a)`)} />
              <stop offset="1" style={stop(`var(--ls-r${i}-b)`)} />
            </linearGradient>
          );
        })}
        {/* The panorama's foreground melts into the page below it. */}
        <linearGradient id={`${id}-ground`} x1="0" y1={round(floor * 0.6)} x2="0" y2={floor} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('var(--ls-ground)', 0)} />
          <stop offset="0.5" style={stop('var(--ls-ground)', 0.55)} />
          <stop offset="0.85" style={stop('var(--ls-ground)', 0.94)} />
          <stop offset="1" style={stop('var(--ls-ground)', 1)} />
        </linearGradient>
        {lake ? (
          <>
            <linearGradient id={`${id}-water`} x1="0" y1={floor} x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <stop offset="0" style={stop('var(--ls-water-1)')} />
              <stop offset="1" style={stop('var(--ls-water-2)')} />
            </linearGradient>
            {/* The mirror image fades as the water deepens. */}
            <linearGradient id={`${id}-fade`} x1="0" y1={floor} x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.72" />
              <stop offset="0.6" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={stop('var(--ls-glint)', 0)} />
              <stop offset="0.5" style={stop('var(--ls-glint)', 1)} />
              <stop offset="1" style={stop('var(--ls-glint)', 0)} />
            </linearGradient>
            <linearGradient id={`${id}-glint-sun`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={stop('var(--ls-sun-glint)', 0)} />
              <stop offset="0.5" style={stop('var(--ls-sun-glint)', 1)} />
              <stop offset="1" style={stop('var(--ls-sun-glint)', 0)} />
            </linearGradient>
            <mask id={`${id}-reflect`} maskUnits="userSpaceOnUse" x="0" y={floor} width={width} height={height - floor}>
              <rect x="0" y={floor} width={width} height={height - floor} fill={ref('fade')} />
            </mask>
          </>
        ) : null}
      </defs>

      <rect width={width} height={height} fill={ref('sky')} />

      <g className="ls-stars">
        {sky.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            opacity={s.o}
            className={s.twinkle ? 'ls-twinkle' : undefined}
            style={s.twinkle ? ({ animationDelay: `${s.delay}s` } as CSSProperties) : undefined}
          />
        ))}
      </g>

      <g className="ls-clouds">
        {scene.clouds.map((c, i) => (
          <g key={i} className="ls-drift" style={{ '--drift': `${80 + i * 23}s` } as CSSProperties}>
            {/* A flat base with two soft swells on top. */}
            <ellipse cx={c.x} cy={c.y} rx={c.w / 2} ry={c.h / 2} fill={ref('cloud')} />
            <ellipse cx={c.x - c.w * 0.16} cy={c.y - c.h * 0.32} rx={c.w * 0.26} ry={c.h * 0.62} fill={ref('cloud')} />
            <ellipse cx={c.x + c.w * 0.14} cy={c.y - c.h * 0.22} rx={c.w * 0.2} ry={c.h * 0.5} fill={ref('cloud')} />
          </g>
        ))}
      </g>

      {land}

      {lake ? null : (
        <rect y={round(floor * 0.6)} width={width} height={round(floor * 0.4) + 1} fill={ref('ground')} />
      )}

      {lake ? (
        <>
          <rect x="0" y={floor} width={width} height={height - floor} fill={ref('water')} />
          <g mask={ref('reflect')}>
            <g transform={`translate(0 ${floor * 2}) scale(1 -1)`}>{land}</g>
          </g>
          {/* Wind on the water, and the sun's path of light across it. */}
          <g className="ls-ripples">
            {ripples(scene).map((r, i) => (
              <rect
                key={i}
                x={r.x - r.w / 2}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={r.h / 2}
                fill={ref(r.sun ? 'glint-sun' : 'glint')}
                className={r.sun ? 'ls-ripple' : 'ls-ripple ls-wind'}
                style={{ animationDelay: `${r.delay}s` }}
              />
            ))}
          </g>
          <rect x="0" y={floor - 0.5} width={width} height="1.5" className="ls-shore" />
        </>
      ) : null}
    </svg>
  );
}
