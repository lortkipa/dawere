export function FeedIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ flex: "0 0 auto" }}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M2.5 3.5h11M2.5 7h11M2.5 10.5h7M2.5 14h4" />
      </g>
    </svg>
  );
}
