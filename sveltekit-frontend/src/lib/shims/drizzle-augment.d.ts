// Conservative Drizzle augment shim (permissive) to reduce TS noise during migration.
// Exports common names as any to avoid missing-export errors.
declare module 'drizzle-orm' {
  const _any: any;
  export = _any;
}

// Fallback for local db modules
declare module '$lib/server/db/*' {
  const anyExport: any;
  export default anyExport;
  export const db: any;
  export const enhanced_db: any;
  export const legalDocuments: any;
  export const legal_documents: any;
  export const documents: any;
  export const embeddings: any;
  export const cases: any;
  export const criminals: any;
  export const aiAnalyses: any;
}


