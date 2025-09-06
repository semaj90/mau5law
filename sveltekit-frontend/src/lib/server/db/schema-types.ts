// @ts-nocheck
// Production schema type exports for SvelteKit 2 + Drizzle ORM
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { 
  cases, 
  evidence, 
  reports, 
  users, 
  criminals,
  personsOfInterest,
  legalDocuments,
  notes
} from './unified-schema';

// Inferred types from schema
export type Case = InferSelectModel<typeof cases>;
export type CaseInsert = InferInsertModel<typeof cases>;

export type Evidence = InferSelectModel<typeof evidence>;
export type EvidenceInsert = InferInsertModel<typeof evidence>;

export type Report = InferSelectModel<typeof reports>;
export type ReportInsert = InferInsertModel<typeof reports>;

export type User = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;

export type Criminal = InferSelectModel<typeof criminals>;
export type CriminalInsert = InferInsertModel<typeof criminals>;

export type PersonOfInterest = InferSelectModel<typeof personsOfInterest>;
export type PersonOfInterestInsert = InferInsertModel<typeof personsOfInterest>;

export type LegalDocument = InferSelectModel<typeof legalDocuments>;
export type LegalDocumentInsert = InferInsertModel<typeof legalDocuments>;

export type Note = InferSelectModel<typeof notes>;
export type NoteInsert = InferInsertModel<typeof notes>;

// Relations types
export type CaseWithRelations = Case & {
  evidence?: Evidence[];
  reports?: Report[];
  personsOfInterest?: PersonOfInterest[];
  legalDocuments?: LegalDocument[];
  notes?: Note[];
  leadProsecutor?: User;
  createdBy?: User;
};

export type EvidenceWithRelations = Evidence & {
  case?: Case;
  uploadedBy?: User;
};

export type ReportWithRelations = Report & {
  case?: Case;
  createdBy?: User;
  lastEditedBy?: User;
};

// Re-export schema tables
export {
  cases,
  evidence,
  reports,
  users,
  criminals,
  personsOfInterest,
  legalDocuments,
  notes
} from './unified-schema';
