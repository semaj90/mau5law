import { createActor } from 'xstate';
import { legalCaseMachine } from '$lib/state/legal-case-machine';
import { browser } from '$app/environment';

// Create the XState actor for legal case management
const legalCaseActor = browser ? createActor(legalCaseMachine).start() : null;
const initialSnapshot = legalCaseActor?.getSnapshot();

// Svelte 5 reactive store
export const legalCaseStore = $state({
  context: (initialSnapshot && 'context' in initialSnapshot ? (initialSnapshot as any).context : undefined) || {
    cases: [],
    selectedCase: null,
    currentUser: null,
    loading: false,
    error: null,
    generatingEmbedding: false,
    searchingRelatedEvidence: false,
    relatedEvidence: [],
    lastEmbedding: null
  }
});

// Update store when actor state changes
if (legalCaseActor) {
  legalCaseActor.subscribe((snapshot) => {
    const ctx = (snapshot as any).context;
    if (ctx) Object.assign(legalCaseStore.context, ctx);
  });
}

// Actions that send events to the XState machine
export const legalCaseActions = {
  loadCases: () => legalCaseActor?.send({ type: 'LOAD_CASES' }),

  selectCase: (caseId: string) =>
    legalCaseActor?.send({ type: 'SELECT_CASE', caseId }),

  updateCase: (caseData: any) =>
    legalCaseActor?.send({ type: 'UPDATE_CASE', caseData }),

  generateEmbedding: (payload: {
    caseId: string;
    evidenceText: string;
    userId: string;
  }) => legalCaseActor?.send({
    type: 'GENERATE_EMBEDDING',
    ...payload
  }),

  searchRelatedEvidence: (payload: {
    caseId: string;
    query: string;
    userId: string;
    limit?: number;
  }) => legalCaseActor?.send({
    type: 'SEARCH_RELATED_EVIDENCE',
    ...payload
  }),

  clearRelatedEvidence: () =>
    legalCaseActor?.send({ type: 'CLEAR_RELATED_EVIDENCE' }),

  setUser: (user: any) =>
    legalCaseActor?.send({ type: 'SET_USER', user }),

  resetError: () =>
    legalCaseActor?.send({ type: 'RESET_ERROR' })
};

// Getter functions for derived state
export const legalCaseGetters = {
  isLoading: () => legalCaseStore.context.loading ||
                   legalCaseStore.context.generatingEmbedding ||
                   legalCaseStore.context.searchingRelatedEvidence,

  hasRelatedEvidence: () => legalCaseStore.context.relatedEvidence?.length > 0,

  getRelatedEvidenceCount: () => legalCaseStore.context.relatedEvidence?.length || 0,

  getCurrentCase: () => legalCaseStore.context.selectedCase,

  getEmbeddingStatus: () => ({
    generating: legalCaseStore.context.generatingEmbedding,
    searching: legalCaseStore.context.searchingRelatedEvidence,
    hasResults: legalCaseStore.context.relatedEvidence?.length > 0
  })
};