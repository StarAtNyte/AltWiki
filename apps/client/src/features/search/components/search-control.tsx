import { IconSearch } from "@tabler/icons-react";
import cx from "clsx";
import {
  ActionIcon,
  BoxProps,
  ElementProps,
  Group,
  rem,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import classes from "./search-control.module.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { platformModifierLabel } from "@/lib";

interface SearchControlProps extends BoxProps, ElementProps<"button"> {
  /** "pill": 44px glass pill used in the app header. */
  variant?: "default" | "pill";
}

export function SearchControl({
  className,
  variant = "default",
  ...others
}: SearchControlProps) {
  const { t } = useTranslation();

  if (variant === "pill") {
    return (
      <UnstyledButton
        {...others}
        className={cx(classes.pill, className)}
        aria-label={t("Search")}
      >
        <IconSearch size={18} stroke={1.6} className={classes.pillIcon} />
        <span className={classes.pillText}>{t("Search anything…")}</span>
        <span className={classes.pillKbd}>Ctrl + K</span>
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton {...others} className={cx(classes.root, className)}>
      <Group gap="xs" wrap="nowrap">
        <IconSearch style={{ width: rem(15), height: rem(15) }} stroke={1.5} />
        <Text fz="sm" c="dimmed" pr={80}>
          {t("Search")}
        </Text>
        <Text fw={700} className={classes.shortcut}>
          {platformModifierLabel} + K
        </Text>
      </Group>
    </UnstyledButton>
  );
}

interface SearchMobileControlProps {
  onSearch: () => void;
}

export function SearchMobileControl({ onSearch }: SearchMobileControlProps) {
  const { t } = useTranslation();

  return (
    <Tooltip label={t("Search")} withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        c="var(--app-ink, inherit)"
        onClick={onSearch}
        size="md"
        aria-label={t("Search")}
      >
        <IconSearch size={20} stroke={2} />
      </ActionIcon>
    </Tooltip>
  );
}
