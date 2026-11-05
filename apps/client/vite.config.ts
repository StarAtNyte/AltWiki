import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

export const envPath = path.resolve(process.cwd(), "..", "..");

export default defineConfig(({ mode }) => {
  const {
    APP_URL,
    FILE_UPLOAD_SIZE_LIMIT,
    FILE_IMPORT_SIZE_LIMIT,
    DRAWIO_URL,
    CLOUD,
    SUBDOMAIN_HOST,
    COLLAB_URL,
    BILLING_TRIAL_DAYS,
    POSTHOG_HOST,
    POSTHOG_KEY,
  } = loadEnv(mode, envPath, "");

  return {
    define: {
      "process.env": {
        APP_URL,
        FILE_UPLOAD_SIZE_LIMIT,
        FILE_IMPORT_SIZE_LIMIT,
        DRAWIO_URL,
        CLOUD,
        SUBDOMAIN_HOST,
        COLLAB_URL,
        BILLING_TRIAL_DAYS,
        POSTHOG_HOST,
        POSTHOG_KEY,
      },
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: they change rarely, so browsers keep
          // them cached across app deploys. The editor stack is only fetched
          // by the lazily loaded page / share / history routes.
          manualChunks(id) {
            // Rollup's shared CommonJS interop helper: keep it with React (which
            // every chunk loads) so vendor chunks never import each other
            // through it.
            if (id.includes("commonjsHelpers")) return "vendor-react";
            if (!id.includes("node_modules")) return undefined;
            if (
              /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(
                id,
              )
            )
              return "vendor-react";
            if (/[\\/]node_modules[\\/](@mantine|@floating-ui)[\\/]/.test(id))
              return "vendor-mantine";
            if (
              /[\\/]node_modules[\\/](@tiptap|prosemirror-[^\\/]+|orderedmap|rope-sequence|w3c-keyname)[\\/]/.test(
                id,
              )
            )
              return "vendor-editor";
            if (
              /[\\/]node_modules[\\/](yjs|y-protocols|y-prosemirror|y-indexeddb|lib0|@hocuspocus)[\\/]/.test(
                id,
              )
            )
              return "vendor-collab";
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      proxy: {
        "/api": {
          target: APP_URL,
          changeOrigin: false,
        },
        "/socket.io": {
          target: APP_URL,
          ws: true,
          rewriteWsOrigin: true,
        },
        "/collab": {
          target: APP_URL,
          ws: true,
          rewriteWsOrigin: true,
        },
      },
    },
  };
});
