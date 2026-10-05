import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./session";
import type { Theme } from "./theme-options";

// The signed-in user's theme. Visitors get "system", which follows the device.
export const getTheme = cache(async (): Promise<Theme> => (await getCurrentUser())?.theme ?? "system");
