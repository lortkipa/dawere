import styles from "./Button.module.css";

type ButtonProps = React.ComponentProps<"button"> & {
  /** solid = dark pill, ghost = bare text, outline = white bordered pill */
  variant?: "solid" | "ghost" | "outline";
  /** Only affects the solid variant; ghost and outline have fixed metrics. */
  size?: "sm" | "lg";
  fullWidth?: boolean;
};

export function Button({
  variant = "solid",
  size = "sm",
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const classes = [styles.base, styles[variant], styles[size]];
  if (fullWidth) classes.push(styles.fullWidth);
  if (className) classes.push(className);

  return <button type="button" className={classes.join(" ")} {...props} />;
}
