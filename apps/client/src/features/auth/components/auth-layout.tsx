import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AppBackdrop } from "@/features/background/components/app-backdrop.tsx";
import { RouteFallback } from "@/components/layouts/global/route-fallback.tsx";
import classes from "./auth.module.css";

/**
 * Signed-out pages (login, invite, password reset, setup, MFA): the same
 * background photo as the app (default preset when nobody is signed in) with
 * the page's glass card centred over it.
 */
export default function AuthLayout() {
  return (
    <>
      <AppBackdrop />
      <div className={classes.page}>
        <main className={classes.main}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
          {/* Directly under the card, where it stays legible on the photo. */}
          <footer className={classes.footer}>Alternative Technology</footer>
        </main>
      </div>
    </>
  );
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
