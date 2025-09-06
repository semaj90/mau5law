import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


export const GET = async ({ url }): Promise<any> => {
  if (process.env.NODE_ENV === 'production') {
    return json({ error: 'Not available in production' }, { status: 403 });
  }

  const email = url.searchParams.get('email');
  if (!email) return json({ error: 'missing email' }, { status: 400 });

  try {
    // try dynamic import of the db module; if it doesn't exist, respond gracefully
    const mod = await import('$lib/server/db/drizzle').catch(() => null);
    if (!mod) return json({ available: false, exists: false });

    // try common export shapes
    const db: any = mod.db ?? mod.default ?? mod;
    if (!db) return json({ available: false, exists: false });

    // attempt a naive query - adapt to your db API
    if (typeof db.query === 'function') {
      const user = await db.query.users.findFirst({ where: { email } }).catch(() => null);
      return json({ available: true, exists: !!user });
    }

    // if Drizzle-style raw SQL client
    if (typeof db.prepare === 'function' || typeof db.execute === 'function') {
      // can't reliably query without schema; return available
      return json({ available: true, exists: false });
    }

    return json({ available: true, exists: false });
  } catch (err: any) {
    return json({ error: String(err) }, { status: 500 });
  }
};
