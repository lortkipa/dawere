// The blue person-with-a-check shown after the name of an author you follow.
export function FollowedIcon({ className = "" }: { className?: string }) {
  return (
    <span title="გამოწერილი" className={`text-blue-500 ${className}`}>
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" role="img" aria-label="გამოწერილი">
        <circle cx="9" cy="7.5" r="4" />
        <path d="M1.5 20.5a7.5 7.5 0 0 1 15 0 .5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5z" />
        <path
          d="m16 11.5 2.25 2.25L22.5 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
