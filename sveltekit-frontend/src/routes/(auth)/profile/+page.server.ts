import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/drizzle';
import { sql } from 'drizzle-orm';
import { users, cases, evidence, criminals } from '$lib/server/db/schema';

type CountRow = { value: number | string | bigint | null };

const asNumber = (rows: CountRow[] | undefined): number => {
  const raw = rows?.[0]?.value ?? 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') return Number(raw);
  return 0;
};

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    return {
      profile: null,
      stats: null,
    };
  }

  // use the imported clients/schemas directly to preserve types and avoid unsafe `any` casts.
  // TODO: replace these `any` assertions with proper exported DB/schema types (e.g. AppDatabase, TableSchemas).
  // Cast to `any` to satisfy TypeScript until the DB client/schema exports include
  // concrete types. This silences `unknown` issues while preserving runtime behavior.
  // Replace `any` with the actual exported types from $lib/server/db/drizzle and schema files.
  const _db = db as any;
  const _users = users as any;
  const _cases = cases as any;
  const _evidence = evidence as any;
  const _criminals = criminals as any;

  // use the typed-like `_db` and `_users/_cases/...` for the WHERE clause and selects
  const profile = await _db.query.users.findFirst({
    columns: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
    },
    where: sql`${_users.id} = ${userId}`,
  });

  if (!profile) {
    return {
      profile: null,
      stats: null,
    };
  }

  const [totalCasesRow, openCasesRow, closedCasesRow, evidenceRow, poiRow] = await Promise.all([
    _db.select({ value: sql<number>`count(*)::int` }).from(_cases),
    _db
      .select({ value: sql<number>`count(*)::int` })
      .from(_cases)
      .where(sql`status NOT IN ('closed', 'archived')`),
    _db
      .select({ value: sql<number>`count(*)::int` })
      .from(_cases)
      .where(sql`status = 'closed'`),
    _db.select({ value: sql<number>`count(*)::int` }).from(_evidence),
    _db.select({ value: sql<number>`count(*)::int` }).from(_criminals),
  ]);

  return {
    profile,
    stats: {
      totalCases: asNumber(totalCasesRow),
      openCases: asNumber(openCasesRow),
      closedCases: asNumber(closedCasesRow),
      totalEvidence: asNumber(evidenceRow),
      personsOfInterest: asNumber(poiRow),
    },
  };
};