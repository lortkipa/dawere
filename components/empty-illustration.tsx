// An open notebook with a pencil and a cup of coffee, for empty post lists.
export function EmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className={className}>
      <circle cx="100" cy="70" r="58" fill="#eef0ff" />
      <ellipse cx="104" cy="127" rx="78" ry="5" fill="#efefec" />

      {/* Crumpled page */}
      <path d="M18 117l3-7 7-2 6 4 1 7-4 5-8 1-5-4z" fill="#fff" stroke="#dededa" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M21 110l4 6 6-1M25 116l-2 6M31 115l2 5" fill="none" stroke="#dededa" strokeWidth="1.1" strokeLinecap="round" />

      {/* Notebook */}
      <path d="M38 116l5-64 55 7 55-7 5 64-60 8z" fill="#7d86c4" />
      <path d="M44 110l4-58q26-6 50 4v58q-25-9-54-4z" fill="#fff" />
      <path d="M152 110l-4-58q-26-6-50 4v58q25-9 54-4z" fill="#fafaf8" />
      <path d="M98 56v58" stroke="#e2e2df" strokeWidth="1.2" />
      <path
        d="M55 66q18-4 35 2M54 75q18-4 36 2M53 84q12-3 24 0"
        fill="none"
        stroke="#c7cdf9"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Pencil */}
      <g transform="translate(110 104) rotate(-38)">
        <rect x="0" y="-3.5" width="6" height="7" rx="1.5" fill="#e8a48c" />
        <rect x="6" y="-3.5" width="5" height="7" fill="#d4d4d0" />
        <rect x="11" y="-3.5" width="33" height="7" fill="#f2c94c" />
        <path d="M11 0h33" stroke="#e0b53a" strokeWidth="1" />
        <path d="M44-3.5L54 0l-10 3.5z" fill="#ebc9a5" />
        <path d="M50.6-1.2L54 0l-3.4 1.2z" fill="#3f3f46" />
      </g>

      {/* Coffee */}
      <path d="M170 86q-3-4 0-8t0-8M178 86q-3-4 0-8t0-8" fill="none" stroke="#c7cdf9" strokeWidth="2" strokeLinecap="round" />
      <path d="M186 102a6 6 0 0 1 0 12" fill="none" stroke="#e8a48c" strokeWidth="3.2" />
      <rect x="164" y="92" width="22" height="30" rx="4" fill="#e8a48c" />
      <ellipse cx="175" cy="93" rx="10" ry="2.6" fill="#8a5a3b" />
    </svg>
  );
}
