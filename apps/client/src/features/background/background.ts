import { atom, useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { notifications } from "@mantine/notifications";
import i18n from "@/i18n";
import { userAtom } from "@/features/user/atoms/current-user-atom.ts";

/**
 * Per-user background preference (only that user sees it). Stored in
 * localStorage under `altwiki.background.<userId>`; no server round-trip.
 */

export type BackgroundPresetId =
  | "ridge"
  | "lake"
  | "terraces"
  | "trail"
  | "plain"
  | "custom";

export interface BackgroundPreset {
  id: Exclude<BackgroundPresetId, "custom">;
  label: string;
  image?: string;
  thumb?: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "ridge",
    label: "Misty ridge",
    image: "/backgrounds/ridge.jpg",
    thumb: "/backgrounds/ridge-thumb.jpg",
  },
  {
    id: "lake",
    label: "Lake",
    image: "/backgrounds/lake.jpg",
    thumb: "/backgrounds/lake-thumb.jpg",
  },
  {
    id: "terraces",
    label: "Terraces",
    image: "/backgrounds/terraces.jpg",
    thumb: "/backgrounds/terraces-thumb.jpg",
  },
  {
    id: "trail",
    label: "Dawn trail",
    image: "/backgrounds/trail.jpg",
    thumb: "/backgrounds/trail-thumb.jpg",
  },
  { id: "plain", label: "Plain" },
];

export interface BackgroundPref {
  preset: BackgroundPresetId;
  /** Extra wash from the "Dim photo" slider, 0 - 0.7. */
  dim: number;
  /** Uploaded image as a downscaled JPEG data URL. */
  custom?: string;
}

export const DEFAULT_BACKGROUND: BackgroundPref = { preset: "ridge", dim: 0 };
export const MAX_DIM = 0.7;

const storageKey = (userId: string) => `altwiki.background.${userId}`;

export function loadBackground(userId?: string | null): BackgroundPref {
  if (!userId) return DEFAULT_BACKGROUND;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_BACKGROUND;
    const parsed = JSON.parse(raw) as Partial<BackgroundPref>;
    const preset = parsed.preset ?? "ridge";
    const known =
      preset === "custom"
        ? !!parsed.custom
        : BACKGROUND_PRESETS.some((p) => p.id === preset);
    return {
      preset: known ? preset : "ridge",
      dim: Math.min(MAX_DIM, Math.max(0, Number(parsed.dim) || 0)),
      custom: parsed.custom,
    };
  } catch {
    return DEFAULT_BACKGROUND;
  }
}

/** Returns false (and tells the user) when the browser refuses to store it. */
function saveBackground(userId: string, pref: BackgroundPref): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(pref));
    return true;
  } catch {
    notifications.show({
      color: "red",
      title: i18n.t("Background not saved"),
      message: i18n.t(
        "Your browser storage is full. The image is applied for now but will reset on reload. Try a smaller image.",
      ),
    });
    return false;
  }
}

/** Image URL for the active preference, or null for the plain background. */
export function backgroundImage(pref: BackgroundPref): string | null {
  if (pref.preset === "custom") return pref.custom ?? null;
  return BACKGROUND_PRESETS.find((p) => p.id === pref.preset)?.image ?? null;
}

export const backgroundAtom = atom<BackgroundPref>(DEFAULT_BACKGROUND);
/** Which user the atom was loaded for (so a user switch reloads it). */
export const backgroundOwnerAtom = atom<string>("");
/** Opens the background picker modal (used by the workspace menu). */
export const backgroundModalAtom = atom<boolean>(false);

export function useBackground() {
  const user = useAtomValue(userAtom);
  const [pref, setPref] = useAtom(backgroundAtom);

  const update = useCallback(
    (patch: Partial<BackgroundPref>) => {
      setPref((prev) => {
        const next = { ...prev, ...patch };
        if (user?.id) saveBackground(user.id, next);
        return next;
      });
    },
    [setPref, user?.id],
  );

  return { pref, update };
}

/**
 * Downscale an image file to at most 1920px on the long edge and re-encode as
 * JPEG (~0.8) so it fits comfortably in localStorage.
 */
export function downscaleImage(
  file: File,
  maxSize = 1920,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unreadable image"));
    };
    img.src = url;
  });
}
