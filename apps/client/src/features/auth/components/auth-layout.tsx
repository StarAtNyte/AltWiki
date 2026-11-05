import React, { createContext, Suspense, useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppBackdrop } from "@/features/background/components/app-backdrop.tsx";
import { RouteFallback } from "@/components/layouts/global/route-fallback.tsx";
import classes from "./auth.module.css";

// True below the route-level layout, so the per-page <AuthLayout> wrapper
// (used by upstream / ee pages) does not render the backdrop a second time.
const AuthShellContext = createContext(false);

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthShellContext.Provider value={true}>
      <AppBackdrop />
      <div className={classes.page}>
        <main className={classes.main}>
          {children}
          {/* Directly under the card, where it stays legible on the photo. */}
          <footer className={classes.footer}>Alternative Technology</footer>
        </main>
      </div>
    </AuthShellContext.Provider>
  );
}

/**
 * Signed-out pages (login, invite, password reset, setup, MFA): the same
 * background photo as the app (default preset when nobody is signed in) with
 * the page's glass card centred over it.
 */
export default function AuthRouteLayout() {
  return (
    <AuthShell>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AuthShell>
  );
}

/**
 * Per-page wrapper kept for pages that render outside the auth route layout
 * (cloud login, verify email, ...). Inside the route layout it is a no-op.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const insideShell = useContext(AuthShellContext);
  if (insideShell) return <>{children}</>;
  return <AuthShell>{children}</AuthShell>;
}

/** Book peak mark + wordmark at the top of every auth card. */
export function AuthBrand() {
  return (
    <div className={classes.brand}>
      <img
        src="/logo-mark.svg"
        alt=""
        width={48}
        height={48}
        draggable={false}
      />
      <span className={classes.wordmark}>AltWiki</span>
    </div>
  );
}
