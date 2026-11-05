import useUserRole from "@/hooks/use-user-role.tsx";
import { useSpaceQuery } from "@/features/space/queries/space-query.ts";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability.ts";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type.ts";

// AltWiki: workspace owners/admins, or admins of the page's space.
export function useCanChangePageOwner(spaceId?: string): boolean {
  const { isAdmin } = useUserRole();
  const { data: space } = useSpaceQuery(isAdmin ? "" : (spaceId ?? ""));
  const spaceAbility = useSpaceAbility(space?.membership?.permissions);
  if (isAdmin) return true;
  return spaceAbility.can(SpaceCaslAction.Manage, SpaceCaslSubject.Settings);
}
