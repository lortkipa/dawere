export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

// The browser bar color for each side; the same as `--color-bg` in globals.css.
export const themeColors = { light: "#ffffff", dark: "#191919" };

export function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}
