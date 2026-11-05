/**
 * Deterministic per-space colours. Every space gets one hue from a curated,
 * harmonious palette, derived from the space name (name is what every
 * surface has, including selects/avatars that never see the id), so the same space always looks the same everywhere:
 * rail, sidebar header, cards, selects.
 */

export interface SpaceColor {
  /** Palette key, e.g. "violet". */
  name: string;
  /** Solid colour for filled avatars / accents (white text passes AA). */
  base: string;
  /** Kept for API compatibility; equals base (no gradients). */
  deep: string;
  /** Kept for API compatibility; a plain solid colour. */
  gradient: string;
  /** Tinted background, light mode. */
  softLight: string;
  /** Tinted background, dark mode. */
  softDark: string;
  /** Tinted background that follows the colour scheme (CSS light-dark()). */
  soft: string;
  /** Text colour to use on the soft background (scheme-aware). */
  text: string;
  /** Space tag pill: hue at 12% alpha (scheme-aware). */
  tagBg: string;
  /** Space tag pill text: the hue itself (lighter in dark mode). */
  tagText: string;
}

// Muted, desaturated hues: quiet enough to sit side by side in the rail,
// white initials still pass AA, and they read the same in light and dark.
const PALETTE: Array<[name: string, base: string, deep: string, lightText: string, darkText: string]> = [
  ["slate", "#5e6b82", "#5e6b82", "#4a5568", "#aab6cc"],
  ["steel", "#4f6d8f", "#4f6d8f", "#3d5672", "#a3bfd8"],
  ["sage", "#5f7f6a", "#5f7f6a", "#4a6553", "#a8c2ae"],
  ["teal", "#3f7c80", "#3f7c80", "#316265", "#9fc4c3"],
  ["ochre", "#a07a3b", "#a07a3b", "#7f602d", "#d8c39a"],
  ["clay", "#a6614a", "#a6614a", "#854c3a", "#ddb4a4"],
  ["mauve", "#86607f", "#86607f", "#6b4c66", "#d0b2ca"],
  ["iris", "#5f5fa0", "#5f5fa0", "#4b4b82", "#b8b6e0"],
];

function hexToRgba(hex: string, alpha: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

export const SPACE_COLORS: SpaceColor[] = PALETTE.map(
  ([name, base, deep, lightText, darkText]) => {
    const softLight = hexToRgba(base, 0.1);
    const softDark = hexToRgba(base, 0.22);
    return {
      name,
      base,
      deep,
      gradient: base,
      softLight,
      softDark,
      soft: `light-dark(${softLight}, ${softDark})`,
      text: `light-dark(${lightText}, ${darkText})`,
      tagBg: `light-dark(${hexToRgba(base, 0.12)}, ${hexToRgba(base, 0.24)})`,
      tagText: `light-dark(${base}, ${darkText})`,
    };
  },
);

/** FNV-1a 32-bit — tiny, stable across sessions and browsers. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type SpaceLike = { id?: string | null; name?: string | null } | string | null | undefined;

function keyOf(space: SpaceLike): string {
  if (!space) return "";
  if (typeof space === "string") return space;
  return space.name || space.id || "";
}

/** Colour for a space. Accepts a space object ({ id, name }) or a raw key. */
export function getSpaceColor(space: SpaceLike): SpaceColor {
  return SPACE_COLORS[hash(keyOf(space)) % SPACE_COLORS.length];
}

/**
 * One or two initials for a space name, ignoring the "Archive:" prefix and
 * punctuation. "Engineering Docs" -> "ED", "exploRUG" -> "EX".
 */
export function getSpaceInitials(name?: string | null): string {
  const clean = (name || "")
    .replace(/^\s*archive\s*:/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
  if (!clean) return "?";
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
