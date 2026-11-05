import {
  ActionIcon,
  Badge,
  Button,
  Card,
  createTheme,
  CSSVariablesResolver,
  Drawer,
  HoverCard,
  Input,
  MantineColorsTuple,
  Menu,
  Modal,
  Notification,
  Paper,
  Popover,
  rem,
  SegmentedControl,
  Select,
  Tabs,
  TextInput,
  Tooltip,
} from "@mantine/core";

const blue: MantineColorsTuple = [
  "#e7f3ff",
  "#d0e4ff",
  "#a1c6fa",
  "#6ea6f6",
  "#458bf2",
  "#2b7af1",
  "#0b60d8",
  "#1b72f2",
  "#0056c1",
  "#004aac",
];

// AltWiki brand: a calm, deep ink-blue. Registered as "brand" and used as the
// primary colour; `blue` stays available for callers that ask for it by name.
const brand: MantineColorsTuple = [
  "#eef1f8",
  "#dde3f1",
  "#b9c4e2",
  "#93a3d1",
  "#7486c2",
  "#5f72b8",
  "#4a5ea8",
  "#3e4f8f",
  "#344277",
  "#29355f",
];

const red: MantineColorsTuple = [
  "#ffebeb",
  "#fad7d7",
  "#eeadad",
  "#e3807f",
  "#da5a59",
  "#d54241",
  "#d43535",
  "#bc2727",
  "#a82022",
  "#93151b",
];

// Neutral dark scale: near-black surfaces, no colour cast.
const dark: MantineColorsTuple = [
  "#d6d6d9",
  "#a9a9ae",
  "#85858c",
  "#5c5c63",
  "#3a3a3f",
  "#2c2c30",
  "#222225",
  "#1a1a1c",
  "#141416",
  "#0e0e0f",
];

// Neutral greys (zinc-like).
const gray: MantineColorsTuple = [
  "#fafafa",
  "#f4f4f5",
  "#ebebed",
  "#e0e0e3",
  "#d0d0d5",
  "#a1a1a9",
  "#70707a",
  "#52525a",
  "#3c3c43",
  "#27272a",
];

// Inter is self-hosted (public/fonts, see styles/fonts.css); native UI stack
// as fallback.
const systemFont =
  'Inter, "Inter Variable", "InterVariable", -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

const monoFont =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export const theme = createTheme({
  colors: {
    brand,
    blue,
    red,
    dark,
    gray,
  },
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  fontFamily: systemFont,
  fontFamilyMonospace: monoFont,
  defaultRadius: "md",
  cursorType: "pointer",
  focusRing: "auto",
  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },
  shadows: {
    // Near-flat: borders carry structure; only floating layers get depth.
    xs: "none",
    sm: "0 1px 2px rgba(0, 0, 0, 0.04)",
    md: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
    lg: "0 8px 24px -6px rgba(0, 0, 0, 0.12)",
    xl: "0 16px 40px -10px rgba(0, 0, 0, 0.18)",
  },
  headings: {
    fontFamily: systemFont,
    fontWeight: "600",
    sizes: {
      h1: { fontSize: rem(30), lineHeight: "1.25" },
      h2: { fontSize: rem(24), lineHeight: "1.3" },
      h3: { fontSize: rem(20), lineHeight: "1.35" },
      h4: { fontSize: rem(17), lineHeight: "1.4" },
      h5: { fontSize: rem(15), lineHeight: "1.45" },
      h6: { fontSize: rem(14), lineHeight: "1.5" },
    },
  },
  components: {
    Button: Button.extend({
      defaultProps: { radius: "md" },
      styles: { root: { fontWeight: 500 } },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { radius: "md" },
    }),
    Badge: Badge.extend({
      defaultProps: { radius: "sm" },
      styles: { root: { textTransform: "none", fontWeight: 600 } },
    }),
    Card: Card.extend({
      defaultProps: { radius: "md" },
    }),
    Paper: Paper.extend({
      defaultProps: { radius: "md" },
    }),
    Input: Input.extend({
      defaultProps: { radius: "md" },
    }),
    TextInput: TextInput.extend({
      defaultProps: { radius: "md" },
    }),
    Select: Select.extend({
      defaultProps: {
        radius: "md",
        comboboxProps: { shadow: "md", radius: "md" },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: "lg",
        shadow: "lg",
        overlayProps: { backgroundOpacity: 0.35 },
      },
      styles: {
        title: { fontWeight: 600, fontSize: "var(--mantine-font-size-lg)" },
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: {
        overlayProps: { backgroundOpacity: 0.35 },
      },
    }),
    Menu: Menu.extend({
      defaultProps: {
        radius: "md",
        shadow: "md",
        transitionProps: { transition: "fade", duration: 100 },
      },
      styles: {
        dropdown: {
          padding: rem(4),
          border: "1px solid var(--app-border-subtle)",
        },
        item: {
          borderRadius: "var(--mantine-radius-sm)",
          fontSize: "var(--mantine-font-size-sm)",
        },
        label: { fontWeight: 500 },
      },
    }),
    Popover: Popover.extend({
      defaultProps: { radius: "md", shadow: "md" },
      styles: { dropdown: { border: "1px solid var(--app-border-subtle)" } },
    }),
    HoverCard: HoverCard.extend({
      defaultProps: { radius: "md", shadow: "lg" },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        radius: "sm",
        openDelay: 250,
        transitionProps: { transition: "fade", duration: 120 },
      },
      styles: { tooltip: { fontSize: "var(--mantine-font-size-xs)" } },
    }),
    Tabs: Tabs.extend({
      styles: { tab: { fontWeight: 500 } },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { radius: "md" },
    }),
    Notification: Notification.extend({
      defaultProps: { radius: "md" },
    }),
  },
});

/**
 * App-level CSS variables. Existing names are kept stable; new tokens:
 *  --app-canvas            page background behind surfaces
 *  --app-surface-raised    cards / popovers sitting on a surface
 *  --app-rail-bg           space rail background
 *  --app-rail-width        width of the floating space rail (72px)
 *  --app-rail-outer        rail plus its 12px insets (96px)
 *  --app-header-height     global header height (96px desktop)
 *  --app-font-serif        display serif (greeting, page titles)
 *  --app-glass-*           frosted glass surfaces over the background photo
 *  --app-wash-rgb/alpha    neutral wash laid over the background photo
 *  --app-doc-bg            solid reading surface (page / settings routes)
 *  --app-accent            brand accent (filled)
 *  --app-accent-hover      brand accent hover
 *  --app-accent-soft       tinted brand background (active rows, chips)
 *  --app-accent-text       brand-coloured text on soft backgrounds
 *  --app-focus-ring        focus outline colour
 *  --app-text-subtle       tertiary text (labels, counts)
 *  --app-tree-guide        tree indentation guide line
 *  --app-shadow-card       resting card shadow (hairline + soft depth)
 *  --app-shadow-card-hover hovered card shadow
 *  --app-transition-fast   120ms ease-out
 *  --app-transition-slow   180ms ease-out
 */
export const mantineCssResolver: CSSVariablesResolver = (theme) => ({
  variables: {
    "--input-error-size": theme.fontSizes.sm,
    "--app-transition": "150ms cubic-bezier(0.2, 0, 0, 1)",
    "--app-transition-fast": "120ms cubic-bezier(0.2, 0, 0, 1)",
    "--app-transition-slow": "180ms cubic-bezier(0.2, 0, 0, 1)",
    "--app-rail-width": "72px",
    "--app-rail-outer": "96px",
    "--app-header-height": "96px",
    "--app-font-serif":
      '"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif',
  },
  light: {
    "--mantine-color-body": "#FDFCFA",
    "--mantine-color-text": "#1F2533",
    "--app-ink": "#1F2533",
    "--app-text-2": "#5B6475",
    "--app-muted": "#8A93A3",
    "--app-hair": "rgba(15, 23, 42, 0.07)",
    "--app-glass-bg": "rgba(255, 255, 255, 0.78)",
    "--app-glass-soft-bg": "rgba(255, 255, 255, 0.62)",
    "--app-glass-strong-bg": "rgba(255, 255, 255, 0.92)",
    "--app-glass-border": "rgba(255, 255, 255, 0.7)",
    "--app-glass-shadow":
      "0 0 0 1px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
    "--app-glass-soft-shadow":
      "0 0 0 1px rgba(15, 23, 42, 0.05), 0 4px 16px rgba(15, 23, 42, 0.05)",
    "--app-tile-bg": "rgba(255, 255, 255, 0.7)",
    "--app-tile-hover": "rgba(255, 255, 255, 0.95)",
    "--app-tile-active": "rgba(255, 255, 255, 0.9)",
    "--app-row-hover": "rgba(255, 255, 255, 0.55)",
    "--app-wash-rgb": "246 244 240",
    "--app-wash-alpha": "0.38",
    "--app-plain-bg": "#F4F2EE",
    "--app-doc-bg": "#FDFCFA",
    "--app-canvas": theme.white,
    "--app-surface": theme.white,
    "--app-surface-muted": theme.colors.gray[0],
    "--app-surface-raised": theme.white,
    "--app-rail-bg": theme.colors.gray[0],
    "--app-border": theme.colors.gray[3],
    "--app-border-subtle": theme.colors.gray[2],
    "--app-hover": "rgba(0, 0, 0, 0.04)",
    "--app-active": "rgba(0, 0, 0, 0.065)",
    "--app-text-muted": theme.colors.gray[6],
    "--app-text-subtle": theme.colors.gray[5],
    "--app-accent": theme.colors.brand[6],
    "--app-accent-hover": theme.colors.brand[7],
    "--app-accent-soft": "rgba(74, 94, 168, 0.08)",
    "--app-accent-text": theme.colors.brand[7],
    "--app-focus-ring": "rgba(74, 94, 168, 0.4)",
    "--app-tree-guide": "rgba(0, 0, 0, 0.08)",
    "--app-shadow-card": "0 0 0 1px rgba(0, 0, 0, 0.07)",
    "--app-shadow-card-hover": "0 0 0 1px rgba(0, 0, 0, 0.14)",
  },
  dark: {
    "--app-ink": "#E6E9EF",
    "--app-text-2": "#AEB5C2",
    "--app-muted": "#7E8796",
    "--app-hair": "rgba(255, 255, 255, 0.08)",
    "--app-glass-bg": "rgba(20, 24, 33, 0.72)",
    "--app-glass-soft-bg": "rgba(20, 24, 33, 0.6)",
    "--app-glass-strong-bg": "rgba(24, 28, 38, 0.94)",
    "--app-glass-border": "rgba(255, 255, 255, 0.08)",
    "--app-glass-shadow":
      "0 0 0 1px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.22)",
    "--app-glass-soft-shadow":
      "0 0 0 1px rgba(0, 0, 0, 0.25), 0 4px 16px rgba(0, 0, 0, 0.2)",
    "--app-tile-bg": "rgba(255, 255, 255, 0.04)",
    "--app-tile-hover": "rgba(255, 255, 255, 0.08)",
    "--app-tile-active": "rgba(255, 255, 255, 0.12)",
    "--app-row-hover": "rgba(255, 255, 255, 0.05)",
    "--app-wash-rgb": "14 17 24",
    "--app-wash-alpha": "0.6",
    "--app-plain-bg": "var(--mantine-color-body)",
    "--app-doc-bg": theme.colors.dark[7],
    "--app-canvas": theme.colors.dark[8],
    "--app-surface": theme.colors.dark[7],
    "--app-surface-muted": theme.colors.dark[8],
    "--app-surface-raised": theme.colors.dark[6],
    "--app-rail-bg": theme.colors.dark[9],
    "--app-border": theme.colors.dark[4],
    "--app-border-subtle": theme.colors.dark[5],
    "--app-hover": "rgba(255, 255, 255, 0.05)",
    "--app-active": "rgba(255, 255, 255, 0.08)",
    "--app-text-muted": theme.colors.dark[2],
    "--app-text-subtle": theme.colors.dark[3],
    "--app-accent": theme.colors.brand[4],
    "--app-accent-hover": theme.colors.brand[3],
    "--app-accent-soft": "rgba(147, 163, 209, 0.12)",
    "--app-accent-text": theme.colors.brand[2],
    "--app-focus-ring": "rgba(147, 163, 209, 0.5)",
    "--app-tree-guide": "rgba(255, 255, 255, 0.07)",
    "--app-shadow-card": "0 0 0 1px rgba(255, 255, 255, 0.07)",
    "--app-shadow-card-hover": "0 0 0 1px rgba(255, 255, 255, 0.14)",
  },
});
