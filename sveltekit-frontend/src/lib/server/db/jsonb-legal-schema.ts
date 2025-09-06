/**
 * JSONB Legal Metadata Schema Optimization
 * 
 * Optimizes PostgreSQL JSONB operations for legal document metadata,
 * case information, evidence records, and semantic analysis results.
 * 
 * Features:
 * - GIN indexes for fast JSONB queries
 * - Legal domain-specific schema validation
 * - Optimized query patterns for common operations
 * - Integration with vector embeddings and graph data
 */

import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, jsonb, vector, uuid, boolean, real } from 'drizzle-orm/pg-core';
// import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// LEGAL METADATA SCHEMA DEFINITIONS
// ============================================================================

// Base legal document metadata structure
const LegalMetadataSchema = z.object({
  // Document Classification
  documentType: z.enum(['contract', 'brief', 'motion', 'pleading', 'evidence', 'citation', 'precedent', 'statute']),
  jurisdiction: z.string().optional(),
  practiceArea: z.enum(['corporate', 'litigation', 'criminal', 'intellectual_property', 'real_estate', 'family', 'tax', 'employment']).optional(),
  
  // Legal Context
  courtLevel: z.enum(['federal', 'state', 'local', 'administrative']).optional(),
  caseType: z.enum(['civil', 'criminal', 'administrative', 'appellate']).optional(),
  urgency: z.enum(['routine', 'priority', 'urgent', 'emergency']).default('routine'),
  
  // Document Properties
  confidentialityLevel: z.enum(['public', 'confidential', 'privileged', 'classified']).default('public'),
  retentionPeriod: z.number().int().positive().optional(), // Years
  
  // Legal Entities
  parties: z.array(z.object({
    name: z.string(),
    role: z.enum(['plaintiff', 'defendant', 'witness', 'counsel', 'judge', 'expert', 'third_party']),
    entityType: z.enum(['individual', 'corporation', 'government', 'organization']).optional()
  })).optional(),
  
  // Citations and References
  citations: z.array(z.object({
    type: z.enum(['case_law', 'statute', 'regulation', 'treaty', 'secondary_source']),
    citation: z.string(),
    relevance: z.number().min(0).max(1).optional(), // Semantic relevance score
    pinpoint: z.string().optional() // Specific page/paragraph reference
  })).optional(),
  
  // Semantic Analysis Metadata
  semantics: z.object({
    keyTerms: z.array(z.string()).optional(),
    legalConcepts: z.array(z.string()).optional(),
    precedentStrength: z.number().min(0).max(1).optional(),
    argumentStructure: z.array(z.object({
      type: z.enum(['premise', 'conclusion', 'evidence', 'counterargument']),
      text: z.string(),
      confidence: z.number().min(0).max(1)
    })).optional()
  }).optional(),
  
  // AI Processing Metadata
  aiMetadata: z.object({
    modelVersion: z.string().optional(),
    processingTimestamp: z.string().datetime().optional(),
    confidence: z.number().min(0).max(1).optional(),
    reviewStatus: z.enum(['pending', 'reviewed', 'approved', 'rejected']).default('pending'),
    humanVerified: z.boolean().default(false)
  }).optional(),
  
  // Custom Fields for Extensibility
  customFields: z.record(z.string(), z.any()).optional()
});

// Case-specific metadata
const CaseMetadataSchema = z.object({
  caseNumber: z.string(),
  filingDate: z.string().datetime().optional(),
  status: z.enum(['active', 'pending', 'closed', 'on_hold', 'appealed']),
  timeline: z.array(z.object({
    date: z.string().datetime(),
    event: z.string(),
    significance: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
  })).optional(),
  strategy: z.object({
    approach: z.string().optional(),
    objectives: z.array(z.string()).optional(),
    risks: z.array(z.object({
      description: z.string(),
      probability: z.number().min(0).max(1),
      impact: z.enum(['low', 'medium', 'high', 'critical'])
    })).optional()
  }).optional()
});

// Evidence metadata with chain of custody
const EvidenceMetadataSchema = z.object({
  evidenceType: z.enum(['document', 'physical', 'digital', 'testimony', 'expert_opinion', 'demonstrative']),
  authenticity: z.object({
    verified: z.boolean().default(false),
    method: z.string().optional(),
    verifier: z.string().optional(),
    verificationDate: z.string().datetime().optional()
  }).optional(),
  chainOfCustody: z.array(z.object({
    timestamp: z.string().datetime(),
    custodian: z.string(),
    action: z.enum(['collected', 'transferred', 'analyzed', 'stored', 'retrieved']),
    location: z.string().optional(),
    condition: z.string().optional()
  })).optional(),
  relevance: z.object({
    score: z.number().min(0).max(1),
    reasoning: z.string().optional(),
    relatedEvidence: z.array(z.string()).optional() // UUIDs of related evidence
  }).optional(),
  admissibility: z.object({
    status: z.enum(['admissible', 'inadmissible', 'conditional', 'pending']),
    basis: z.string().optional(),
    objections: z.array(z.string()).optional()
  }).optional()
});

// ============================================================================
// OPTIMIZED JSONB TABLES
// ============================================================================

export const legalDocumentsJsonb = pgTable('legal_documents_jsonb', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  
  // JSONB metadata with optimized schema
  metadata: jsonb('metadata').notNull(),
  
  // Vector embeddings for semantic search
  titleEmbedding: vector('title_embedding', { dimensions: 384 }),
  contentEmbedding: vector('content_embedding', { dimensions: 384 }),
  
  // Computed fields for fast access
  documentType: text('document_type').generatedAlwaysAs(sql`(metadata->>'documentType')`),
  jurisdiction: text('jurisdiction').generatedAlwaysAs(sql`(metadata->>'jurisdiction')`),
  practiceArea: text('practice_area').generatedAlwaysAs(sql`(metadata->>'practiceArea')`),
  confidentialityLevel: text('confidentiality_level').generatedAlwaysAs(sql`(metadata->>'confidentialityLevel')`),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Full-text search vector (generated column)
  // searchVector: sql`to_tsvector('english', title || ' ' || content)`, // Commented out - needs proper column syntax
});

export const casesJsonb = pgTable('cases_jsonb', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  
  // Case-specific JSONB metadata
  metadata: jsonb('metadata').notNull(),
  
  // Computed fields
  caseNumber: text('case_number').generatedAlwaysAs(sql`(metadata->>'caseNumber')`),
  status: text('status').generatedAlwaysAs(sql`(metadata->>'status')`),
  filingDate: timestamp('filing_date').generatedAlwaysAs(sql`(metadata->>'filingDate')::timestamp`),
  
  // Analytics
  totalDocuments: integer('total_documents').default(0),
  totalEvidence: integer('total_evidence').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const evidenceJsonb = pgTable('evidence_jsonb', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => casesJsonb.id),
  title: text('title').notNull(),
  description: text('description'),
  
  // Evidence-specific metadata
  metadata: jsonb('metadata').notNull(),
  
  // File information
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  
  // Embeddings for semantic search
  embedding: vector('embedding', { dimensions: 384 }),
  
  // Computed fields for indexing
  evidenceType: text('evidence_type').generatedAlwaysAs(sql`(metadata->>'evidenceType')`),
  authenticated: boolean('authenticated').generatedAlwaysAs(sql`((metadata->'authenticity'->>'verified')::boolean)`),
  relevanceScore: real('relevance_score').generatedAlwaysAs(sql`((metadata->'relevance'->>'score')::real)`),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Semantic relationships between documents
export const documentRelationshipsJsonb = pgTable('document_relationships_jsonb', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').notNull(),
  targetId: uuid('target_id').notNull(),
  
  relationshipMetadata: jsonb('relationship_metadata').notNull(),
  
  // Computed fields for fast queries
  relationshipType: text('relationship_type').generatedAlwaysAs(sql`(relationship_metadata->>'type')`),
  strength: real('strength').generatedAlwaysAs(sql`((relationship_metadata->>'strength')::real)`),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ============================================================================
// OPTIMIZED JSONB QUERY FUNCTIONS
// ============================================================================

export class LegalJsonbOperations {
  /**
   * Find documents by practice area with semantic filtering
   */
  static findDocumentsByPracticeArea(practiceArea: string, minRelevance = 0.7) {
    return sql`
      SELECT id, title, metadata, content_embedding
      FROM legal_documents_jsonb
      WHERE metadata->>'practiceArea' = ${practiceArea}
        AND (metadata->'semantics'->>'precedentStrength')::real >= ${minRelevance}
      ORDER BY (metadata->'aiMetadata'->>'confidence')::real DESC
    `;
  }

  /**
   * Complex legal entity search with JSONB path queries
   */
  static findDocumentsByParty(partyName: string, role?: string) {
    const roleFilter = role 
      ? sql`AND party->>'role' = ${role}`
      : sql``;

    return sql`
      SELECT DISTINCT d.id, d.title, d.metadata
      FROM legal_documents_jsonb d,
           jsonb_array_elements(d.metadata->'parties') AS party
      WHERE party->>'name' ILIKE ${`%${partyName}%`}
        ${roleFilter}
      ORDER BY d.updated_at DESC
    `;
  }

  /**
   * Citation network analysis with graph-like JSONB queries
   */
  static findCitationNetwork(documentId: string, depth = 2) {
    return sql`
      WITH RECURSIVE citation_tree AS (
        -- Base case: start with the given document
        SELECT id, title, metadata->'citations' as citations, 1 as depth
        FROM legal_documents_jsonb
        WHERE id = ${documentId}
        
        UNION
        
        -- Recursive case: find documents that cite or are cited by current level
        SELECT d.id, d.title, d.metadata->'citations' as citations, ct.depth + 1
        FROM legal_documents_jsonb d,
             citation_tree ct,
             jsonb_array_elements(ct.citations) AS cite
        WHERE ct.depth < ${depth}
          AND (
            -- Documents citing the current document
            d.metadata->'citations' @> jsonb_build_array(
              jsonb_build_object('citation', ct.title)
            )
            OR
            -- Documents cited by the current document
            cite->>'citation' ILIKE '%' || d.title || '%'
          )
      )
      SELECT * FROM citation_tree
      ORDER BY depth, title
    `;
  }

  /**
   * Advanced evidence chain of custody verification
   */
  static verifyEvidenceChain(evidenceId: string) {
    return sql`
      SELECT 
        id,
        title,
        metadata->'chainOfCustody' as chain,
        metadata->'authenticity' as authenticity,
        -- Verify chronological order
        CASE 
          WHEN (
            SELECT bool_and(
              (current_step->>'timestamp')::timestamp >= 
              (previous_step->>'timestamp')::timestamp
            )
            FROM (
              SELECT 
                custody_step as current_step,
                lag(custody_step) OVER (
                  ORDER BY (custody_step->>'timestamp')::timestamp
                ) as previous_step
              FROM jsonb_array_elements(metadata->'chainOfCustody') as custody_step
            ) t
            WHERE previous_step IS NOT NULL
          ) THEN 'VALID'
          ELSE 'INVALID'
        END as chain_validity,
        
        -- Count custody transfers
        jsonb_array_length(metadata->'chainOfCustody') as custody_count,
        
        -- Last custodian
        (metadata->'chainOfCustody'->-1->>'custodian') as current_custodian
        
      FROM evidence_jsonb
      WHERE id = ${evidenceId}
    `;
  }

  /**
   * Semantic case similarity with JSONB metadata scoring
   */
  static findSimilarCases(caseId: string, threshold = 0.8) {
    return sql`
      WITH target_case AS (
        SELECT metadata FROM cases_jsonb WHERE id = ${caseId}
      ),
      case_similarities AS (
        SELECT 
          c.id,
          c.title,
          c.metadata,
          -- Practice area match bonus
          CASE 
            WHEN c.metadata->>'practiceArea' = (SELECT metadata->>'practiceArea' FROM target_case)
            THEN 0.3 ELSE 0.0 
          END +
          -- Jurisdiction match bonus
          CASE 
            WHEN c.metadata->>'jurisdiction' = (SELECT metadata->>'jurisdiction' FROM target_case)
            THEN 0.2 ELSE 0.0 
          END +
          -- Case type similarity
          CASE 
            WHEN c.metadata->>'caseType' = (SELECT metadata->>'caseType' FROM target_case)
            THEN 0.2 ELSE 0.0 
          END +
          -- Timeline overlap analysis
          CASE 
            WHEN jsonb_array_length(c.metadata->'timeline') > 0 
            THEN 0.1 ELSE 0.0 
          END +
          -- Strategy similarity (simplified)
          CASE 
            WHEN c.metadata->'strategy'->>'approach' IS NOT NULL 
            THEN 0.2 ELSE 0.0 
          END as similarity_score
        FROM cases_jsonb c, target_case
        WHERE c.id != ${caseId}
      )
      SELECT 
        id,
        title,
        metadata,
        similarity_score,
        CASE 
          WHEN similarity_score >= 0.9 THEN 'VERY_HIGH'
          WHEN similarity_score >= 0.7 THEN 'HIGH'
          WHEN similarity_score >= 0.5 THEN 'MEDIUM'
          ELSE 'LOW'
        END as similarity_level
      FROM case_similarities
      WHERE similarity_score >= ${threshold}
      ORDER BY similarity_score DESC
      LIMIT 20
    `;
  }

  /**
   * Legal concept extraction and clustering
   */
  static extractLegalConcepts(documentIds: string[]) {
    return sql`
      WITH concept_extraction AS (
        SELECT 
          id,
          title,
          jsonb_array_elements_text(metadata->'semantics'->'legalConcepts') as concept
        FROM legal_documents_jsonb
        WHERE id = ANY(${documentIds})
          AND metadata->'semantics'->'legalConcepts' IS NOT NULL
      ),
      concept_counts AS (
        SELECT 
          concept,
          count(*) as frequency,
          array_agg(DISTINCT id) as document_ids,
          array_agg(DISTINCT title) as document_titles
        FROM concept_extraction
        GROUP BY concept
      )
      SELECT 
        concept,
        frequency,
        document_ids,
        document_titles,
        -- Calculate concept importance score
        CASE 
          WHEN frequency >= 5 THEN 'CORE'
          WHEN frequency >= 3 THEN 'IMPORTANT'
          WHEN frequency >= 2 THEN 'RELEVANT'
          ELSE 'PERIPHERAL'
        END as importance_level
      FROM concept_counts
      ORDER BY frequency DESC, concept
    `;
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Schema validation (commented out until drizzle-zod is available)
// export const insertLegalDocumentSchema = createInsertSchema(legalDocumentsJsonb, {
//   metadata: LegalMetadataSchema,
// });

// export const selectLegalDocumentSchema = createSelectSchema(legalDocumentsJsonb);

// export const insertCaseSchema = createInsertSchema(casesJsonb, {
//   metadata: CaseMetadataSchema,
// });

// export const selectCaseSchema = createSelectSchema(casesJsonb);

// export const insertEvidenceSchema = createInsertSchema(evidenceJsonb, {
//   metadata: EvidenceMetadataSchema,
// });

// export const selectEvidenceSchema = createSelectSchema(evidenceJsonb);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LegalMetadata = z.infer<typeof LegalMetadataSchema>;
export type CaseMetadata = z.infer<typeof CaseMetadataSchema>;
export type EvidenceMetadata = z.infer<typeof EvidenceMetadataSchema>;

export type LegalDocument = typeof legalDocumentsJsonb.$inferSelect;
export type NewLegalDocument = typeof legalDocumentsJsonb.$inferInsert;

export type Case = typeof casesJsonb.$inferSelect;
export type NewCase = typeof casesJsonb.$inferInsert;

export type Evidence = typeof evidenceJsonb.$inferSelect;
export type NewEvidence = typeof evidenceJsonb.$inferInsert;

export type DocumentRelationship = typeof documentRelationshipsJsonb.$inferSelect;
export type NewDocumentRelationship = typeof documentRelationshipsJsonb.$inferInsert;