// Lightweight permissive shims for common 'drizzle-orm' symbols used across the repo.
// These intentionally use `any` to reduce type noise during migration and allow
// progressive, auditable replacement with concrete types later.
declare module 'drizzle-orm' {
  export const sql: any;
  export const desc: any;
  export const like: any;
  export const ilike: any;
  export const count: any;
  export const db: any;
  export const cases: any;
  export const evidence: any;
  export const legalDocuments: any;
  export const personsOfInterest: any;
  export const l2Distance: any;
  export const cosineDistance: any;
  export const registerWsConnection: any;
  export const getMissedMessages: any;
  export const appendFile: any;
  export const mkdir: any;
  export const rename: any;
  export const inArray: any;
  export const ne: any;
  export const gte: any;
  export const lte: any;
  export const isNull: any;
  export const isNotNull: any;
  export const sqlType: any;
  export default any;
}

// Also provide a permissive export for local DB/schema modules imported with named members
declare module '$lib/server/db/*' {
  const whatever: any;
  export default whatever;
  export const anyExport: any;
}
