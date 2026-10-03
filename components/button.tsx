import type { ComponentProps } from "react";

const variants = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-hover",
  secondary: "bg-accent-soft text-ink hover:bg-[#e2e5fd]",
  ghost: "text-ink hover:bg-surface",
};

const sizes = {
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

// Inert for now; becomes a <Link> once the auth and reading pages exist.
export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
