import { type Kysely, sql } from 'kysely';

/**
 * Migration to add workspace owners and admins to all existing spaces as space admins.
 * This ensures workspace administrators can see and manage all spaces in their workspace.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Get all workspaces
  const workspaces = await db
    .selectFrom('workspaces')
    .select(['id'])
    .where('deleted_at', 'is', null)
    .execute();

  for (const workspace of workspaces) {
    // Get all spaces in this workspace
    const spaces = await db
      .selectFrom('spaces')
      .select(['id', 'creator_id'])
      .where('workspace_id', '=', workspace.id)
      .where('deleted_at', 'is', null)
      .execute();

    // Get all workspace owners and admins
    const workspaceAdmins = await db
      .selectFrom('users')
      .select(['id'])
      .where('workspace_id', '=', workspace.id)
      .where('role', 'in', ['owner', 'admin'])
      .where('deleted_at', 'is', null)
      .execute();

    // For each space, add workspace admins who are not already members
    for (const space of spaces) {
      // Get existing space member user IDs
      const existingMembers = await db
        .selectFrom('space_members')
        .select(['user_id'])
        .where('space_id', '=', space.id)
        .where('user_id', 'is not', null)
        .execute();

      const existingUserIds = new Set(existingMembers.map((m) => m.user_id));

      // Filter admins who are not already members
      const adminsToAdd = workspaceAdmins.filter(
        (admin) => !existingUserIds.has(admin.id),
      );

      // Insert new space members (ignore if already exists)
      if (adminsToAdd.length > 0) {
        await db
          .insertInto('space_members')
          .values(
            adminsToAdd.map((admin) => ({
              id: sql`gen_uuid_v7()`,
              user_id: admin.id,
              space_id: space.id,
              role: 'admin',
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })),
          )
          .onConflict((oc) => oc.columns(['space_id', 'user_id']).doNothing())
          .execute();
      }
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // This migration is not easily reversible as we can't distinguish
  // between members added by this migration and those added manually.
  // We'll leave the members in place on rollback.
}
