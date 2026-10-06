import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./session";
import type { Theme } from "./theme-options";

// The signed-in user's theme. Visitors always get light; the theme is an account setting.
export const getTheme = cache(async (): Promise<Theme> => (await getCurrentUser())?.theme ?? "light");
