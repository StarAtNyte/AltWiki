import React, { useRef, useState } from "react";
import {
  Loader,
  Modal,
  Popover,
  Slider,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconPhoto, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import clsx from "clsx";
import {
  BACKGROUND_PRESETS,
  backgroundModalAtom,
  downscaleImage,
  MAX_DIM,
  useBackground,
} from "@/features/background/background.ts";
import classes from "./background-picker.module.css";

/** The picker body: preset grid, upload tile and the dim slider. */
export function BackgroundPickerPanel({ withHeader = true }: { withHeader?: boolean }) {
  const { t } = useTranslation();
  const { pref, update } = useBackground();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notifications.show({ color: "red", message: t("Please choose an image file.") });
      return;
    }
    setBusy(true);
    try {
      const custom = await downscaleImage(file);
      update({ preset: "custom", custom });
    } catch {
      notifications.show({ color: "red", message: t("That image could not be read.") });
    } finally {
      setBusy(false);
    }
  };

  const isPlain = pref.preset === "plain";
  const customActive = pref.preset === "custom";

  return (
    <div className={classes.panel}>
      {withHeader && (
        <div className={classes.head}>
          <span className={classes.title}>{t("Background")}</span>
          <span className={classes.note}>{t("Only you see this")}</span>
        </div>
      )}

      <div className={classes.grid} role="radiogroup" aria-label={t("Background")}>
        {BACKGROUND_PRESETS.map((p) => {
          const active = pref.preset === p.id;
          return (
            <UnstyledButton
              key={p.id}
              className={classes.tile}
              data-active={active || undefined}
              role="radio"
              aria-checked={active}
              onClick={() => update({ preset: p.id })}
            >
              <span
                className={clsx(classes.thumb, !p.thumb && classes.plainThumb)}
                style={p.thumb ? { backgroundImage: `url("${p.thumb}")` } : undefined}
              />
              <span className={classes.label}>{t(p.label)}</span>
            </UnstyledButton>
          );
        })}

        <Tooltip
          label={customActive ? t("Choose another image") : t("Use your image")}
          openDelay={400}
          disabled={!pref.custom}
        >
          <UnstyledButton
            className={classes.tile}
            data-active={customActive || undefined}
            role="radio"
            aria-checked={customActive}
            onClick={() => {
              if (pref.custom && !customActive) update({ preset: "custom" });
              else fileRef.current?.click();
            }}
          >
            {pref.custom ? (
              <span
                className={classes.thumb}
                style={{ backgroundImage: `url("${pref.custom}")` }}
              />
            ) : (
              <span className={clsx(classes.thumb, classes.uploadThumb)}>
                {busy ? <Loader size={16} color="gray" /> : <IconUpload size={18} stroke={1.6} />}
              </span>
            )}
            <span className={classes.label}>
              {pref.custom ? t("Your image") : t("Upload")}
            </span>
          </UnstyledButton>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onFile}
        />
      </div>

      <div className={classes.dim} data-disabled={isPlain || undefined}>
        <span>{t("Dim photo")}</span>
        <Slider
          className={classes.slider}
          classNames={{
            track: classes.sliderTrack,
            bar: classes.sliderBar,
            thumb: classes.sliderThumb,
          }}
          size={4}
          thumbSize={14}
          min={0}
          max={Math.round(MAX_DIM * 100)}
          step={5}
          value={Math.round(pref.dim * 100)}
          onChange={(v) => update({ dim: v / 100 })}
          label={(v) => `${v}%`}
          disabled={isPlain}
          aria-label={t("Dim photo")}
        />
      </div>
    </div>
  );
}

/** Pill button + popover, used next to the home greeting. */
export function BackgroundPickerButton() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 36em)");
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      offset={8}
      width={isMobile ? "calc(100vw - 32px)" : 320}
      classNames={{ dropdown: classes.dropdown }}
      radius={14}
    >
      <Popover.Target>
        <UnstyledButton
          className={classes.button}
          onClick={() => setOpened((o) => !o)}
          aria-expanded={opened}
        >
          <IconPhoto size={16} stroke={1.6} className={classes.buttonIcon} />
          <span>{t("Background")}</span>
          <IconChevronDown size={14} stroke={1.6} className={classes.buttonChevron} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <BackgroundPickerPanel />
      </Popover.Dropdown>
    </Popover>
  );
}

/** Same picker in a modal, opened from the workspace menu on any page. */
export function BackgroundPickerModal() {
  const { t } = useTranslation();
  const [opened, setOpened] = useAtom(backgroundModalAtom);

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={
        <span className={classes.modalTitle}>
          {t("Background")}
          <span className={classes.note}>{t("Only you see this")}</span>
        </span>
      }
      size={360}
      centered
      classNames={{ title: classes.modalTitleRoot }}
    >
      <BackgroundPickerPanel withHeader={false} />
    </Modal>
  );
}
