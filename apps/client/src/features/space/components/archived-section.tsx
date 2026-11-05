import React from "react";
import { Badge, Collapse, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArchive, IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./archived-section.module.css";

interface ArchivedSectionProps {
  count: number;
  children: React.ReactNode;
  defaultOpened?: boolean;
}

export default function ArchivedSection({
  count,
  children,
  defaultOpened = false,
}: ArchivedSectionProps) {
  const { t } = useTranslation();
  const [opened, { toggle }] = useDisclosure(defaultOpened);

  if (count === 0) return null;

  return (
    <div className={classes.root}>
      <UnstyledButton
        className={classes.toggle}
        onClick={toggle}
        aria-expanded={opened}
      >
        <IconChevronRight
          size={14}
          className={classes.chevron}
          data-opened={opened || undefined}
        />
        <IconArchive size={15} className={classes.icon} />
        <span>{t("Archived")}</span>
        <Badge size="xs" variant="light" color="gray" circle={count < 10}>
          {count}
        </Badge>
      </UnstyledButton>

      <Collapse in={opened}>
        <div className={classes.content}>{children}</div>
      </Collapse>
    </div>
  );
}
