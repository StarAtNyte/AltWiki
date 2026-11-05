import "@mantine/core/styles.css";
import "./styles/fonts.css";
import "./styles/glass.css";
import "@mantine/spotlight/styles.css";
import "@mantine/notifications/styles.css";
import '@mantine/dates/styles.css';

import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { mantineCssResolver, theme } from "@/theme";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import "./i18n";
import { PostHogProvider } from "posthog-js/react";
import {
  getPostHogHost,
  getPostHogKey,
  isCloud,
  isPostHogEnabled,
} from "@/lib/config.ts";
import posthog from "posthog-js";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

if (isCloud() && isPostHogEnabled) {
  posthog.init(getPostHogKey(), {
    api_host: getPostHogHost(),
    defaults: "2025-05-24",
    disable_session_recording: true,
    capture_pageleave: false,
  });
}

// After a deploy, an open tab may ask for a lazy chunk whose hash no longer
// exists. Reload once to pick up the new build instead of showing a blank
// route.
window.addEventListener("vite:preloadError", (event) => {
  const key = "altwiki.chunk-reload";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  event.preventDefault();
  window.location.reload();
});
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem("altwiki.chunk-reload"), 10000);
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <BrowserRouter>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={mantineCssResolver}
      defaultColorScheme="light"
    >
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <Notifications position="bottom-center" limit={3} zIndex={10000} />
          <HelmetProvider>
            <PostHogProvider client={posthog}>
              <App />
            </PostHogProvider>
          </HelmetProvider>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  </BrowserRouter>,
);
