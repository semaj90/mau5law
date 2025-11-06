import type { ServerLoad } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import pool from "$lib/server/db/client";

export type CaseSummary = {
  id: string;
  title: string;
  status: string;
  progress: number;
  evidenceCount: number;
  lastUpdate: Date;
};

// lightweight types to avoid any
type Row = Record<string, unknown>;

interface PgQueryable {
  query(sql: string): Promise<{ rows: Row[] } | Row[]>;
}
interface Executable {
  execute(sql: string): Promise<{ result?: Row[] } | Row[]>;
}
interface Runnable {
  run(sql: string): Promise<Row[] | { rows?: Row[] } | Row>;
}
type Callable = (sql: string) => Promise<Row[] | Row | { rows?: Row[]; result?: Row[] }>;

// tolerant query executor that supports pg Pool, postgres-js (callable), and other shapes
// -> returns a normalized Row[] for callers
const executeQuery = async (dbClient: unknown, sql: string): Promise<Row[]> => {
  // runtime guard - narrow to a plain object rather than a Record<string, unknown>
  const isObject = (v: unknown): v is object => typeof v === "object" && v !== null;
  if (!dbClient) throw new Error("No DB client provided");

  // helper to normalize various driver return shapes into Row[]
  const normalize = (raw: unknown): Row[] => {
    if (Array.isArray(raw)) return raw as Row[];
    if (raw && typeof raw === "object") {
      const rawObj = raw as Record<string, unknown>;
      // pg client: { rows: [...] }
      if ("rows" in rawObj && Array.isArray(rawObj["rows"])) {
        return rawObj["rows"] as Row[];
      }
      // some clients return { result: [...] }
      if ("result" in rawObj && Array.isArray(rawObj["result"])) {
        return rawObj["result"] as Row[];
      }
      // single-row object
      return [rawObj as Row];
    }
    return [];
  };

  // create a record view for safe 'in' checks
  const clientRec = dbClient as unknown as Record<string, unknown>;

  // pg Pool / Client (query)
  if (isObject(dbClient) && "query" in clientRec && typeof clientRec["query"] === "function") {
    const raw = await (dbClient as unknown as PgQueryable).query(sql);
    return normalize(raw);
  }
  // clients exposing execute/run
  if (isObject(dbClient) && "execute" in clientRec && typeof clientRec["execute"] === "function") {
    const raw = await (dbClient as unknown as Executable).execute(sql);
    return normalize(raw);
  }
  if (isObject(dbClient) && "run" in clientRec && typeof clientRec["run"] === "function") {
    const raw = await (dbClient as unknown as Runnable).run(sql);
    return normalize(raw);
  }
  // postgres-js style (callable function)
  if (typeof dbClient === "function") {
    const raw = await (dbClient as Callable)(sql);
    return normalize(raw);
  }

  throw new Error("Unsupported DB client - no known query method");
};

export const load: ServerLoad = async ({ locals }) => {
  // tolerant locals shape (support different auth implementations)
  const maybeLocals = locals as
    | {
        user?: { id?: string } | undefined;
        userId?: string | undefined;
        session?: { user?: { id?: string } } | undefined;
      }
    | undefined;

  const userId =
    maybeLocals?.user?.id ?? maybeLocals?.userId ?? maybeLocals?.session?.user?.id ?? null;

  if (!userId) {
    throw redirect(303, "/login");
  }

  let cases: CaseSummary[] = [];

  try {
    const queryText = `
			SELECT
				c.id,
				c.title,
				c.status,
				COALESCE(c.progress, 0) AS progress,
				c.updated_at,
				(SELECT COUNT(*) FROM evidence WHERE case_id = c.id) AS evidence_count
			FROM cases c
			ORDER BY c.updated_at DESC
		`;

    // now get normalized rows directly
    const rows = await executeQuery(pool, queryText);

    cases = rows.map((row) => ({
      id: String(row["id"] ?? ""),
      title: String(row["title"] ?? ""),
      status: String(row["status"] ?? "unknown"),
      progress: Number(row["progress"] ?? 0),
      evidenceCount: Number(row["evidence_count"] ?? row["evidenceCount"] ?? 0),
      lastUpdate: row["updated_at"] ? new Date(String(row["updated_at"])) : new Date(),
    }));
  } catch (err) {
    console.error("Failed to fetch cases:", err);
    // minimal fallback so page can render
    cases = [
      {
        id: "err-001",
        title: "Database error: could not load cases",
        status: "error",
        progress: 0,
        evidenceCount: 0,
        lastUpdate: new Date(),
      },
    ];
  }

  return { cases };
};
