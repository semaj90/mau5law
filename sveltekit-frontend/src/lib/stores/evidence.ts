/**
 * Evidence Store - Legal AI Platform
 * Comprehensive evidence management with chain of custody, encryption, and legal compliance
 * Supports digital forensics, case management, and audit trail requirements
 */

import { writable, get, derived } from "svelte/store";
import { selectedCase } from "./case-store";

// Core Evidence Interface
export interface Evidence {
  id: string;
  caseId: string;
  title: string;
  type: "document" | "image" | "video" | "audio" | "note" | "digital_forensic" | "physical_item";
  content: string; // URL for files, text for notes
  x: number; // Position on canvas
  y: number; // Position on canvas

  // Legal-specific properties
  embedding?: number[];
  hash?: string; // File integrity hash
  originalHash?: string; // Original file hash for chain of custody
  chain_of_custody: ChainOfCustodyEntry[];
  evidence_tag: string; // Police/court evidence tag number
  collected_by: string; // Officer/investigator name
  collected_date: string; // ISO date string
  location_collected?: string;

  // Security and privacy
  confidentiality_level: 'public' | 'confidential' | 'privileged' | 'attorney_client';
  encrypted: boolean;
  access_log: AccessLogEntry[];

  // Processing metadata
  processed: boolean;
  ocr_text?: string; // Extracted text from documents/images
  analysis_results?: AnalysisResult[];
  keywords?: string[];

  // File metadata
  file_size?: number;
  mime_type?: string;
  original_filename?: string;
  thumbnail_url?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_accessed?: string;

  // Legal relevance scoring
  relevance_score?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Relationships
  related_evidence_ids?: string[];
  parent_evidence_id?: string; // For derived evidence

  // Notes and annotations
  notes?: EvidenceNote[];
  tags?: string[];
}

export interface ChainOfCustodyEntry {
  id: string;
  timestamp: string;
  action: 'collected' | 'transferred' | 'accessed' | 'analyzed' | 'duplicated' | 'sealed' | 'unsealed';
  person: string;
  organization?: string;
  location?: string;
  purpose?: string;
  signature?: string;
  witness?: string;
  notes?: string;
}

export interface AccessLogEntry {
  timestamp: string;
  user_id: string;
  user_name: string;
  action: 'view' | 'download' | 'edit' | 'delete' | 'share' | 'print';
  ip_address?: string;
  user_agent?: string;
  purpose?: string;
}

export interface AnalysisResult {
  id: string;
  type: 'ocr' | 'image_analysis' | 'audio_transcription' | 'video_analysis' | 'forensic_analysis';
  result: any;
  confidence: number;
  timestamp: string;
  tool_used: string;
  version?: string;
}

export interface EvidenceNote {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  type: 'observation' | 'analysis' | 'legal_note' | 'technical_note';
  confidential: boolean;
}

export interface EvidenceFilter {
  type?: string[];
  confidentiality_level?: string[];
  priority?: string[];
  date_range?: { start: string; end: string };
  collected_by?: string[];
  tags?: string[];
  search_text?: string;
  processed_only?: boolean;
  unprocessed_only?: boolean;
}

export interface EvidenceStats {
  total_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_confidentiality: Record<string, number>;
  processed_count: number;
  unprocessed_count: number;
  encrypted_count: number;
  total_file_size: number;
  average_relevance_score: number;
}

// Store State Interface
export interface EvidenceStoreState {
  evidence: Evidence[];
  filtered_evidence: Evidence[];
  current_filter: EvidenceFilter | null;
  selected_evidence: Evidence | null;
  isLoading: boolean;
  error: string | null;
  processing_queue: string[]; // Evidence IDs being processed
  stats: EvidenceStats | null;
  chain_of_custody_log: ChainOfCustodyEntry[];
  security_alerts: SecurityAlert[];
}

export interface SecurityAlert {
  id: string;
  type: 'unauthorized_access' | 'integrity_check_failed' | 'chain_break' | 'encryption_error';
  evidence_id: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

// Evidence Store Implementation
const createEvidenceStore = () => {
  const { subscribe, set, update } = writable<EvidenceStoreState>({
    evidence: [],
    filtered_evidence: [],
    current_filter: null,
    selected_evidence: null,
    isLoading: false,
    error: null,
    processing_queue: [],
    stats: null,
    chain_of_custody_log: [],
    security_alerts: []
  });

  const fetchEvidence = async (caseId: string | null): Promise<any> => {
    if (!caseId) {
      set({
        evidence: [],
        filtered_evidence: [],
        current_filter: null,
        selected_evidence: null,
        isLoading: false,
        error: null,
        processing_queue: [],
        stats: null,
        chain_of_custody_log: [],
        security_alerts: []
      });
      return;
    }

    update((state) => ({ ...state, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/evidence/list?caseId=${caseId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Legal-Request': 'true'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch evidence");
      }

      const evidenceData = await response.json();
      const evidenceList: Evidence[] = evidenceData.evidence || [];
      const stats: EvidenceStats = evidenceData.stats || null;

      // Validate evidence integrity
      await validateEvidenceIntegrity(evidenceList);

      update((state) => ({
        ...state,
        evidence: evidenceList,
        filtered_evidence: evidenceList,
        stats,
        isLoading: false,
        error: null
      }));

      // Log access for audit trail
      await logEvidenceAccess(caseId, 'case_evidence_accessed');

    } catch (error: any) {
      console.error("Error fetching evidence:", error);
      update((state) => ({
        ...state,
        evidence: [],
        filtered_evidence: [],
        isLoading: false,
        error: error.message
      }));
    }
  };

  // Automatically fetch evidence when selected case changes
  selectedCase.subscribe((caseId) => {
    fetchEvidence(caseId);
  });

  return {
    subscribe,
    fetchEvidence,

    // Add new evidence with comprehensive metadata
    addEvidence: async (
      newEvidenceData: Omit<Evidence, "id" | "x" | "y" | "caseId" | "created_at" | "updated_at" | "chain_of_custody" | "access_log">
    ) => {
      update((state) => ({ ...state, isLoading: true }));
      const currentCaseId = get(selectedCase);

      if (!currentCaseId) {
        const err = "No case selected to add evidence to.";
        update((state) => ({ ...state, isLoading: false, error: err }));
        console.error(err);
        return;
      }

      try {
        // Create initial chain of custody entry
        const initialChainEntry: Omit<ChainOfCustodyEntry, 'id'> = {
          timestamp: new Date().toISOString(),
          action: 'collected',
          person: newEvidenceData.collected_by,
          location: newEvidenceData.location_collected,
          purpose: 'Evidence collection for case investigation',
          notes: `Evidence "${newEvidenceData.title}" added to case system`
        };

        const evidencePayload = {
          ...newEvidenceData,
          caseId: currentCaseId,
          chain_of_custody: [initialChainEntry],
          access_log: [],
          x: Math.random() * 500, // Default canvas position
          y: Math.random() * 500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const response = await fetch("/api/evidence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify(evidencePayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add evidence");
        }

        const createdEvidence: Evidence = await response.json();

        update((state) => ({
          ...state,
          evidence: [...state.evidence, createdEvidence],
          filtered_evidence: applyFilter([...state.evidence, createdEvidence], state.current_filter),
          isLoading: false,
        }));

        // Log evidence addition
        await logEvidenceAccess(createdEvidence.id, 'evidence_added');

        return createdEvidence;

      } catch (error: any) {
        update((state) => ({
          ...state,
          isLoading: false,
          error: error.message,
        }));
        console.error("Error adding evidence:", error);
        throw error;
      }
    },

    // Update evidence with optimistic updates and chain of custody
    updateEvidence: async (
      evidenceId: string,
      updates: Partial<Omit<Evidence, "id" | "caseId" | "created_at">>,
      chainOfCustodyAction?: {
        action: ChainOfCustodyEntry['action'];
        person: string;
        purpose?: string;
        notes?: string;
      }
    ) => {
      let originalEvidence: Evidence | undefined;

      // Optimistic update
      update((state) => {
        originalEvidence = state.evidence.find((item) => item.id === evidenceId);
        const updatedEvidence = state.evidence.map((item) => {
          if (item.id === evidenceId) {
            const updated = {
              ...item,
              ...updates,
              updated_at: new Date().toISOString()
            };

            // Add chain of custody entry if provided
            if (chainOfCustodyAction) {
              const chainEntry: ChainOfCustodyEntry = {
                id: `chain_${Date.now()}`,
                timestamp: new Date().toISOString(),
                ...chainOfCustodyAction
              };
              updated.chain_of_custody = [...updated.chain_of_custody, chainEntry];
            }

            return updated;
          }
          return item;
        });

        return {
          ...state,
          evidence: updatedEvidence,
          filtered_evidence: applyFilter(updatedEvidence, state.current_filter)
        };
      });

      try {
        const payload: any = { ...updates };
        if (chainOfCustodyAction) {
          payload.chain_of_custody_action = chainOfCustodyAction;
        }

        const response = await fetch(`/api/evidence/${evidenceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update evidence");
        }

        // Log evidence modification
        await logEvidenceAccess(evidenceId, 'evidence_modified');

      } catch (error: any) {
        console.error("Error updating evidence:", error);

        // Revert optimistic update on failure
        if (originalEvidence) {
          const original = originalEvidence;
          update((state) => ({
            ...state,
            evidence: state.evidence.map((item) =>
              item.id === evidenceId ? original : item
            ),
            filtered_evidence: applyFilter(
              state.evidence.map((item) => item.id === evidenceId ? original : item),
              state.current_filter
            ),
            error: error.message,
          }));
        }
        throw error;
      }
    },

    // Delete evidence with audit trail
    deleteEvidence: async (evidenceId: string, reason?: string) => {
      let originalList: Evidence[] = [];

      // Optimistic update
      update((state) => {
        originalList = state.evidence;
        const newList = state.evidence.filter((item) => item.id !== evidenceId);
        return {
          ...state,
          evidence: newList,
          filtered_evidence: applyFilter(newList, state.current_filter)
        };
      });

      try {
        const response = await fetch(`/api/evidence/${evidenceId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete evidence");
        }

        // Log evidence deletion
        await logEvidenceAccess(evidenceId, 'evidence_deleted', { reason });

      } catch (error: any) {
        console.error("Error deleting evidence:", error);

        // Revert optimistic update on failure
        update((state) => ({
          ...state,
          evidence: originalList,
          filtered_evidence: applyFilter(originalList, state.current_filter),
          error: error.message,
        }));
        throw error;
      }
    },

    // Process evidence (OCR, analysis, etc.)
    processEvidence: async (evidenceId: string, processingType: 'ocr' | 'analysis' | 'forensic') => {
      update((state) => ({
        ...state,
        processing_queue: [...state.processing_queue, evidenceId]
      }));

      try {
        const response = await fetch(`/api/evidence/${evidenceId}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify({ type: processingType }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to process evidence");
        }

        const processedEvidence: Evidence = await response.json();

        update((state) => ({
          ...state,
          evidence: state.evidence.map((item) =>
            item.id === evidenceId ? processedEvidence : item
          ),
          filtered_evidence: applyFilter(
            state.evidence.map((item) => item.id === evidenceId ? processedEvidence : item),
            state.current_filter
          ),
          processing_queue: state.processing_queue.filter(id => id !== evidenceId)
        }));

        // Log evidence processing
        await logEvidenceAccess(evidenceId, 'evidence_processed', { type: processingType });

        return processedEvidence;

      } catch (error: any) {
        update((state) => ({
          ...state,
          processing_queue: state.processing_queue.filter(id => id !== evidenceId),
          error: error.message
        }));
        throw error;
      }
    },

    // Filter evidence
    filterEvidence: (filter: EvidenceFilter | null) => {
      update((state) => {
        const filtered = applyFilter(state.evidence, filter);
        return {
          ...state,
          current_filter: filter,
          filtered_evidence: filtered
        };
      });
    },

    // Search evidence
    searchEvidence: async (query: string, options?: {
      include_content?: boolean;
      include_notes?: boolean;
      case_sensitive?: boolean;
    }) => {
      const { include_content = true, include_notes = true, case_sensitive = false } = options || {};

      update((state) => {
        const searchTerm = case_sensitive ? query : query.toLowerCase();

        const filtered = state.evidence.filter((evidence) => {
          const title = case_sensitive ? evidence.title : evidence.title.toLowerCase();
          const ocrText = evidence.ocr_text ? (case_sensitive ? evidence.ocr_text : evidence.ocr_text.toLowerCase()) : '';
          const tags = evidence.tags?.join(' ') || '';
          const notes = evidence.notes?.map(n => n.content).join(' ') || '';

          const searchIn = [
            title,
            evidence.evidence_tag,
            tags,
            ...(include_content ? [ocrText] : []),
            ...(include_notes ? [notes] : [])
          ].join(' ');

          return (case_sensitive ? searchIn : searchIn.toLowerCase()).includes(searchTerm);
        });

        return {
          ...state,
          filtered_evidence: filtered,
          current_filter: { search_text: query }
        };
      });
    },

    // Select evidence for detailed view
    selectEvidence: (evidenceId: string | null) => {
      update((state) => {
        const selected = evidenceId ? state.evidence.find(e => e.id === evidenceId) || null : null;

        if (selected) {
          // Log evidence access
          logEvidenceAccess(evidenceId!, 'evidence_viewed');
        }

        return {
          ...state,
          selected_evidence: selected
        };
      });
    },

    // Chain of custody operations
    addChainOfCustodyEntry: async (evidenceId: string, entry: Omit<ChainOfCustodyEntry, 'id' | 'timestamp'>) => {
      try {
        const response = await fetch(`/api/evidence/${evidenceId}/chain-of-custody`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add chain of custody entry");
        }

        const updatedEvidence: Evidence = await response.json();

        update((state) => ({
          ...state,
          evidence: state.evidence.map((item) =>
            item.id === evidenceId ? updatedEvidence : item
          ),
          filtered_evidence: applyFilter(
            state.evidence.map((item) => item.id === evidenceId ? updatedEvidence : item),
            state.current_filter
          )
        }));

        return updatedEvidence;

      } catch (error: any) {
        update((state) => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Generate evidence report
    generateEvidenceReport: async (evidenceIds: string[], reportType: 'chain_of_custody' | 'analysis' | 'summary') => {
      try {
        const response = await fetch('/api/evidence/report', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify({ evidenceIds, reportType }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to generate evidence report");
        }

        return await response.blob(); // PDF or other report format

      } catch (error: any) {
        update((state) => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Security and compliance
    validateIntegrity: async (evidenceId: string) => {
      try {
        const response = await fetch(`/api/evidence/${evidenceId}/validate`, {
          method: "POST",
          headers: { "X-Legal-Request": "true" }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to validate evidence integrity");
        }

        const validation = await response.json();

        if (!validation.valid) {
          update((state) => ({
            ...state,
            security_alerts: [
              ...state.security_alerts,
              {
                id: `alert_${Date.now()}`,
                type: 'integrity_check_failed',
                evidence_id: evidenceId,
                message: validation.message || 'Evidence integrity check failed',
                timestamp: new Date().toISOString(),
                severity: 'high',
                resolved: false
              }
            ]
          }));
        }

        return validation;

      } catch (error: any) {
        update((state) => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Utility methods
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    clearFilter: () => {
      update((state) => ({
        ...state,
        current_filter: null,
        filtered_evidence: state.evidence
      }));
    },

    refreshStats: async () => {
      const currentCaseId = get(selectedCase);
      if (!currentCaseId) return;

      try {
        const response = await fetch(`/api/evidence/stats?caseId=${currentCaseId}`, {
          headers: { "X-Legal-Request": "true" }
        });

        if (response.ok) {
          const stats = await response.json();
          update((state) => ({ ...state, stats }));
        }
      } catch (error: any) {
        console.error("Failed to refresh stats:", error);
      }
    },

    // Export evidence for legal discovery
    exportEvidence: async (evidenceIds: string[], format: 'json' | 'pdf' | 'zip') => {
      try {
        const response = await fetch('/api/evidence/export', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Legal-Request": "true"
          },
          body: JSON.stringify({ evidenceIds, format }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to export evidence");
        }

        return await response.blob();

      } catch (error: any) {
        update((state) => ({ ...state, error: error.message }));
        throw error;
      }
    }
  };
};

// Helper functions
function applyFilter(evidence: Evidence[], filter: EvidenceFilter | null): Evidence[] {
  if (!filter) return evidence;

  return evidence.filter((item) => {
    // Type filter
    if (filter.type && filter.type.length > 0 && !filter.type.includes(item.type)) {
      return false;
    }

    // Confidentiality filter
    if (filter.confidentiality_level && filter.confidentiality_level.length > 0 &&
        !filter.confidentiality_level.includes(item.confidentiality_level)) {
      return false;
    }

    // Priority filter
    if (filter.priority && filter.priority.length > 0 && !filter.priority.includes(item.priority)) {
      return false;
    }

    // Date range filter
    if (filter.date_range) {
      const itemDate = new Date(item.collected_date);
      const startDate = new Date(filter.date_range.start);
      const endDate = new Date(filter.date_range.end);
      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }

    // Collected by filter
    if (filter.collected_by && filter.collected_by.length > 0 &&
        !filter.collected_by.includes(item.collected_by)) {
      return false;
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      const itemTags = item.tags || [];
      if (!filter.tags.some(tag => itemTags.includes(tag))) {
        return false;
      }
    }

    // Text search filter
    if (filter.search_text) {
      const searchText = filter.search_text.toLowerCase();
      const searchableText = [
        item.title,
        item.evidence_tag,
        item.collected_by,
        item.ocr_text || '',
        (item.tags || []).join(' '),
        (item.notes || []).map(n => n.content).join(' ')
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchText)) {
        return false;
      }
    }

    // Processing status filters
    if (filter.processed_only && !item.processed) {
      return false;
    }

    if (filter.unprocessed_only && item.processed) {
      return false;
    }

    return true;
  });
}

async function validateEvidenceIntegrity(evidence: Evidence[]): Promise<void> {
  // Validate file hashes and integrity
  for (const item of evidence) {
    if (item.hash && item.originalHash && item.hash !== item.originalHash) {
      console.warn(`Evidence integrity check failed for ${item.id}: hash mismatch`);
    }
  }
}

async function logEvidenceAccess(evidenceId: string, action: string, metadata?: unknown): Promise<void> {
  try {
    await fetch('/api/evidence/access-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Legal-Request': 'true'
      },
      body: JSON.stringify({
        evidence_id: evidenceId,
        action,
        timestamp: new Date().toISOString(),
        metadata
      })
    });
  } catch (error: any) {
    console.error('Failed to log evidence access:', error);
  }
}

// Create and export the primary evidence store
export const evidenceStore = createEvidenceStore();

// Derived stores (aligned with snake_case state properties)
export const filteredEvidence = derived(evidenceStore, ($s) => $s.filtered_evidence);
export const selectedEvidence = derived(evidenceStore, ($s) => $s.selected_evidence);
export const isEvidenceLoading = derived(evidenceStore, ($s) => $s.isLoading);
export const evidenceError = derived(evidenceStore, ($s) => $s.error);
export const evidenceStats = derived(evidenceStore, ($s) => $s.stats);
export const pendingEvidenceIds = derived(evidenceStore, ($s) => $s.processing_queue);
export const allSecurityAlerts = derived(evidenceStore, ($s) => $s.security_alerts);
export const securityAlerts = derived(evidenceStore, ($s) => $s.security_alerts.filter(a => !a.resolved));

// Helper utilities (exported as standalone functions)
export function getUnprocessedEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.filter(item => !item.processed);
}

export function calculateEvidenceStats(evidence: Evidence[]): EvidenceStats {
  const stats: EvidenceStats = {
    total_count: evidence.length,
    by_type: {},
    by_priority: {},
    by_confidentiality: {},
    processed_count: 0,
    unprocessed_count: 0,
    encrypted_count: 0,
    total_file_size: 0,
    average_relevance_score: 0
  };

  let totalRelevanceScore = 0;
  let relevanceScoreCount = 0;

  for (const item of evidence) {
    stats.by_type[item.type] = (stats.by_type[item.type] || 0) + 1;
    stats.by_priority[item.priority] = (stats.by_priority[item.priority] || 0) + 1;
    stats.by_confidentiality[item.confidentiality_level] = (stats.by_confidentiality[item.confidentiality_level] || 0) + 1;
    if (item.processed) stats.processed_count++; else stats.unprocessed_count++;
    if (item.encrypted) stats.encrypted_count++;
    if (item.file_size) stats.total_file_size += item.file_size;
    if (item.relevance_score !== undefined) {
      totalRelevanceScore += item.relevance_score;
      relevanceScoreCount++;
    }
  }

  stats.average_relevance_score = relevanceScoreCount > 0 ? totalRelevanceScore / relevanceScoreCount : 0;
  return stats;
}

export function validateChainOfCustody(evidence: Evidence): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const chain = evidence.chain_of_custody;
  if (chain.length === 0) {
    issues.push('No chain of custody entries found');
    return { valid: false, issues };
  }
  for (let i = 1; i < chain.length; i++) {
    const prev = new Date(chain[i - 1].timestamp);
    const curr = new Date(chain[i].timestamp);
    if (curr < prev) issues.push(`Chain of custody timestamp out of order at entry ${i + 1}`);
  }
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (!entry.person) issues.push(`Missing person information at entry ${i + 1}`);
    if (!entry.action) issues.push(`Missing action information at entry ${i + 1}`);
  }
  return { valid: issues.length === 0, issues };
}

// Default export retained for compatibility
export default evidenceStore;