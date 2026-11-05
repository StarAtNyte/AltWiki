import { AppShell, Container } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SettingsSidebar from "@/components/settings/settings-sidebar.tsx";
import { useAtom } from "jotai";
import {
  asideStateAtom,
  desktopSidebarAtom,
  mobileSidebarAtom,
  sidebarWidthAtom,
} from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { SpaceSidebar } from "@/features/space/components/sidebar/space-sidebar.tsx";
import { AppHeader } from "@/components/layouts/global/app-header.tsx";
import classes from "./app-shell.module.css";
import { useTrialEndAction } from "@/ee/hooks/use-trial-end-action.tsx";
import { useToggleSidebar } from "@/components/layouts/global/hooks/hooks/use-toggle-sidebar.ts";
import { SpaceRail } from "@/components/layouts/global/space-rail.tsx";
import { AppBackdrop } from "@/features/background/components/app-backdrop.tsx";
import { BackgroundPickerModal } from "@/features/background/components/background-picker.tsx";

// Comments / table of contents / page info: only used on page routes, so
// loaded with the page instead of with the shell.
const Aside = React.lazy(() => import("@/components/layouts/global/aside.tsx"));

// The floating rail (72px) plus its 12px insets. Keep in sync with
// --app-rail-outer in theme.ts.
const RAIL_WIDTH = 96;
// Right inset of the floating contextual sidebar.
const CONTEXT_GAP = 12;

export default function GlobalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useTrialEndAction();
  const [mobileOpened] = useAtom(mobileSidebarAtom);
  const toggleMobile = useToggleSidebar(mobileSidebarAtom);
  const [desktopOpened] = useAtom(desktopSidebarAtom);
  const [{ isAsideOpen }] = useAtom(asideStateAtom);
  const [sidebarWidth, setSidebarWidth] = useAtom(sidebarWidthAtom);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const headerRef = useRef<HTMLElement>(null);

  // The header is transparent over the fixed photo at rest; once content
  // scrolls beneath it, it gets a frosted surface. Toggled as a data
  // attribute (no React re-render per scroll event).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = headerRef.current;
      if (!el) return;
      const scrolled = window.scrollY > 4;
      if (scrolled !== el.hasAttribute("data-scrolled")) {
        el.toggleAttribute("data-scrolled", scrolled);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const startResizing = React.useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        const newWidth =
          mouseMoveEvent.clientX -
          sidebarRef.current.getBoundingClientRect().left -
          RAIL_WIDTH;
        if (newWidth < 220) {
          setSidebarWidth(220);
          return;
        }
        if (newWidth > 600) {
          setSidebarWidth(600);
          return;
        }
        setSidebarWidth(newWidth);
      }
    },
    [isResizing],
  );

  useEffect(() => {
    //https://codesandbox.io/p/sandbox/kz9de
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const location = useLocation();
  const isSettingsRoute = location.pathname.startsWith("/settings");
  const isSpaceRoute = location.pathname.startsWith("/s/");
  const isHomeRoute = location.pathname.startsWith("/home");
  const isSpacesRoute = location.pathname === "/spaces";
  const isPageRoute = location.pathname.includes("/p/");
  const isTrashRoute = /^\/s\/[^/]+\/trash/.test(location.pathname);
  const hideSidebar = isHomeRoute || isSpacesRoute;
  // Reading/working views sit on a solid surface; the photo only shows around
  // it (and through the glass rail / sidebar).
  const solidCanvas = isPageRoute || isSettingsRoute || isTrashRoute;
  // The rail is always visible on desktop; the navbar shrinks to the rail when
  // the contextual sidebar is hidden or collapsed. On mobile the whole navbar
  // (rail + sidebar) is the drawer.
  const showSidebar = !hideSidebar && desktopOpened;
  // localStorage hands the width back as a string ("300"); coerce and clamp so
  // arithmetic below can never turn into string concatenation ("300" + 12).
  const storedWidth = Number(sidebarWidth);
  const safeSidebarWidth = Number.isFinite(storedWidth)
    ? Math.min(600, Math.max(220, storedWidth))
    : 300;
  const contextWidth = (isSpaceRoute ? safeSidebarWidth : 300) + CONTEXT_GAP;

  return (
    <>
    <AppBackdrop />
    {solidCanvas && <div className={classes.docCanvas} aria-hidden />}
    <AppShell
      layout="alt"
      header={{ height: { base: 56, sm: 96 } }}
      transitionDuration={isResizing ? 0 : 180}
      transitionTimingFunction="cubic-bezier(0.2, 0, 0, 1)"
      navbar={{
        width: {
          base: RAIL_WIDTH + contextWidth,
          sm: RAIL_WIDTH + (showSidebar ? contextWidth : 0),
        },
        breakpoint: "sm",
        collapsed: {
          mobile: !mobileOpened,
          desktop: false,
        },
      }}
      aside={
        isPageRoute && {
          width: 350,
          breakpoint: "sm",
          collapsed: { mobile: !isAsideOpen, desktop: !isAsideOpen },
        }
      }
      padding={isHomeRoute || isSpacesRoute ? 0 : "md"}
    >
      <AppShell.Header
        ref={headerRef}
        className={classes.header}
        withBorder={false}
      >
        <AppHeader />
      </AppShell.Header>
      <AppShell.Navbar
        className={classes.navbar}
        withBorder={false}
        ref={sidebarRef}
        data-resizing={isResizing || undefined}
        data-rail-only={hideSidebar || undefined}
      >
        <SpaceRail />
        <div
          className={classes.context}
          data-hidden-desktop={!showSidebar || undefined}
          data-empty={hideSidebar || undefined}
        >
          {isSpaceRoute && showSidebar && (
            <div className={classes.resizeHandle} onMouseDown={startResizing} />
          )}
          {isSpaceRoute && <SpaceSidebar />}
          {isSettingsRoute && <SettingsSidebar />}
        </div>
      </AppShell.Navbar>
      <AppShell.Main>
        {isSettingsRoute ? (
          <Container size={850} pt="lg">
            {children}
          </Container>
        ) : (
          children
        )}
      </AppShell.Main>

      {isPageRoute && (
        <AppShell.Aside className={classes.aside} withBorder={false}>
          <div className={classes.asideInner}>
            <React.Suspense fallback={null}>
              <Aside />
            </React.Suspense>
          </div>
        </AppShell.Aside>
      )}
    </AppShell>
    <BackgroundPickerModal />
    </>
  );
}
