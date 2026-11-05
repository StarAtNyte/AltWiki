import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Icon,
  IconArchive,
  IconArmchair,
  IconBook,
  IconBox,
  IconBrain,
  IconBriefcase,
  IconBrush,
  IconBuilding,
  IconBulb,
  IconCamera,
  IconChartBar,
  IconCode,
  IconCpu,
  IconCube,
  IconDatabase,
  IconFlask,
  IconGitBranch,
  IconGridDots,
  IconHeadset,
  IconHome,
  IconLayoutGrid,
  IconLeaf,
  IconLifebuoy,
  IconMap,
  IconMountain,
  IconMovie,
  IconMusic,
  IconNetwork,
  IconNotebook,
  IconPalette,
  IconRocket,
  IconSchool,
  IconServer,
  IconShieldLock,
  IconSpeakerphone,
  IconTexture,
  IconTools,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { SPACE_COLORS } from "@/lib/space-color.ts";
import {
  removeSpaceIcon,
  uploadSpaceIcon,
} from "@/features/attachments/services/attachment-service.ts";

export interface SpaceIconDef {
  /** Tabler icon name (kebab-case, without the "icon-" prefix). */
  name: string;
  /** Words used by the picker search. */
  keywords: string;
  Icon: Icon;
}

/** Curated glyphs that suit team spaces. */
export const SPACE_ICONS: SpaceIconDef[] = [
  { name: "rocket", keywords: "launch product startup", Icon: IconRocket },
  { name: "code", keywords: "engineering development software", Icon: IconCode },
  { name: "cpu", keywords: "hardware chip compute", Icon: IconCpu },
  { name: "brain", keywords: "ai research ml intelligence", Icon: IconBrain },
  { name: "network", keywords: "infrastructure it", Icon: IconNetwork },
  { name: "server", keywords: "devops infrastructure hosting", Icon: IconServer },
  { name: "database", keywords: "data storage", Icon: IconDatabase },
  { name: "palette", keywords: "design colour art", Icon: IconPalette },
  { name: "brush", keywords: "design creative paint", Icon: IconBrush },
  { name: "speakerphone", keywords: "marketing announcements", Icon: IconSpeakerphone },
  { name: "chart-bar", keywords: "analytics sales finance reports", Icon: IconChartBar },
  { name: "users", keywords: "team people hr", Icon: IconUsers },
  { name: "briefcase", keywords: "business management office", Icon: IconBriefcase },
  { name: "book", keywords: "docs handbook guide", Icon: IconBook },
  { name: "school", keywords: "training learning onboarding", Icon: IconSchool },
  { name: "lifebuoy", keywords: "help support", Icon: IconLifebuoy },
  { name: "headset", keywords: "support customer service", Icon: IconHeadset },
  { name: "building", keywords: "company office organisation", Icon: IconBuilding },
  { name: "home", keywords: "general house", Icon: IconHome },
  { name: "armchair", keywords: "interior furniture room", Icon: IconArmchair },
  { name: "cube", keywords: "3d product model", Icon: IconCube },
  { name: "box", keywords: "package product shipping", Icon: IconBox },
  { name: "git-branch", keywords: "version source repository", Icon: IconGitBranch },
  { name: "world", keywords: "global web international", Icon: IconWorld },
  { name: "map", keywords: "roadmap location plan", Icon: IconMap },
  { name: "camera", keywords: "photo media", Icon: IconCamera },
  { name: "movie", keywords: "video media film", Icon: IconMovie },
  { name: "music", keywords: "audio sound", Icon: IconMusic },
  { name: "flask", keywords: "lab experiment research science", Icon: IconFlask },
  { name: "bulb", keywords: "ideas innovation", Icon: IconBulb },
  { name: "shield-lock", keywords: "security privacy", Icon: IconShieldLock },
  { name: "tools", keywords: "operations maintenance utilities", Icon: IconTools },
  { name: "layout-grid", keywords: "rug pattern tiles", Icon: IconLayoutGrid },
  { name: "texture", keywords: "rug textile weave carpet", Icon: IconTexture },
  { name: "grid-dots", keywords: "rug pattern knots", Icon: IconGridDots },
  { name: "archive", keywords: "old storage history", Icon: IconArchive },
  { name: "notebook", keywords: "notes journal", Icon: IconNotebook },
  { name: "leaf", keywords: "nature sustainability green", Icon: IconLeaf },
  { name: "mountain", keywords: "nepal himalaya outdoors", Icon: IconMountain },
];

/** The 8 muted space hues (same palette as lib/space-color.ts). */
export const SPACE_ICON_HUES: { name: string; hex: string }[] = SPACE_COLORS.map(
  (c) => ({ name: c.name, hex: c.base }),
);

export function getSpaceIconDef(name: string): SpaceIconDef | undefined {
  return SPACE_ICONS.find((i) => i.name === name);
}

export function randomSpaceIcon(): { icon: string; hex: string } {
  const icon = SPACE_ICONS[Math.floor(Math.random() * SPACE_ICONS.length)];
  const hue =
    SPACE_ICON_HUES[Math.floor(Math.random() * SPACE_ICON_HUES.length)];
  return { icon: icon.name, hex: hue.hex };
}

// Visual spec, shared with the batch script for existing spaces:
// 256x256, rounded square r=56 filled with the hue, white outline glyph
// 136x136 centred, stroke width 1.75, no shadow or gradient.
const CANVAS = 256;
const RADIUS = 56;
const GLYPH = 136;
const STROKE = 1.75;

/** Builds the space icon as a standalone SVG document string. */
export function buildSpaceIconSvg(iconName: string, hex: string): string {
  const def = getSpaceIconDef(iconName) ?? SPACE_ICONS[0];
  const offset = (CANVAS - GLYPH) / 2;
  const glyph = renderToStaticMarkup(
    createElement(def.Icon, {
      size: GLYPH,
      stroke: STROKE,
      color: "#ffffff",
    }),
  ).replace("<svg", `<svg x="${offset}" y="${offset}"`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<rect width="${CANVAS}" height="${CANVAS}" rx="${RADIUS}" ry="${RADIUS}" fill="${hex}"/>` +
    glyph +
    `</svg>`
  );
}

/** Renders the space icon to a 256x256 PNG. */
export function renderSpaceIconPng(iconName: string, hex: string): Promise<Blob> {
  const svg = buildSpaceIconSvg(iconName, hex);
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS;
        canvas.height = CANVAS;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        ctx.drawImage(img, 0, 0, CANVAS, CANVAS);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("PNG encoding failed"));
        }, "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load space icon SVG"));
    };
    img.src = url;
  });
}

/** Renders the icon and stores it as the space logo (existing upload endpoint). */
export async function saveSpaceIcon(
  spaceId: string,
  iconName: string,
  hex: string,
): Promise<void> {
  const blob = await renderSpaceIconPng(iconName, hex);
  const file = new File([blob], `space-icon-${iconName}.png`, {
    type: "image/png",
  });
  await uploadSpaceIcon(file, spaceId);
}

/** Gives a space a random icon + hue. */
export async function assignRandomSpaceIcon(spaceId: string): Promise<void> {
  const { icon, hex } = randomSpaceIcon();
  await saveSpaceIcon(spaceId, icon, hex);
}

export { uploadSpaceIcon, removeSpaceIcon };
