import Link from "next/link";
import styles from "./Button.module.css";

type Appearance = {
  /** solid = dark pill, ghost = bare text, outline = white bordered pill */
  variant?: "solid" | "ghost" | "outline";
  /** Only affects the solid variant; ghost and outline have fixed metrics. */
  size?: "sm" | "lg";
  fullWidth?: boolean;
};

type ButtonProps = React.ComponentProps<"button"> & Appearance;

/** A link that has to read as a button — same classes, right element. */
type ButtonLinkProps = React.ComponentProps<typeof Link> & Appearance;

function appearanceClass(
  { variant = "solid", size = "sm", fullWidth = false }: Appearance,
  className?: string,
) {
  const classes = [styles.base, styles[variant], styles[size]];
  if (fullWidth) classes.push(styles.fullWidth);
  if (className) classes.push(className);

  return classes.join(" ");
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={appearanceClass({ variant, size, fullWidth }, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={appearanceClass({ variant, size, fullWidth }, className)}
      {...props}
    />
  );
}
