import { Badge, Group, Text, Tooltip } from "@mantine/core";
import classes from "./app-header.module.css";
import React from "react";
import TopMenu from "@/components/layouts/global/top-menu.tsx";
import { Link, useLocation } from "react-router-dom";
import APP_ROUTE from "@/lib/app-route.ts";
import { useAtom } from "jotai";
import {
  desktopSidebarAtom,
  mobileSidebarAtom,
} from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { useToggleSidebar } from "@/components/layouts/global/hooks/hooks/use-toggle-sidebar.ts";
import SidebarToggle from "@/components/ui/sidebar-toggle-button.tsx";
import { useTranslation } from "react-i18next";
import useTrial from "@/ee/hooks/use-trial.tsx";
import { isCloud } from "@/lib/config.ts";
import {
  SearchControl,
  SearchMobileControl,
} from "@/features/search/components/search-control.tsx";
import {
  searchSpotlight,
  shareSearchSpotlight,
} from "@/features/search/constants.ts";

export function AppHeader() {
  const { t } = useTranslation();
  const [mobileOpened] = useAtom(mobileSidebarAtom);
  const toggleMobile = useToggleSidebar(mobileSidebarAtom);

  const [desktopOpened] = useAtom(desktopSidebarAtom);
  const toggleDesktop = useToggleSidebar(desktopSidebarAtom);
  const { isTrial, trialDaysLeft } = useTrial();

  const location = useLocation();
  const isHomeRoute = location.pathname.startsWith("/home");
  const isSpacesRoute = location.pathname === "/spaces";
  const hideSidebar = isHomeRoute || isSpacesRoute;

  return (
    <>
      <div className={classes.inner} data-home={isHomeRoute || isSpacesRoute || undefined}>
        <Group wrap="nowrap" gap={6} className={classes.start}>
          <Tooltip label={t("Sidebar toggle")}>
            <SidebarToggle
              aria-label={t("Sidebar toggle")}
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
          </Tooltip>

          <Link to="/home" className={classes.brand} aria-label="AltWiki">
            <Text component="span" className={classes.wordmark}>
              AltWiki
            </Text>
          </Link>

          {!hideSidebar && (
            <Tooltip label={t("Sidebar toggle")}>
              <SidebarToggle
                aria-label={t("Sidebar toggle")}
                opened={desktopOpened}
                onClick={toggleDesktop}
                visibleFrom="sm"
                size="sm"
                ml={6}
                className={classes.toggle}
              />
            </Tooltip>
          )}
        </Group>

        <div className={classes.center}>
          <SearchControl
            onClick={searchSpotlight.open}
            visibleFrom="sm"
            variant="pill"
          />
          <Group hiddenFrom="sm">
            <SearchMobileControl onSearch={searchSpotlight.open} />
          </Group>
        </div>

        <Group wrap="nowrap" gap="sm" justify="flex-end" className={classes.end}>
          {isCloud() && isTrial && trialDaysLeft !== 0 && (
            <Badge
              variant="light"
              style={{ cursor: "pointer" }}
              component={Link}
              to={APP_ROUTE.SETTINGS.WORKSPACE.BILLING}
              visibleFrom="xs"
            >
              {trialDaysLeft === 1
                ? "1 day left"
                : `${trialDaysLeft} days left`}
            </Badge>
          )}
          <TopMenu />
        </Group>
      </div>
    </>
  );
}
