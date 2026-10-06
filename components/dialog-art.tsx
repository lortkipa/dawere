import type { ReactNode } from "react";

// Illustrations for the banner at the top of each dialog, drawn in the same palette as the
// empty-state ones. Each sits on the banner's `accent-soft` fill.
export type DialogArtName =
  | "delete"
  | "email"
  | "profile"
  | "write"
  | "photo"
  | "topics"
  | "favorites"
  | "theme"
  | "link"
  | "role"
  | "signout"
  | "comment"
  | "ban"
  | "report"
  | "export"
  | "help";

const paper = { fill: "#fff", stroke: "#dededa", strokeWidth: 1.2 };
const textLine = { fill: "none", stroke: "#e2e2df", strokeWidth: 4, strokeLinecap: "round" } as const;
const sparkle = { fill: "none", stroke: "#c7cdf9", strokeWidth: 2, strokeLinecap: "round" } as const;

export function DialogArt({ name, className = "" }: { name: DialogArtName; className?: string }) {
  return (
    <svg viewBox="0 0 240 128" aria-hidden="true" className={className}>
      <ellipse cx="120" cy="117" rx="64" ry="4.5" className="fill-accent-soft-hover" />
      <path d="M44 34v10M39 39h10M196 26v8M192 30h8M206 84v6M203 87h6" {...sparkle} />
      {arts[name]}
    </svg>
  );
}

function Pencil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-38)`}>
      <rect x="0" y="-3.5" width="6" height="7" rx="1.5" fill="#e8a48c" />
      <rect x="6" y="-3.5" width="5" height="7" fill="#d4d4d0" />
      <rect x="11" y="-3.5" width="33" height="7" fill="#f2c94c" />
      <path d="M11 0h33" stroke="#e0b53a" strokeWidth="1" />
      <path d="M44-3.5L54 0l-10 3.5z" fill="#ebc9a5" />
      <path d="M50.6-1.2L54 0l-3.4 1.2z" fill="#3f3f46" />
    </g>
  );
}

const arts: Record<DialogArtName, ReactNode> = {
  // A flag planted beside a page.
  report: (
    <>
      <g transform="rotate(-6 96 72)">
        <rect x="66" y="34" width="60" height="76" rx="6" {...paper} />
        <path d="M76 48h40M76 58h40M76 68h28M76 78h36" {...textLine} strokeWidth="3" />
      </g>
      <path d="M140 116V24" stroke="#5f68a8" strokeWidth="5" strokeLinecap="round" />
      <path d="M142 27h42l-10 15 10 15h-42z" fill="#e07a5f" />
      <path d="M142 27h42l-10 15h-32z" fill="#e8a48c" />
    </>
  ),

  // A profile card with a no-entry sign over its corner.
  ban: (
    <>
      <rect x="62" y="30" width="104" height="72" rx="8" {...paper} />
      <path d="M62 38a8 8 0 0 1 8-8h88a8 8 0 0 1 8 8v6H62z" fill="#7d86c4" />
      <circle cx="90" cy="70" r="15" fill="#e5e8ff" />
      <circle cx="90" cy="65" r="5.5" fill="#7d86c4" />
      <path d="M80 80a10 10 0 0 1 20 0" fill="#7d86c4" />
      <path d="M114 62h36M114 72h22" {...textLine} />
      <circle cx="160" cy="88" r="21" fill="#fff" stroke="#e07a5f" strokeWidth="7" />
      <path d="m145.5 73.5 29 29" stroke="#e07a5f" strokeWidth="7" strokeLinecap="round" />
    </>
  ),

  // A bin with its lid lifted, a page on its way in and a crumpled one beside it.
  delete: (
    <>
      <path d="M68 113l3-7 7-2 6 4 1 7-4 5-8 1-5-4z" {...paper} strokeLinejoin="round" />
      <path d="M71 106l4 6 6-1M75 112l-2 5" fill="none" stroke="#dededa" strokeWidth="1.1" strokeLinecap="round" />
      <g transform="rotate(16 150 34)">
        <rect x="136" y="14" width="30" height="38" rx="3" {...paper} />
        <path d="M142 24h18M142 31h18M142 38h11" {...textLine} strokeWidth="2.5" />
      </g>
      <path d="M95 56h50l-4.5 56a5 5 0 0 1-5 4.5h-31a5 5 0 0 1-5-4.5z" fill="#7d86c4" />
      <path d="M110 66v40M120 66v40M130 66v40" stroke="#6a73b5" strokeWidth="3.5" strokeLinecap="round" />
      <g transform="rotate(-16 96 50)">
        <rect x="88" y="44" width="64" height="9" rx="3.5" fill="#5f68a8" />
        <rect x="111" y="37" width="18" height="9" rx="3.5" fill="none" stroke="#5f68a8" strokeWidth="3.5" />
      </g>
    </>
  ),

  // A page dropping into an open box, with a download arrow.
  export: (
    <>
      <g transform="rotate(-6 120 48)">
        <rect x="94" y="16" width="52" height="64" rx="4" {...paper} />
        <path d="M103 28h34M103 37h34M103 46h22" {...textLine} strokeWidth="3" />
      </g>
      <path d="M72 70h96l-8 40a6 6 0 0 1-6 5H86a6 6 0 0 1-6-5z" fill="#7d86c4" />
      <path d="M72 70l12-12h72l12 12" fill="#6a73b5" />
      <circle cx="162" cy="50" r="13" fill="#f2c94c" />
      <path d="M162 43v13M156.5 51l5.5 5.5 5.5-5.5" fill="none" stroke="#8a5a3b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // A letter sliding out of an envelope, with a check on it.
  email: (
    <>
      <rect x="90" y="22" width="60" height="50" rx="4" {...paper} />
      <path d="M100 34h40M100 43h40M100 52h26" {...textLine} strokeWidth="3" />
      <path d="M78 58l42 28 42-28v48a6 6 0 0 1-6 6H84a6 6 0 0 1-6-6z" fill="#7d86c4" />
      <path d="M78 110l34-28M162 110l-34-28" stroke="#6a73b5" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="160" cy="54" r="13" fill="#f2c94c" />
      <path d="m154 54 4.5 4.5 8-8.5" fill="none" stroke="#8a5a3b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // A profile card with a pencil across its corner.
  profile: (
    <>
      <rect x="68" y="30" width="104" height="72" rx="8" {...paper} />
      <path d="M68 38a8 8 0 0 1 8-8h88a8 8 0 0 1 8 8v6H68z" fill="#7d86c4" />
      <circle cx="96" cy="70" r="15" fill="#e5e8ff" />
      <circle cx="96" cy="65" r="5.5" fill="#7d86c4" />
      <path d="M86 80a10 10 0 0 1 20 0" fill="#7d86c4" />
      <path d="M120 62h36M120 72h28M120 82h32" {...textLine} />
      <Pencil x={150} y={110} />
    </>
  ),

  // An open notebook with a pencil.
  write: (
    <>
      <path d="M62 112l5-62 53 7 53-7 5 62-58 8z" fill="#7d86c4" />
      <path d="M68 106l4-56q25-6 48 4v56q-24-9-52-4z" fill="#fff" />
      <path d="M172 106l-4-56q-25-6-48 4v56q24-9 52-4z" fill="#fafaf8" />
      <path d="M120 54v56" stroke="#e2e2df" strokeWidth="1.2" />
      <path d="M79 64q17-4 33 2M78 73q17-4 34 2M77 82q12-3 23 0" fill="none" stroke="#c7cdf9" strokeWidth="2" strokeLinecap="round" />
      <Pencil x={132} y={100} />
    </>
  ),

  // A photo with a second one behind it.
  photo: (
    <>
      <g transform="rotate(-9 120 66)">
        <rect x="80" y="28" width="84" height="70" rx="6" fill="#fafaf8" stroke="#dededa" strokeWidth="1.2" />
      </g>
      <rect x="78" y="32" width="88" height="74" rx="6" {...paper} />
      <rect x="86" y="40" width="72" height="50" rx="3" fill="#e5e8ff" />
      <circle cx="141" cy="54" r="6.5" fill="#f2c94c" />
      <path d="M86 90l22-26 14 15 10-10 26 21z" fill="#7d86c4" />
    </>
  ),

  // Topic chips, one of them picked.
  topics: (
    <>
      <rect x="62" y="28" width="70" height="22" rx="11" {...paper} />
      <circle cx="75" cy="39" r="4" fill="#f2c94c" />
      <path d="M86 39h34" {...textLine} strokeWidth="3" />
      <rect x="104" y="58" width="78" height="22" rx="11" fill="#7d86c4" />
      <circle cx="117" cy="69" r="4" fill="#e5e8ff" />
      <path d="M128 69h30" fill="none" stroke="#c7cdf9" strokeWidth="3" strokeLinecap="round" />
      <path d="m164 69 3.5 3.5 6-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="70" y="88" width="62" height="22" rx="11" {...paper} />
      <circle cx="83" cy="99" r="4" fill="#e8a48c" />
      <path d="M94 99h26" {...textLine} strokeWidth="3" />
    </>
  ),

  // A post card with a bookmark on it.
  favorites: (
    <>
      <g transform="rotate(7 132 70)">
        <rect x="108" y="26" width="64" height="82" rx="6" fill="#fafaf8" stroke="#dededa" strokeWidth="1.2" />
      </g>
      <g transform="rotate(-6 104 70)">
        <rect x="72" y="26" width="66" height="86" rx="6" {...paper} />
        <rect x="81" y="37" width="28" height="18" rx="3" fill="#e5e8ff" />
        <path d="M81 66h40M81 75h44M81 84h32M81 93h38" {...textLine} strokeWidth="3" />
        <path d="M114 22h17v38l-8.5-6-8.5 6z" fill="#7d86c4" />
      </g>
    </>
  ),

  // A window, light on one half and dark on the other.
  theme: (
    <>
      <rect x="66" y="28" width="108" height="78" rx="8" {...paper} />
      <path d="M120 28h46a8 8 0 0 1 8 8v62a8 8 0 0 1-8 8h-46z" fill="#3a3b5c" />
      <circle cx="93" cy="67" r="10" fill="#f2c94c" />
      <path
        d="M93 49v5M93 80v5M75 67h5M106 67h5M80.3 54.3l3.5 3.5M102.2 76.2l3.5 3.5M80.3 79.7l3.5-3.5M102.2 57.8l3.5-3.5"
        stroke="#f2c94c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="147" cy="67" r="12" fill="#e5e8ff" />
      <circle cx="153" cy="61" r="11" fill="#3a3b5c" />
      <circle cx="160" cy="84" r="1.6" fill="#e5e8ff" />
      <circle cx="134" cy="46" r="1.4" fill="#e5e8ff" />
      <circle cx="163" cy="44" r="1.2" fill="#e5e8ff" />
    </>
  ),

  // Two chain links over a page.
  link: (
    <>
      <rect x="82" y="26" width="76" height="86" rx="6" {...paper} />
      <path d="M92 38h56M92 47h50" {...textLine} strokeWidth="3" />
      <g transform="rotate(-35 120 78)">
        <rect x="86" y="66" width="40" height="24" rx="12" fill="none" stroke="#7d86c4" strokeWidth="7" />
        <rect x="114" y="66" width="40" height="24" rx="12" fill="none" stroke="#f2c94c" strokeWidth="7" />
      </g>
    </>
  ),

  // A shield with a check.
  role: (
    <>
      <path d="M120 22l38 13v27c0 25-17 41-38 50-21-9-38-25-38-50V35z" fill="#7d86c4" />
      <path d="M120 32l28 9.5V62c0 18-12 31-28 39z" fill="#6a73b5" />
      <path d="m104 66 11 11 22-23" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // An open door with an arrow on its way out.
  signout: (
    <>
      <rect x="84" y="24" width="54" height="92" rx="3" {...paper} />
      <path d="M84 24l34 8v92l-34-8z" fill="#7d86c4" />
      <circle cx="110" cy="74" r="3" fill="#f2c94c" />
      <path d="M134 70h38m-11-11 11 11-11 11" fill="none" stroke="#e8a48c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // Two speech bubbles.
  comment: (
    <>
      <path d="M66 34a8 8 0 0 1 8-8h70a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H92l-14 12v-12h-4a8 8 0 0 1-8-8z" {...paper} />
      <path d="M78 42h58M78 52h62M78 62h40" {...textLine} strokeWidth="3" />
      <path d="M118 74a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-2v11l-12-11h-26a8 8 0 0 1-8-8z" fill="#7d86c4" />
      <circle cx="134" cy="85" r="3" fill="#e5e8ff" />
      <circle cx="146" cy="85" r="3" fill="#e5e8ff" />
      <circle cx="158" cy="85" r="3" fill="#e5e8ff" />
    </>
  ),

  // A page with a question mark beside it.
  help: (
    <>
      <g transform="rotate(-6 104 68)">
        <rect x="72" y="26" width="64" height="84" rx="6" {...paper} />
        <path d="M82 42h44M82 52h44M82 62h30M82 72h38M82 82h24" {...textLine} strokeWidth="3" />
      </g>
      <circle cx="156" cy="64" r="22" fill="#7d86c4" />
      <path
        d="M149 58a7 7 0 1 1 10 6.3c-2 1-3 2.4-3 4.2v1.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="156" cy="77" r="2.3" fill="#fff" />
    </>
  ),
};
