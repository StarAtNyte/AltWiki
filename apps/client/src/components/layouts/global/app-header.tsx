import { ActionIcon, Badge, Group, Text, Tooltip } from "@mantine/core";
import classes from "./app-header.module.css";
import React from "react";
import TopMenu from "@/components/layouts/global/top-menu.tsx";
import { Link, useLocation } from "react-router-dom";
import { IconSparkles } from "@tabler/icons-react";
import useToggleAside from "@/hooks/use-toggle-aside.tsx";
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
import { searchSpotlight } from "@/features/search/constants.ts";
import { NotificationPopover } from "@/features/notification/components/notification-popover.tsx";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";

export function AppHeader() {
  const { t } = useTranslation();
  const [mobileOpened] = useAtom(mobileSidebarAtom);
  const toggleMobile = useToggleSidebar(mobileSidebarAtom);

  const [desktopOpened] = useAtom(desktopSidebarAtom);
  const toggleDesktop = useToggleSidebar(desktopSidebarAtom);
  const { isTrial, trialDaysLeft } = useTrial();
  const toggleAside = useToggleAside();
  const [workspace] = useAtom(workspaceAtom);
  const aiChatEnabled = workspace?.settings?.ai?.chat === true;

  const location = useLocation();
  const pathname = location.pathname;
  const isHomeRoute = pathname.startsWith("/home");
  const isSpacesRoute = pathname === "/spaces";
  const isPageRoute = pathname.includes("/p/");
  // Only space, settings and AI chat routes have a contextual sidebar to
  // collapse (see global-app-shell.tsx).
  const hideSidebar =
    !pathname.startsWith("/s/") &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/ai");

  const openAiChat = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
      return;
    }
    // On a page the chat opens in the aside, next to the document.
    if (isPageRoute) {
      e.preventDefault();
      toggleAside("chat");
    }
  };

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
          {aiChatEnabled && (
            <Tooltip label={t("AI Chat")} openDelay={250} withArrow>
              <ActionIcon
                component={Link}
                to="/ai"
                variant="subtle"
                color="gray"
                aria-label={t("AI Chat")}
                onClick={openAiChat}
              >
                <IconSparkles size={18} stroke={1.75} />
              </ActionIcon>
            </Tooltip>
          )}
          <NotificationPopover />
          <TopMenu />
        </Group>
      </div>
    </>
  );
}
