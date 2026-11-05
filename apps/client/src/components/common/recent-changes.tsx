import React from "react";
import { Button, Skeleton, Text, Tooltip } from "@mantine/core";
import { Link } from "react-router-dom";
import { buildPageUrl, getPageTitle } from "@/features/page/page.utils.ts";
import { formattedDate, timeAgo } from "@/lib/time.ts";
import { useRecentChangesQuery } from "@/features/page/queries/page-query.ts";
import { IconClock, IconFileText, IconFiles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getSpaceColor } from "@/lib/space-color.ts";
import classes from "./recent-changes.module.css";

export interface GlassPageItem {
  key: string;
  slugId: string;
  title?: string;
  icon?: string;
  isBase?: boolean;
  space?: { id?: string; name?: string; slug?: string; logo?: string };
  author?: string;
  date: string | Date;
}

interface GlassPageListProps {
  items: GlassPageItem[];
  isLoading?: boolean;
  isError?: boolean;
  errorText?: string;
  showSpace?: boolean;
  limit?: number;
  emptyTitle?: string;
  emptyHint?: React.ReactNode;
  emptyIcon?: React.ComponentType<{ size?: number; stroke?: number }>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

/** Page rows in the alpine glass style (home / space overview panels). */
export function GlassPageList({
  items: allItems,
  isLoading,
  isError,
  errorText,
  showSpace,
  limit,
  emptyTitle,
  emptyHint,
  emptyIcon: EmptyIcon = IconFiles,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: GlassPageListProps) {
  const { t } = useTranslation();

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
        {errorText ?? t("Failed to fetch recent pages")}
      </Text>
    );
  }

  const items = limit ? allItems.slice(0, limit) : allItems;

  if (items.length === 0) {
    return (
      <div className={classes.empty}>
        <span className={classes.emptyIcon}>
          <EmptyIcon size={18} stroke={1.5} />
        </span>
        <Text size="sm" fw={500}>
          {emptyTitle ?? t("No pages yet")}
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
    <>
      <ul className={classes.list}>
        {items.map((page) => {
          const color =
            showSpace && page.space?.name ? getSpaceColor(page.space as any) : null;
          return (
            <li key={page.key}>
              <Link
                to={buildPageUrl(page.space?.slug, page.slugId, page.title)}
                className={classes.row}
              >
                <span className={classes.icon} aria-hidden>
                  {page.icon || <IconFileText size={18} stroke={1.5} />}
                </span>
                <span className={classes.body}>
                  <span className={classes.title}>
                    {getPageTitle(page.title, page.isBase, t)}
                  </span>
                  {color && (
                    <span
                      className={classes.tag}
                      style={{ background: color.tagBg, color: color.tagText }}
                    >
                      {page.space.name}
                    </span>
                  )}
                  {!showSpace && page.author && (
                    <span className={classes.author}>{page.author}</span>
                  )}
                </span>
                <Tooltip
                  label={formattedDate(new Date(page.date))}
                  openDelay={400}
                  withArrow
                >
                  <span className={classes.time}>
                    <IconClock size={14} stroke={1.6} />
                    {timeAgo(page.date as any)}
                  </span>
                </Tooltip>
              </Link>
            </li>
          );
        })}
      </ul>
      {!limit && hasNextPage && onLoadMore && (
        <Button
          variant="subtle"
          color="gray"
          fullWidth
          mt="sm"
          onClick={onLoadMore}
          loading={isFetchingNextPage}
        >
          {t("Load more")}
        </Button>
      )}
    </>
  );
}

interface Props {
  spaceId?: string;
  limit?: number;
  emptyHint?: React.ReactNode;
}

export default function RecentChanges({ spaceId, limit, emptyHint }: Props) {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useRecentChangesQuery(spaceId);
  const pages = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <GlassPageList
      items={pages.map((page) => ({
        key: page.id,
        slugId: page.slugId,
        title: page.title,
        icon: page.icon,
        isBase: page.isBase,
        space: page.space,
        author: page.lastUpdatedBy?.name,
        date: page.updatedAt,
      }))}
      isLoading={isLoading}
      isError={isError}
      showSpace={!spaceId}
      limit={limit}
      emptyHint={emptyHint}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
    />
  );
}
