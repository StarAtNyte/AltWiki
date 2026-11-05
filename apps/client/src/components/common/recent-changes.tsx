import React from "react";
import { Skeleton, Text, Tooltip } from "@mantine/core";
import { Link } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { formattedDate, timeAgo } from "@/lib/time.ts";
import { useRecentChangesQuery } from "@/features/page/queries/page-query.ts";
import { IconClock, IconFileText, IconFiles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getSpaceColor } from "@/lib/space-color.ts";
import classes from "./recent-changes.module.css";

interface Props {
  spaceId?: string;
  limit?: number;
  emptyHint?: React.ReactNode;
}

export default function RecentChanges({ spaceId, limit, emptyHint }: Props) {
  const { t } = useTranslation();
  const { data: pages, isLoading, isError } = useRecentChangesQuery(spaceId);

  if (isLoading) {
    return (
      <ul className={classes.list}>
        {Array.from({ length: Math.min(limit ?? 5, 6) }).map((_, i) => (
          <li key={i} className={classes.skeletonRow}>
            <Skeleton height={16} width={16} radius="sm" />
            <Skeleton height={12} width={`${60 - i * 6}%`} radius="sm" />
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <Text c="dimmed" size="sm" ta="center" p="lg">
        {t("Failed to fetch recent pages")}
      </Text>
    );
  }

  const items = (pages?.items ?? []).slice(0, limit ?? undefined);

  if (items.length === 0) {
    return (
      <div className={classes.empty}>
        <span className={classes.emptyIcon}>
          <IconFiles size={18} stroke={1.5} />
        </span>
        <Text size="sm" fw={500}>
          {t("No pages yet")}
        </Text>
        {emptyHint && (
          <Text size="xs" c="dimmed" ta="center" maw={260}>
            {emptyHint}
          </Text>
        )}
      </div>
    );
  }

  return (
    <ul className={classes.list}>
      {items.map((page) => {
        const color = page?.space?.name ? getSpaceColor(page.space) : null;
        return (
          <li key={page.id}>
            <Link
              to={buildPageUrl(page?.space?.slug, page.slugId, page.title)}
              className={classes.row}
            >
              <span className={classes.icon} aria-hidden>
                {page.icon || <IconFileText size={18} stroke={1.5} />}
              </span>
              <span className={classes.body}>
                <span className={classes.title}>
                  {page.title || t("Untitled")}
                </span>
                {!spaceId && color && (
                  <span
                    className={classes.tag}
                    style={{ background: color.tagBg, color: color.tagText }}
                  >
                    {page.space.name}
                  </span>
                )}
                {spaceId && page.lastUpdatedBy?.name && (
                  <span className={classes.author}>
                    {page.lastUpdatedBy.name}
                  </span>
                )}
              </span>
              <Tooltip
                label={formattedDate(new Date(page.updatedAt))}
                openDelay={400}
                withArrow
              >
                <span className={classes.time}>
                  <IconClock size={14} stroke={1.6} />
                  {timeAgo(page.updatedAt)}
                </span>
              </Tooltip>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
