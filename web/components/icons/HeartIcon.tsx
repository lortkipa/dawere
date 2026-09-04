/** Outline until the reader has liked something; filled once they have. */
export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ flex: "0 0 auto" }}
    >
      <path
        d="M8 13.4 C8 13.4 2.2 10 2.2 6.1 C2.2 4.4 3.6 3 5.3 3 C6.5 3 7.5 3.7 8 4.7 C8.5 3.7 9.5 3 10.7 3 C12.4 3 13.8 4.4 13.8 6.1 C13.8 10 8 13.4 8 13.4 Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
