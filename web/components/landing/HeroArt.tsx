import styles from "./Hero.module.css";

export function HeroArt() {
  return (
    <svg
      viewBox="0 0 420 420"
      role="img"
      aria-label="ხელი, რომელიც კალმით წერს"
      className={styles.artSvg}
    >
      <circle cx="204" cy="166" r="130" fill="var(--blue)" />

      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M88 176 C 86 130 128 106 168 117 C 210 128 218 178 186 202 C 162 220 150 240 150 302" />
      </g>
      <circle cx="150" cy="348" r="12" fill="var(--ink)" />

      <g transform="rotate(45 150 306)">
        <rect x="134" y="48" width="32" height="226" rx="16" fill="var(--ink)" />
        <rect x="134" y="92" width="32" height="5" fill="var(--paper)" />
        <rect x="159" y="58" width="7" height="48" rx="3.4" fill="var(--blue)" />
        <path d="M134 240 h32 v34 h-32 z" fill="var(--paper)" />
        <path d="M134 240 h32 v6 h-32 z" fill="var(--ink)" />
        <path d="M150 308 L 134 268 Q 150 256 166 268 Z" fill="var(--ink)" />
        <path
          d="M150 301 L 150 274"
          stroke="var(--paper)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      <g fill="var(--ink)">
        <path d="M344 44 l 6 17 17 6 -17 6 -6 17 -6 -17 -17 -6 17 -6 z" />
        <path d="M62 268 l 4.5 12.5 12.5 4.5 -12.5 4.5 -4.5 12.5 -4.5 -12.5 -12.5 -4.5 12.5 -4.5 z" />
      </g>
    </svg>
  );
}
