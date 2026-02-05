import { type Kysely } from 'kysely';

const OPEN_SPACE_NAMES = [
  'MyRoom',
  'Opensource Alternatives',
  'AT Documentation (Confluence)',
  'exploRUG',
  'Research & AI',
  'Marketing & Promotion',
  'Support',
  'Design & Illustration',
];

export async function up(db: Kysely<any>): Promise<void> {
  await db
    .updateTable('spaces')
    .set({ visibility: 'open' })
    .where('name', 'in', OPEN_SPACE_NAMES)
    .where('deleted_at', 'is', null)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db
    .updateTable('spaces')
    .set({ visibility: 'private' })
    .where('name', 'in', OPEN_SPACE_NAMES)
    .where('deleted_at', 'is', null)
    .execute();
}
