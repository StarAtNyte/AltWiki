import { Button, Skeleton, Text } from "@mantine/core";
import React from "react";
import {
  prefetchSpace,
  useGetSpacesQuery,
  useJoinSpaceMutation,
} from "@/features/space/queries/space-query.ts";
import { getSpaceUrl } from "@/lib/config.ts";
import { Link } from "react-router-dom";
import classes from "./space-grid.module.css";
import homeClasses from "@/features/home/components/home.module.css";
import { formatMemberCount } from "@/lib";
import { useTranslation } from "react-i18next";
import {
  IconArrowRight,
  IconChevronRight,
  IconLayoutGrid,
} from "@tabler/icons-react";
import clsx from "clsx";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import { partitionArchivedSpaces } from "@/features/space/utils/archived-space.ts";
import ArchivedSection from "@/features/space/components/archived-section.tsx";
import { ISpace } from "@/features/space/types/space.types.ts";

export default function SpaceGrid() {
  const { t } = useTranslation();
  // Same key as the rail (space-rail.tsx): one shared request.
  const { data, isLoading } = useGetSpacesQuery({ page: 1, limit: 100 });
  const joinSpace = useJoinSpaceMutation();
  const { active, archived } = partitionArchivedSpaces<ISpace>(data?.items);

  const renderCard = (space: ISpace) => (
    <Link
      key={space.id}
      to={getSpaceUrl(space.slug)}
      onMouseEnter={() => prefetchSpace(space.slug, space.id)}
      className={classes.card}
    >
      <span className={classes.cardTop}>
        <SpaceAvatar
          name={space.name}
          logo={space.logo}
          size={32}
          radius={8}
        />
        {space.isMember === false ? (
          <Button
            size="compact-xs"
            variant="default"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              joinSpace.mutate(space.id);
            }}
          >
            {t("Join")}
          </Button>
        ) : (
          <IconChevronRight size={16} stroke={1.6} className={classes.chevron} />
        )}
      </span>
      <span className={classes.body}>
        <span className={classes.title}>{space.name}</span>
        <span className={classes.meta}>
          {typeof space.memberCount === "number"
            ? formatMemberCount(space.memberCount, t)
            : t("Space")}
        </span>
      </span>
    </Link>
  );

  return (
    <section className={clsx(homeClasses.glass, homeClasses.spaces)}>
      <div className={homeClasses.panelHead}>
        <h2 className={homeClasses.panelTitle}>
          <IconLayoutGrid size={18} stroke={1.6} className={homeClasses.panelIcon} />
          {t("Spaces")}
          {!isLoading && (
            <span className={homeClasses.count}>{active.length}</span>
          )}
        </h2>
        <Link to="/spaces" className={homeClasses.link}>
          {t("View all spaces")}
          <IconArrowRight size={14} stroke={1.75} />
        </Link>
      </div>

      <div className={classes.grid}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={104} radius={14} />
            ))
          : active.slice(0, 10).map(renderCard)}
      </div>

      {!isLoading && active.length === 0 && (
        <div className={classes.empty}>
          <Text size="sm" fw={500}>
            {t("No spaces yet")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("Spaces you join will appear here.")}
          </Text>
        </div>
      )}

      <ArchivedSection count={archived.length}>
        <div className={classes.grid}>{archived.map(renderCard)}</div>
      </ArchivedSection>
    </section>
  );
}
