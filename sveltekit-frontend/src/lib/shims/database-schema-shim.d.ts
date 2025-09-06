// Database schema shims for common imports used across routes
declare module '$lib/database/schema/legal-documents' {
  export const legalDocuments: any;
  export const documentChunks: any;
  export const autoTags: any;
  export const userAiQueries: any;
  export const vectors: any;
  export const cases: any;
  export const evidence: any;
  export const users: any;
  export const document_chunks: any;
  const _default: any;
  export default _default;
}

declare module '$lib/server/db/schema-postgres' {
  // Duplicate removed: // Duplicate removed: export const legalDocuments: any;
  // Duplicate removed: // Duplicate removed: export const documentChunks: any;
  // Duplicate removed: // Duplicate removed: export const autoTags: any;
  // Duplicate removed: // Duplicate removed: export const userAiQueries: any;
  // Duplicate removed: // Duplicate removed: export const vectors: any;
  // Duplicate removed: // Duplicate removed: // Duplicate removed: // Duplicate removed: export const cases: any;
  // Duplicate removed: // Duplicate removed: // Duplicate removed: // Duplicate removed: export const evidence: any;
  // Duplicate removed: // Duplicate removed: export const users: any;
  // Duplicate removed: // Duplicate removed: export const document_chunks: any;
  const _default: any;
  export default _default;
}

declare module '$lib/server/db/index' {
  export const db: any;
  export const connection: any;
  export const pgvector: any;
  export const json: any;
  export const vector: any;
  export const performance: any;
  export const fullStack: any;
  export const cleanup: any;
  // Duplicate removed: // Duplicate removed: // Duplicate removed: // Duplicate removed: export const cases: any;
  // Duplicate removed: // Duplicate removed: // Duplicate removed: // Duplicate removed: export const evidence: any;
  export const eq: any;
  export const desc: any;
  export const count: any;
  export const drizzle: any;
  export const Database: any;
  export const sql: any;
  export const and: any;
  export const gte: any;
  export const like: any;
  export const lte: any;
  export const or: any;
  export const SQL: any;
  const _default: any;
  export default _default;
}

// Common database operations shim
declare module '$lib/server/db/*' {
  const _whatever: any;
  export default _whatever;
  // Duplicate removed: // Duplicate removed: export const db: any;
  // Duplicate removed: // Duplicate removed: export const connection: any;
  export const rows: any;
}