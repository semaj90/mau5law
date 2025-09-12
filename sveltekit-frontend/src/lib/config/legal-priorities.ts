/**
 * Legal AI Priority System - NES-Inspired Memory Management
 * 8-bit priority scoring (0-255) for legal document classification
 */

export interface LegalDocument {
  id: string;
  type: DocumentType;
  category: LegalCategory;
  urgency: UrgencyLevel;
  complexity: ComplexityLevel;
  activeReview: boolean;
  lastAccessed: Date;
  fileSize: number;
  isEvidenceCritical: boolean;
}

export type DocumentType = 
  | 'contracts' 
  | 'evidence' 
  | 'motions' 
  | 'briefs' 
  | 'case_law' 
  | 'statutes'
  | 'correspondence'
  | 'expert_reports'
  | 'deposition_transcripts'
  | 'discovery_responses';

export type LegalCategory = 
  | 'litigation' 
  | 'transactional' 
  | 'compliance' 
  | 'regulatory' 
  | 'intellectual_property' 
  | 'employment'
  | 'real_estate'
  | 'corporate'
  | 'criminal'
  | 'family_law';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'archived';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'highly_complex';
export type MemoryBank = 'INTERNAL_RAM' | 'CHR_ROM' | 'PRG_ROM' | 'SAVE_RAM';

/**
 * Base priority weights for different document types (0.0 - 1.0)
 * Higher values = higher priority = faster memory banks
 */
export const LEGAL_PRIORITY_WEIGHTS: Record<DocumentType, number> = {
  // Critical case documents - highest priority
  contracts: 1.0,           // Always need instant access
  evidence: 0.95,           // Critical for case building
  motions: 0.9,            // Time-sensitive court filings
  
  // Important but less urgent
  briefs: 0.85,            // Research documents
  expert_reports: 0.8,     // Analysis documents
  deposition_transcripts: 0.75, // Witness testimony
  
  // Reference materials
  case_law: 0.7,           // Legal precedents
  statutes: 0.65,          // Legal codes
  
  // Administrative documents
  correspondence: 0.5,      // Communications
  discovery_responses: 0.45, // Standard responses
};

/**
 * Category-based priority modifiers
 */
export const CATEGORY_MODIFIERS: Record<LegalCategory, number> = {
  criminal: 1.2,           // Highest stakes
  litigation: 1.15,        // High stakes, time-sensitive
  intellectual_property: 1.1, // Complex, valuable
  employment: 1.05,        // Compliance-sensitive
  corporate: 1.0,          // Standard business
  transactional: 0.95,     // Routine business
  compliance: 0.9,         // Regulatory
  regulatory: 0.85,        // Policy documents
  real_estate: 0.8,        // Property transactions
  family_law: 0.75,        // Personal matters
};

/**
 * Urgency-based multipliers
 */
export const URGENCY_MULTIPLIERS: Record<UrgencyLevel, number> = {
  critical: 2.0,   // Court deadline today/tomorrow
  high: 1.5,       // Court deadline this week
  medium: 1.0,     // Normal workflow
  low: 0.7,        // Background research
  archived: 0.3,   // Historical reference only
};

/**
 * Complexity-based multipliers (complex docs need faster access)
 */
export const COMPLEXITY_MULTIPLIERS: Record<ComplexityLevel, number> = {
  highly_complex: 1.3,  // Multi-party contracts, complex litigation
  complex: 1.15,        // Standard contracts, depositions
  moderate: 1.0,        // Simple motions, correspondence
  simple: 0.85,         // Form documents, basic responses
};

/**
 * NES Memory Bank Configuration
 * Mimics Nintendo's memory architecture for legal document management
 */
export const NES_MEMORY_MAP = {
  // L1 Cache - Ultra-fast GPU memory (1MB)
  INTERNAL_RAM: {
    size: 1024 * 1024,      // 1MB
    speed: 'fastest',
    description: 'Active case documents and evidence',
    minPriority: 200,       // Only top 20% priority docs
    maxItems: 50,           // Limit number of documents
    evictionPolicy: 'LRU'   // Least Recently Used
  },
  
  // L2 Cache - Fast pattern cache (2MB) 
  CHR_ROM: {
    size: 2 * 1024 * 1024,  // 2MB
    speed: 'fast',
    description: 'UI patterns and frequently accessed docs',
    minPriority: 150,       // Top 40% priority docs
    maxItems: 200,          // More documents allowed
    evictionPolicy: 'LFU'   // Least Frequently Used
  },
  
  // L3 Cache - Standard access (4MB)
  PRG_ROM: {
    size: 4 * 1024 * 1024,  // 4MB  
    speed: 'medium',
    description: 'General documents and case law',
    minPriority: 100,       // Top 60% priority docs
    maxItems: 1000,         // Large document set
    evictionPolicy: 'FIFO'  // First In First Out
  },
  
  // Cold storage - Slow but unlimited
  SAVE_RAM: {
    size: Infinity,         // No limit
    speed: 'slow',
    description: 'Archived documents and references',
    minPriority: 0,         // All remaining docs
    maxItems: Infinity,     // No limit
    evictionPolicy: 'none'  // Never evict
  }
} as const;

/**
 * Calculate priority score for a legal document (0-255)
 */
export function calculateDocumentPriority(document: LegalDocument): number {
  // Start with base type weight
  let priority = LEGAL_PRIORITY_WEIGHTS[document.type] || 0.3;
  
  // Apply category modifier
  priority *= CATEGORY_MODIFIERS[document.category] || 1.0;
  
  // Apply urgency multiplier
  priority *= URGENCY_MULTIPLIERS[document.urgency] || 1.0;
  
  // Apply complexity multiplier
  priority *= COMPLEXITY_MULTIPLIERS[document.complexity] || 1.0;
  
  // Boost for active review (being actively worked on)
  if (document.activeReview) {
    priority *= 1.5;
  }
  
  // Boost for evidence-critical documents
  if (document.isEvidenceCritical) {
    priority *= 1.3;
  }
  
  // Recent access boost (decaying over time)
  const hoursSinceAccess = (Date.now() - document.lastAccessed.getTime()) / (1000 * 60 * 60);
  if (hoursSinceAccess < 1) {
    priority *= 1.4;  // Accessed within last hour
  } else if (hoursSinceAccess < 24) {
    priority *= 1.2;  // Accessed today
  } else if (hoursSinceAccess < 168) {
    priority *= 1.1;  // Accessed this week
  }
  
  // Size penalty for very large documents (they consume more cache space)
  const sizeMB = document.fileSize / (1024 * 1024);
  if (sizeMB > 10) {
    priority *= 0.9;  // Large file penalty
  } else if (sizeMB > 50) {
    priority *= 0.8;  // Very large file penalty
  }
  
  // Convert to 8-bit priority (0-255) and clamp
  return Math.min(255, Math.max(0, Math.floor(priority * 255)));
}

/**
 * Select appropriate memory bank based on priority score
 */
export function selectMemoryBank(priority: number): MemoryBank {
  if (priority >= NES_MEMORY_MAP.INTERNAL_RAM.minPriority) {
    return 'INTERNAL_RAM';
  }
  if (priority >= NES_MEMORY_MAP.CHR_ROM.minPriority) {
    return 'CHR_ROM';  
  }
  if (priority >= NES_MEMORY_MAP.PRG_ROM.minPriority) {
    return 'PRG_ROM';
  }
  return 'SAVE_RAM';
}

/**
 * Get memory bank configuration
 */
export function getMemoryBankConfig(bank: MemoryBank) {
  return NES_MEMORY_MAP[bank];
}

/**
 * Priority analysis for debugging
 */
export function analyzePriority(document: LegalDocument) {
  const baseWeight = LEGAL_PRIORITY_WEIGHTS[document.type];
  const categoryMod = CATEGORY_MODIFIERS[document.category];
  const urgencyMult = URGENCY_MULTIPLIERS[document.urgency];
  const complexityMult = COMPLEXITY_MULTIPLIERS[document.complexity];
  const priority = calculateDocumentPriority(document);
  const memoryBank = selectMemoryBank(priority);
  
  return {
    document: document.id,
    baseWeight,
    categoryModifier: categoryMod,
    urgencyMultiplier: urgencyMult,
    complexityMultiplier: complexityMult,
    activeReviewBoost: document.activeReview,
    evidenceCriticalBoost: document.isEvidenceCritical,
    finalPriority: priority,
    memoryBank,
    bankConfig: getMemoryBankConfig(memoryBank)
  };
}