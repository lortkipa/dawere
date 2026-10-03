import type { Option } from "@/lib/onboarding-options";

type ChipProps = {
  option: Option;
  selected: boolean;
  onClick: () => void;
  // Radio chips report `aria-checked`; toggle chips report `aria-pressed`.
  role?: "radio";
};

export function Chip({ option, selected, onClick, role }: ChipProps) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : selected}
      aria-checked={role ? selected : undefined}
      onClick={onClick}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors select-none ${
        selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-surface"
      }`}
    >
      <span aria-hidden="true">{option.emoji}</span>
      {option.label}
      {selected && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="-mr-1 size-4"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </button>
  );
}
