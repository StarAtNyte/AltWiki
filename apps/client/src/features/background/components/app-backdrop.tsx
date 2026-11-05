import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { userAtom } from "@/features/user/atoms/current-user-atom.ts";
import {
  backgroundAtom,
  backgroundImage,
  backgroundOwnerAtom,
  loadBackground,
} from "@/features/background/background.ts";

/** Remembered across sessions so index.html can preload it before JS runs. */
const LAST_BG_KEY = "altwiki.background.last";

/**
 * Loads the current user's background preference, publishes it as CSS
 * variables on <html> (so the drawer and portals can use it) and paints the
 * single fixed, full-bleed backdrop behind the whole shell. Without a
 * signed-in user (auth pages) it shows the default preset.
 */
export function AppBackdrop() {
  const user = useAtomValue(userAtom);
  const [pref, setPref] = useAtom(backgroundAtom);
  const [owner, setOwner] = useAtom(backgroundOwnerAtom);

  useEffect(() => {
    const id = user?.id ?? "";
    if (id !== owner) {
      setPref(loadBackground(id || null));
      setOwner(id);
    }
  }, [user?.id, owner, setPref, setOwner]);

  const image = backgroundImage(pref);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--app-bg-image",
      image ? `url("${image}")` : "none",
    );
    root.style.setProperty("--app-bg-wash", image ? "1" : "0");
    root.style.setProperty("--app-bg-dim", String(image ? pref.dim : 0));
    root.dataset.appBg = image ? "photo" : "plain";
  }, [image, pref.dim]);

  useEffect(() => {
    // Only real URLs (not uploaded data: images) are worth preloading.
    try {
      localStorage.setItem(
        LAST_BG_KEY,
        image && !image.startsWith("data:") ? image : "none",
      );
    } catch {
      // storage full / disabled: preloading is only an optimisation
    }
  }, [image]);

  useEffect(
    () => () => {
      const root = document.documentElement;
      ["--app-bg-image", "--app-bg-wash", "--app-bg-dim"].forEach((v) =>
        root.style.removeProperty(v),
      );
      delete root.dataset.appBg;
    },
    [],
  );

  return (
    <div className="app-backdrop" aria-hidden>
      {image && (
        <img
          key={image}
          src={image}
          alt=""
          decoding="async"
          draggable={false}
        />
      )}
    </div>
  );
}
