import type { ComponentProps } from "react";

type TextInputProps = ComponentProps<"input"> & { invalid?: boolean };

export function TextInput({ invalid = false, className = "", ...props }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid ? true : undefined}
      className={`h-12 rounded-lg border bg-white px-4 text-base outline-offset-0 transition-colors placeholder:text-[#9a9a98] focus:border-ink ${
        invalid ? "border-[#d93025]" : "border-line"
      } ${className}`}
      {...props}
    />
  );
}
