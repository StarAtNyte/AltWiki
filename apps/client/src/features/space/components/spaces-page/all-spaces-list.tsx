import {
  ActionIcon,
  Button,
  Menu,
  Skeleton,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconChevronRight,
  IconDots,
  IconLayoutGrid,
  IconSearch,
  IconSettings,
  IconUserPlus,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import clsx from "clsx";
import { formatMemberCount } from "@/lib";
import { getSpaceUrl } from "@/lib/config";
import {
  prefetchSpace,
  useJoinSpaceMutation,
} from "@/features/space/queries/space-query";
import Paginate from "@/components/common/paginate";
import SpaceSettingsModal from "@/features/space/components/settings-modal";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import { partitionArchivedSpaces } from "@/features/space/utils/archived-space.ts";
import ArchivedSection from "@/features/space/components/archived-section.tsx";
import homeClasses from "@/features/home/components/home.module.css";
import classes from "./all-spaces-list.module.css";

interface AllSpacesListProps {
  spaces: any[];
  isLoading?: boolean;
  onSearch: (query: string) => void;
  page: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  onPageChange: (page: number) => void;
}

export default function AllSpacesList({
  spaces,
  isLoading,
  onSearch,
  page,
  hasPrevPage,
  hasNextPage,
  onPageChange,
}: AllSpacesListProps) {
  const { t } = useTranslation();
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const joinSpace = useJoinSpaceMutation();
  const [value, setValue] = useState("");
  const [query] = useDebouncedValue(value, 500);
  const { active, archived } = partitionArchivedSpaces(spaces);

  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  const handleOpenSettings = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    openSettings();
  };

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const renderCard = (space: any) => (
    <Link
      key={space.id}
      to={getSpaceUrl(space.slug)}
      onMouseEnter={() => prefetchSpace(space.slug, space.id)}
      className={classes.card}
    >
      <span className={classes.cardTop}>
        <SpaceAvatar name={space.name} logo={space.logo} size={36} />
        {space.isMember ? (
          <span className={classes.cardActions}>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={t("Space menu")}
                  onClick={stop}
                >
                  <IconDots size={16} stroke={1.6} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={(e) => {
                    stop(e);
                    handleOpenSettings(space.id);
                  }}
                >
                  {t("Space settings")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <IconChevronRight
              size={16}
              stroke={1.6}
              className={classes.chevron}
            />
          </span>
        ) : (
          <Button
            size="compact-xs"
            variant="default"
            leftSection={<IconUserPlus size={13} stroke={1.6} />}
            onClick={(e) => {
              stop(e);
              joinSpace.mutate(space.id);
            }}
          >
            {t("Join")}
          </Button>
        )}
      </span>
      <span className={classes.body}>
        <span className={classes.title} title={space.name}>
          {space.name}
        </span>
        <span className={classes.description} title={space.description || ""}>
          {space.description || t("No description")}
        </span>
        <span className={classes.meta}>
          {typeof space.memberCount === "number"
            ? formatMemberCount(space.memberCount, t)
            : t("Space")}
        </span>
      </span>
    </Link>
  );

  return (
    <>
      <div className={clsx(homeClasses.glass, classes.toolbar)}>
        <TextInput
          className={classes.search}
          classNames={{ input: classes.searchInput }}
          placeholder={t("Search spaces")}
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          radius="xl"
          aria-label={t("Search spaces")}
        />
      </div>

      <section className={clsx(homeClasses.glass, classes.panel)}>
        <div className={classes.panelHead}>
          <h2 className={homeClasses.panelTitle}>
            <IconLayoutGrid
              size={18}
              stroke={1.6}
              className={homeClasses.panelIcon}
            />
            {query ? t("Results") : t("All spaces")}
            {!isLoading && (
              <span className={homeClasses.count}>{active.length}</span>
            )}
          </h2>
        </div>

        <div className={classes.grid}>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} height={148} radius={14} />
              ))
            : active.map(renderCard)}
        </div>

        {!isLoading && active.length === 0 && (
          <div className={classes.empty}>
            <Text size="sm" fw={500}>
              {query ? t("No results found...") : t("No spaces yet")}
            </Text>
          </div>
        )}

        <ArchivedSection
          key={query ? "search" : "browse"}
          count={archived.length}
          defaultOpened={!!query}
        >
          <div className={classes.grid}>{archived.map(renderCard)}</div>
        </ArchivedSection>

        {spaces.length > 0 && (
          <Paginate
            currentPage={page}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            onPageChange={onPageChange}
          />
        )}
      </section>

      {selectedSpaceId && (
        <SpaceSettingsModal
          spaceId={selectedSpaceId}
          opened={settingsOpened}
          onClose={closeSettings}
        />
      )}
    </>
  );
}
