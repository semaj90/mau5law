import type { PageServerLoad } from './$types';
import { db, sql } from '$lib/server/db/drizzle';
import { users, cases, evidence, criminals } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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

  const profile = await db.query.users.findFirst({
    columns: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
    },
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!profile) {
    return {
      profile: null,
      stats: null,
    };
  }

  const [totalCasesRow, openCasesRow, closedCasesRow, evidenceRow, poiRow] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(cases),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(cases)
      .where(sql`${cases.status} NOT IN ('closed', 'archived')`),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(cases)
      .where(eq(cases.status, 'closed')),
    db.select({ value: sql<number>`count(*)::int` }).from(evidence),
    db.select({ value: sql<number>`count(*)::int` }).from(criminals),
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
