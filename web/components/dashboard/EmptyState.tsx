import { ButtonLink } from "@/components/ui/Button";
import styles from "./EmptyState.module.css";

export function EmptyState() {
  return (
    <main className={styles.main}>
      <svg
        width="260"
        height="200"
        viewBox="0 0 260 200"
        aria-hidden="true"
        className={styles.art}
      >
        <rect
          x="42"
          y="26"
          width="132"
          height="164"
          rx="4"
          fill="#eae5da"
          stroke="var(--hairline)"
          strokeWidth="1.5"
          transform="rotate(-6 108 108)"
        />
        <rect
          x="70"
          y="18"
          width="132"
          height="164"
          rx="4"
          fill="var(--surface)"
          stroke="var(--hairline-strong)"
          strokeWidth="1.5"
        />
        <rect
          x="88"
          y="46"
          width="72"
          height="7"
          rx="3.5"
          fill="var(--ink)"
          opacity="0.75"
        />
        <g fill="var(--ink)" opacity="0.16">
          <rect x="88" y="72" width="96" height="4" rx="2" />
          <rect x="88" y="88" width="96" height="4" rx="2" />
          <rect x="88" y="104" width="60" height="4" rx="2" />
        </g>
        <circle cx="196" cy="150" r="26" fill="var(--blue)" opacity="0.16" />
        <circle
          cx="196"
          cy="150"
          r="26"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        <path
          d="M186 150 H206 M196 140 V160"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className={styles.copy}>
        <h1 className={styles.heading}>ჯერ არაფერი გაქვს დაწერილი</h1>
        <ButtonLink href="/write" className={styles.cta}>
          დაწერე პირველი ბლოგი
        </ButtonLink>
      </div>
    </main>
  );
}
