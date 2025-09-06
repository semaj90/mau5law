
import { db } from "$lib/server/db";
import type { RequestHandler } from './$types';


// Fallback raw query (table created dynamically by summarization script)
export const GET: RequestHandler = async () => {
  try {
    const rows = await db.execute(sql`SELECT id, generated_at, model, embed_model, docs_count, topics, parameters, created_at FROM corpus_summaries ORDER BY id DESC LIMIT 1`);
    if(!rows?.rows?.length) return json({ success:true, summary:null });
    return json({ success:true, summary: rows.rows[0] });
  } catch (e: any) {
    return json({ success:false, error: (e as any).message }, { status:500 });
  }
};
