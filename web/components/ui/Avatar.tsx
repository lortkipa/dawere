import Image from "next/image";
import styles from "./Avatar.module.css";

type AvatarProps = {
  name: string;
  image: string | null;
  /** Intrinsic pixel size for the OAuth picture. Display size is CSS. */
  size: number;
  className?: string;
};

/** The OAuth picture when there is one, otherwise the first letter of the name. */
export function Avatar({ name, image, size, className }: AvatarProps) {
  const classes = className ? `${styles.avatar} ${className}` : styles.avatar;

  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className={classes}
      />
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      {/* No toUpperCase: Georgian is unicameral, and uppercasing it in JS
          swaps mkhedruli for mtavruli glyphs the display font may not have. */}
      {Array.from(name.trim())[0] ?? ""}
    </span>
  );
}
