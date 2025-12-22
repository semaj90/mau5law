/**
 * Legal Search System Schema Index
 * Exports all legal-related tables and relations
 */

export {
 cases,
 crimes,
 caseChunks,
 casesRelations,
 crimesRelations,
 caseChunksRelations,
} from './legal-cases.js';

export { laws, lawSections, lawsRelations, lawSectionsRelations } from './legal-laws.js';

// Type exports
export type { cases as CasesTable } from './legal-cases.js';
export type { crimes as CrimesTable } from './legal-cases.js';
export type { caseChunks as CaseChunksTable } from './legal-cases.js';
export type { laws as LawsTable } from './legal-laws.js';
export type { lawSections as LawSectionsTable } from './legal-laws.js';
