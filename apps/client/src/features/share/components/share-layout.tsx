import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { RouteFallback } from "@/components/layouts/global/route-fallback.tsx";
import ShareShell from "@/features/share/components/share-shell.tsx";

export default function ShareLayout() {
  return (
    <ShareShell>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </ShareShell>
  );
}
