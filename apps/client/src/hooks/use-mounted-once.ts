import { useState } from "react";

/**
 * True from the first time `active` is true onwards. Lets a lazily loaded
 * modal mount only when first opened, then stay mounted so its close
 * transition still plays.
 */
export function useMountedOnce(active: boolean): boolean {
  const [mounted, setMounted] = useState(active);
  if (active && !mounted) setMounted(true);
  return mounted || active;
}
