import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Popover, ScrollArea, Text, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconArchive,
  IconHome,
  IconLayoutGrid,
  IconSettings,
  IconSparkles,
  IconStar,
  IconTemplate,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useDisclosure } from "@mantine/hooks";
import { useAtomValue, useSetAtom } from "jotai";
import { useHasFeature } from "@/ee/hooks/use-feature";
import { Feature } from "@/ee/features";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";
import { useAllSpacesQuery } from "@/features/space/queries/space-query.ts";
import { partitionArchivedSpaces } from "@/features/space/utils/archived-space.ts";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import { getSpaceUrl } from "@/lib/config.ts";
import { getSpaceColor } from "@/lib/space-color.ts";
import APP_ROUTE from "@/lib/app-route.ts";
import { ISpace } from "@/features/space/types/space.types.ts";
import { mobileSidebarAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import classes from "./space-rail.module.css";

function activeSpaceSlug(pathname: string): string | undefined {
  const match = pathname.match(/^\/s\/([^/]+)/);
  return match ? decodeURIComponent(match[1]).toLowerCase() : undefined;
}

interface RailItemProps {
  label: string;
  active?: boolean;
  to: string;
  children: React.ReactNode;
  accent?: string;
  onNavigate?: () => void;
}

function RailItem({ label, active, to, children, accent, onNavigate }: RailItemProps) {
  return (
    <Tooltip label={label} position="right" withArrow offset={10} openDelay={80}>
      <UnstyledButton
        component={Link}
        to={to}
        onClick={onNavigate}
        className={classes.item}
        data-active={active || undefined}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        style={accent ? ({ "--rail-accent": accent } as React.CSSProperties) : undefined}
      >
        {children}
      </UnstyledButton>
    </Tooltip>
  );
}

export function SpaceRail({ className }: { className?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const setMobileOpened = useSetAtom(mobileSidebarAtom);
  const [archiveOpened, archive] = useDisclosure(false);
  const { data } = useAllSpacesQuery();
  const workspace = useAtomValue(workspaceAtom);
  const aiChatEnabled = workspace?.settings?.ai?.chat === true;
  // Workspace templates are a licensed feature: hidden without a licence.
  const hasTemplates = useHasFeature(Feature.TEMPLATES);

  const pathname = location.pathname;
  const currentSlug = activeSpaceSlug(pathname);
  const mine = (data ?? []).filter(
    (space: ISpace) => space.isMember !== false,
  );
  const { active, archived } = partitionArchivedSpaces(mine);
  const archivedActive = archived.some(
    (space) => space.slug.toLowerCase() === currentSlug,
  );

  const closeMobile = () => setMobileOpened(false);

  const spaceItem = (space: ISpace) => (
    <RailItem
      key={space.id}
      label={space.name}
      to={getSpaceUrl(space.slug)}
      active={space.slug.toLowerCase() === currentSlug}
      accent={getSpaceColor(space).base}
    >
      <SpaceAvatar
        name={space.name}
        logo={space.logo}
        size={32}
        radius={8}
        className={classes.avatar}
      />
    </RailItem>
  );

  return (
    <nav className={clsx(classes.rail, className)} aria-label={t("Spaces")}>
      <Link
        to={APP_ROUTE.HOME}
        className={classes.logo}
        aria-label="AltWiki"
        onClick={closeMobile}
      >
        <img src="/logo-mark.svg" alt="" width={40} height={40} draggable={false} />
      </Link>
      <div className={classes.top}>
        <RailItem
          label={t("Home")}
          to={APP_ROUTE.HOME}
          active={pathname.startsWith(APP_ROUTE.HOME)}
          onNavigate={closeMobile}
        >
          <span className={classes.glyph}>
            <IconHome size={20} stroke={1.75} />
          </span>
        </RailItem>
        <RailItem
          label={t("All spaces")}
          to={APP_ROUTE.SPACES}
          active={pathname === APP_ROUTE.SPACES}
          onNavigate={closeMobile}
        >
          <span className={classes.glyph}>
            <IconLayoutGrid size={20} stroke={1.75} />
          </span>
        </RailItem>
        <RailItem
          label={t("Favorites")}
          to="/favorites"
          active={pathname.startsWith("/favorites")}
          onNavigate={closeMobile}
        >
          <span className={classes.glyph}>
            <IconStar size={20} stroke={1.75} />
          </span>
        </RailItem>
        {hasTemplates && (
          <RailItem
            label={t("Templates")}
            to="/templates"
            active={pathname.startsWith("/templates")}
            onNavigate={closeMobile}
          >
            <span className={classes.glyph}>
              <IconTemplate size={20} stroke={1.75} />
            </span>
          </RailItem>
        )}
        {aiChatEnabled && (
          <RailItem
            label={t("AI Chat")}
            to="/ai"
            active={pathname.startsWith("/ai")}
            onNavigate={closeMobile}
          >
            <span className={classes.glyph}>
              <IconSparkles size={20} stroke={1.75} />
            </span>
          </RailItem>
        )}
      </div>

      <div className={classes.divider} />

      <ScrollArea className={classes.spaces} scrollbarSize={4} type="hover">
        <div className={classes.spaceList}>{active.map(spaceItem)}</div>
      </ScrollArea>

      <div className={classes.bottom}>
        {archived.length > 0 && (
          <Popover
            opened={archiveOpened}
            onChange={archive.toggle}
            position="right-end"
            offset={10}
            width={260}
            withArrow
          >
            <Popover.Target>
              <Tooltip
                label={t("Archived spaces")}
                position="right"
                withArrow
                offset={10}
                openDelay={80}
                disabled={archiveOpened}
              >
                <UnstyledButton
                  className={classes.item}
                  data-active={archivedActive || undefined}
                  onClick={archive.toggle}
                  aria-label={t("Archived spaces")}
                >
                  <span className={classes.glyph}>
                    <IconArchive size={20} stroke={1.75} />
                  </span>
                  <span className={classes.count}>{archived.length}</span>
                </UnstyledButton>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p={4}>
              <Text size="xs" fw={600} c="dimmed" px={8} pt={6} pb={4}>
                {t("Archived spaces")}
              </Text>
              <ScrollArea.Autosize mah={320}>
                {archived.map((space) => (
                  <UnstyledButton
                    key={space.id}
                    className={classes.archiveRow}
                    data-active={
                      space.slug.toLowerCase() === currentSlug || undefined
                    }
                    onClick={() => {
                      archive.close();
                      navigate(getSpaceUrl(space.slug));
                    }}
                  >
                    <SpaceAvatar
                      name={space.name}
                      logo={space.logo}
                      size={22}
                      radius={6}
                    />
                    <Text size="sm" lineClamp={1}>
                      {space.name.replace(/^\s*archive\s*:\s*/i, "")}
                    </Text>
                  </UnstyledButton>
                ))}
              </ScrollArea.Autosize>
            </Popover.Dropdown>
          </Popover>
        )}

        <RailItem
          label={t("Settings")}
          to={APP_ROUTE.SETTINGS.ACCOUNT.PROFILE}
          active={pathname.startsWith("/settings")}
          onNavigate={closeMobile}
        >
          <span className={classes.glyph}>
            <IconSettings size={20} stroke={1.75} />
          </span>
        </RailItem>
      </div>
    </nav>
  );
}
