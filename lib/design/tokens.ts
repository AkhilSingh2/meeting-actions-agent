/**
 * Design tokens are the source of truth for color.
 * globals.css consumes the CSS variables emitted by `tokenStyle`.
 * tests/contrast.test.ts checks the pairs below against WCAG AA.
 */
export const themes = {
  light: {
    bg: "#f3efe6",
    surface: "#fbf8f2",
    "surface-2": "#f7f1e6",
    ink: "#1c1916",
    "ink-soft": "#34302b",
    muted: "#4e4942",
    line: "#ddd4c6",
    accent: "#7c3418",
    "accent-soft": "#f3e4da",
    highlight: "#f8eadf",
    danger: "#8d2a2a",
    "on-ink": "#f7f3eb",
    glow: "rgba(124, 52, 24, 0.08)",
    "glow-2": "rgba(78, 73, 66, 0.05)",
    shadow: "0 1px 0 rgba(255, 252, 247, 0.8) inset, 0 16px 40px rgba(48, 32, 16, 0.06)",
  },
  dark: {
    bg: "#12110f",
    surface: "#1c1b18",
    "surface-2": "#24221e",
    ink: "#f6f1e8",
    "ink-soft": "#e4ddd2",
    muted: "#c8c0b4",
    line: "#3a362f",
    accent: "#f0b08a",
    "accent-soft": "#3a2a22",
    highlight: "#2c241e",
    danger: "#f0b4ae",
    "on-ink": "#1c1916",
    glow: "rgba(240, 176, 138, 0.08)",
    "glow-2": "rgba(246, 241, 232, 0.03)",
    shadow: "0 0 0 1px rgba(255, 255, 255, 0.02)",
  },
} as const;

export type ThemeName = keyof typeof themes;
export type TokenName = keyof typeof themes.light;

/** Pairs that must clear WCAG AA for normal text (4.5:1). */
export const textPairs: Array<[TokenName, TokenName]> = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "surface-2"],
  ["ink", "highlight"],
  ["ink", "accent-soft"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["muted", "surface-2"],
  ["accent", "bg"],
  ["accent", "surface"],
  ["accent", "surface-2"],
  ["accent", "highlight"],
  ["danger", "bg"],
  ["danger", "surface"],
  ["on-ink", "ink"],
];

export function tokenStyle(): string {
  const block = (theme: ThemeName, selector: string) => {
    const body = Object.entries(themes[theme])
      .map(([name, value]) => `--${name}: ${value};`)
      .join("");
    return `${selector}{color-scheme:${theme};${body}}`;
  };
  return `${block("light", ":root")}${block("dark", ':root[data-theme="dark"]')}`;
}
