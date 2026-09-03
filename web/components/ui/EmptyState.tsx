import { ButtonLink } from "@/components/ui/Button";
import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  heading: string;
  /** 1 where nothing else on the page claims that level, 2 where it does. */
  level?: 1 | 2;
  /** The way out. Absent when the viewer has no way out of this page. */
  action?: { href: string; label: string };
};

/**
 * A page with nothing on it yet: the author's own list before they write, and
 * an author's page before they publish. The art carries a plus only where there
 * is an action beside it — a visitor reading someone else's empty page is being
 * told a fact, not offered a way to fix it — and the drawing recentres itself
 * on the pages alone when the badge is gone.
 */
export function EmptyState({ heading, level = 1, action }: EmptyStateProps) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div className={styles.empty}>
      <svg
        width={action ? 260 : 200}
        height="200"
        viewBox={action ? "0 0 260 200" : "20 0 200 200"}
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

        {action && (
          <>
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
          </>
        )}
      </svg>

      <div className={styles.copy}>
        <Heading className={styles.heading}>{heading}</Heading>
        {action && (
          <ButtonLink href={action.href} className={styles.cta}>
            {action.label}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
