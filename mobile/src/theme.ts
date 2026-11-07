import { Platform } from "react-native";

/** One accent, taken from the site primary hsl(138 38% 28%). System font only. */

export const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: undefined,
});

export const accent = "#2C633D";
export const paper = "#F4F1EA";
export const ink = "#1C1C1A";
export const muted = "#5C5C56";
export const line = "#E3E1DA";
export const white = "#FFFFFF";

export const target = 48;
