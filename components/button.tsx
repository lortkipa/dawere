import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-hover",
  secondary: "bg-accent-soft text-ink hover:bg-[#e2e5fd]",
  outline: "border border-line bg-white text-ink hover:bg-surface",
  ghost: "text-ink hover:bg-surface",
};

const sizes = {
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
};

// Renders a <Link> when given an href; otherwise a plain button.
export function Button({ variant = "primary", size = "md", className = "", href, ...props }: ButtonProps) {
  const classes = `inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {props.children}
      </Link>
    );
  }

  return <button type="button" className={classes} {...props} />;
}
