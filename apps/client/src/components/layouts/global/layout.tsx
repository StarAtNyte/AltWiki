import { UserProvider } from "@/features/user/user-provider.tsx";
import { Outlet, useParams } from "react-router-dom";
import GlobalAppShell from "@/components/layouts/global/global-app-shell.tsx";
import { PosthogUser } from "@/ee/components/posthog-user.tsx";
import { isCloud } from "@/lib/config.ts";
import { SearchSpotlight } from "@/features/search/components/search-spotlight.tsx";
import React, { Suspense } from "react";
import { RouteFallback } from "@/components/layouts/global/route-fallback.tsx";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";

export default function Layout() {
  const { spaceSlug } = useParams();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);

  return (
    <UserProvider>
      <GlobalAppShell>
        {/* Lazy routes suspend here, inside the shell, so it never unmounts. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </GlobalAppShell>
      {isCloud() && <PosthogUser />}
      <SearchSpotlight spaceId={space?.id} />
    </UserProvider>
  );
}
