import { Loader } from "@mantine/core";
import classes from "./route-fallback.module.css";

/**
 * Suspense fallback for lazily loaded routes. Renders nothing visible for the
 * first ~250ms (most chunks arrive by then), then a small muted loader, so a
 * fast navigation never flashes a spinner and the shell never jumps.
 */
export function RouteFallback() {
  return (
    <div className={classes.fallback} role="status" aria-live="polite">
      <Loader size="sm" color="gray" type="dots" />
    </div>
  );
}
