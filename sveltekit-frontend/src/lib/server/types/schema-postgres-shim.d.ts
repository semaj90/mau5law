// Lightweight shim for "$lib/server/db/schema-postgres" to reduce TypeScript
// noise while migrating. Exports are intentionally typed as `any` and are
// temporary until the canonical schema types are reconciled.

declare module '$lib/server/db/schema-postgres' {
  // Common tables / aliases
  export const users: any;
  export const sessions: any;
  export const cases: any;
  export const evidence: any;
  export const legal_documents: any;
  export const legalDocuments: any;
  export const documents: any;
  export const documentChunks: any;
  export const document_chunks: any;
  export const embeddingCache: any;
  export const embedding_cache: any;
  export const keys: any;
  export const userProfiles: any;
  export const reports: any;
  export const aiReports: any;
  export const statutes: any;
  export const legalAnalysisSessions: any;
  export const userAiQueries: any;
  export const autoTags: any;
  export const caseDocuments: any;
  export const caseActivities: any;
  export const caseTimeline: any;
  export const caseScores: any;
  export const ragSessions: any;
  export const ragMessages: any;
  export const vectorMetadata: any;
  export const criminals: any;
  export const personsOfInterest: any;
  export const persons_of_interest: any;
  export const canvasStates: any;
  export const documentVectors: any;
  export const document_processing: any;
  export const vectorOutbox: any;

  // Helpers commonly re-exported from drizzle adapters
  export const desc: any;
  export const asc: any;

  // Common types
  export type User = any;
  export type Session = any;
  export type Case = any;
  export type Report = any;
  export type LegalDocument = any;
  export type DocumentChunk = any;

  // Fallback - allow other named exports to be imported without TS errors
  // (not strictly valid TS but helpful as a temporary bridge)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const __any: any;
}

// Also support importing from the JS-extended path
declare module '$lib/server/db/schema-postgres.js' {
  const shim: any;
  export = shim;
}
