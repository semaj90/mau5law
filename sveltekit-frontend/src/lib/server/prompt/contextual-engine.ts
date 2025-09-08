import type { UserProfile } from "$lib/server/db/schema/user-management";
import { db } from "$lib/server/database";
import { users, userProfiles } from "$lib/server/db/schema/user-management";
import { eq } from "drizzle-orm";

export interface ContextOptions {
  jurisdictionHint?: boolean;
  practiceAreasHint?: boolean;
  tone?: 'formal' | 'concise' | 'explanatory';
}

export async function buildUserContextPrompt(userId?: string, opts: ContextOptions = {}): Promise<string> {
  if (!userId) return '';
  try {
    const rows = await db
      .select()
      .from(users)
      .leftJoin(userProfiles, eq(users.id as any, (userProfiles as any).userId))
      .where(eq(users.id as any, userId as any))
      .limit(1);
    if (!rows?.length) return '';
    const u: any = rows[0].users;
    const p: any = rows[0].user_profiles;

    const lines: string[] = [
      'You are assisting a legal professional. Personalize responses as appropriate.',
    ];

    if (opts.jurisdictionHint && u?.jurisdiction) {
      lines.push(`Primary jurisdiction: ${u.jurisdiction}.`);
    }
    if (opts.practiceAreasHint && Array.isArray(u?.practiceAreas)) {
      lines.push(`Practice areas: ${u.practiceAreas.join(', ')}.`);
    }
    if (p?.experienceLevel) {
      lines.push(`Experience level: ${p.experienceLevel}.`);
    }
    if (p?.specializations?.length) {
      lines.push(`Specializations: ${p.specializations.join(', ')}.`);
    }
    if (opts.tone) {
      lines.push(`Use a ${opts.tone} tone.`);
    }

    return lines.join(' ');
  } catch {
    return '';
  }
}
