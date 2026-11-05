import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Group,
  Modal,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowsShuffle,
  IconCheck,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { getSpaceColor } from "@/lib/space-color.ts";
import {
  SPACE_ICONS,
  SPACE_ICON_HUES,
  getSpaceIconDef,
  randomSpaceIcon,
  removeSpaceIcon,
  saveSpaceIcon,
  uploadSpaceIcon,
} from "./space-icons.ts";
import classes from "./space-icon-picker.module.css";

interface SpaceIconPickerProps {
  opened: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
  hasLogo?: boolean;
}

type Busy = null | "save" | "upload" | "remove";

export function SpaceIconPicker({
  opened,
  onClose,
  spaceId,
  spaceName,
  hasLogo,
}: SpaceIconPickerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [icon, setIcon] = useState(SPACE_ICONS[0].name);
  const [hex, setHex] = useState(getSpaceColor(spaceName).base);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Busy>(null);

  // Fresh state each time the picker opens.
  useEffect(() => {
    if (opened) {
      setHex(getSpaceColor(spaceName).base);
      setIcon(SPACE_ICONS[0].name);
      setQuery("");
    }
  }, [opened, spaceName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SPACE_ICONS;
    return SPACE_ICONS.filter(
      (i) => i.name.includes(q) || i.keywords.includes(q),
    );
  }, [query]);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      predicate: (item) =>
        ["spaces", "space"].includes(item.queryKey[0] as string),
    });
  };

  const run = async (kind: Busy, fn: () => Promise<void>, ok: string) => {
    setBusy(kind);
    try {
      await fn();
      await refresh();
      notifications.show({ message: ok });
      onClose();
    } catch (err: any) {
      notifications.show({
        message:
          err?.response?.data?.message || t("Failed to update space icon"),
        color: "red",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleSave = () =>
    run("save", () => saveSpaceIcon(spaceId, icon, hex), t("Space icon updated"));

  const handleRemove = () =>
    run("remove", () => removeSpaceIcon(spaceId), t("Space icon removed"));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    run(
      "upload",
      async () => {
        await uploadSpaceIcon(file, spaceId);
      },
      t("Space icon updated"),
    );
  };

  const shuffle = () => {
    const r = randomSpaceIcon();
    setIcon(r.icon);
    setHex(r.hex);
  };

  const Preview = (getSpaceIconDef(icon) ?? SPACE_ICONS[0]).Icon;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Space icon")}
      size={560}
      radius={18}
      classNames={{
        content: classes.content,
        header: classes.header,
        overlay: classes.overlay,
      }}
    >
      <div className={classes.top}>
        <span
          className={classes.preview}
          style={{ background: hex }}
          aria-label={t("Preview")}
        >
          <Preview size={34} stroke={1.75} color="#fff" />
        </span>
        <div className={classes.topBody}>
          <div className={classes.spaceName}>{spaceName}</div>
          <div className={classes.swatches} role="radiogroup">
            {SPACE_ICON_HUES.map((h) => (
              <Tooltip key={h.name} label={h.name} openDelay={300}>
                <UnstyledButton
                  role="radio"
                  aria-checked={hex === h.hex}
                  aria-label={h.name}
                  className={classes.swatch}
                  data-active={hex === h.hex || undefined}
                  style={{ background: h.hex }}
                  onClick={() => setHex(h.hex)}
                >
                  {hex === h.hex && (
                    <IconCheck size={14} stroke={2} color="#fff" />
                  )}
                </UnstyledButton>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      <TextInput
        className={classes.search}
        placeholder={t("Search icons")}
        leftSection={<IconSearch size={16} stroke={1.5} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        radius="xl"
        data-autofocus
      />

      <div className={classes.grid}>
        {filtered.map(({ name, Icon }) => (
          <Tooltip key={name} label={name} openDelay={400}>
            <UnstyledButton
              className={classes.cell}
              data-active={icon === name || undefined}
              aria-label={name}
              aria-pressed={icon === name}
              onClick={() => setIcon(name)}
            >
              <Icon size={22} stroke={1.6} />
            </UnstyledButton>
          </Tooltip>
        ))}
        {filtered.length === 0 && (
          <div className={classes.empty}>{t("No icons found")}</div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        hidden
        onChange={handleFile}
      />

      <Group justify="space-between" mt="lg" gap="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="default"
            size="sm"
            leftSection={<IconArrowsShuffle size={16} stroke={1.5} />}
            onClick={shuffle}
            disabled={!!busy}
          >
            {t("Shuffle")}
          </Button>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconUpload size={16} stroke={1.5} />}
            onClick={() => fileRef.current?.click()}
            loading={busy === "upload"}
            disabled={!!busy && busy !== "upload"}
          >
            {t("Upload image")}
          </Button>
          {hasLogo && (
            <Button
              variant="subtle"
              color="red"
              size="sm"
              leftSection={<IconTrash size={16} stroke={1.5} />}
              onClick={handleRemove}
              loading={busy === "remove"}
              disabled={!!busy && busy !== "remove"}
            >
              {t("Remove icon")}
            </Button>
          )}
        </Group>
        <Button
          size="sm"
          color="dark"
          onClick={handleSave}
          loading={busy === "save"}
          disabled={!!busy && busy !== "save"}
        >
          {t("Save")}
        </Button>
      </Group>
    </Modal>
  );
}
