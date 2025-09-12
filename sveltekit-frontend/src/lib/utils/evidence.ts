// Stub evidence utilities to satisfy vector-suggestions-service imports

export function getEvidenceKind(evidence: any): string {
  // Attempt to infer a type from common fields
  return evidence?.evidenceType || evidence?.type || evidence?.metadata?.type || 'generic';
}

export function buildEvidenceTypeDetails(evidence: any): any {
  return {
    kind: getEvidenceKind(evidence),
    size: evidence?.size || evidence?.content?.length || 0,
    hasEmbedding: Array.isArray(evidence?.embedding),
    significance: evidence?.significance || evidence?.metadata?.significance || 'unknown'
  };
}
