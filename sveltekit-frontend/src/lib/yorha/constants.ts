// Shared YoRHa constants, types, and utility helpers for production-ready pages
export type YoRHaColumn = { key: string; title: string; sortable?: boolean; filterable?: boolean; width?: number; type?: 'text' | 'number' | 'date' | 'action'; };
export interface YoRHaFormFieldBase { id: string; label: string; required?: boolean; }
export type YoRHaFormField = (YoRHaFormFieldBase & { type: 'text' | 'textarea' | 'date' }) | (YoRHaFormFieldBase & { type: 'select'; options: Array<{ value: string; label: string }> });

export const documentsColumns: YoRHaColumn[] = [
  { key: 'yorha_id', title: 'YORHA ID', sortable: true, width: 140 },
  { key: 'title', title: 'DOCUMENT TITLE', sortable: true, filterable: true, width: 300 },
  { key: 'documentType', title: 'TYPE', sortable: true, filterable: true, width: 120 },
  { key: 'jurisdiction', title: 'JURISDICTION', sortable: true, width: 150 },
  { key: 'yorha_confidence', title: 'CONFIDENCE', sortable: true, width: 120, type: 'number' },
  { key: 'yorha_status', title: 'STATUS', sortable: true, width: 100, type: 'text' },
  { key: 'yorha_timestamp', title: 'PROCESSED', sortable: true, width: 140, type: 'date' },
  { key: 'actions', title: 'ACTIONS', width: 150, type: 'action' }
];

export const casesColumns: YoRHaColumn[] = [
  { key: 'yorha_id', title: 'YORHA ID', sortable: true, width: 140 },
  { key: 'title', title: 'CASE TITLE', sortable: true, filterable: true, width: 300 },
  { key: 'caseNumber', title: 'CASE NUMBER', sortable: true, width: 150 },
  { key: 'yorha_priority', title: 'PRIORITY', sortable: true, width: 100, type: 'text' },
  { key: 'assignedTo', title: 'ASSIGNED TO', sortable: true, width: 150 },
  { key: 'yorha_status', title: 'STATUS', sortable: true, width: 100, type: 'text' },
  { key: 'yorha_timestamp', title: 'CREATED', sortable: true, width: 140, type: 'date' },
  { key: 'actions', title: 'ACTIONS', width: 150, type: 'action' }
];

export const evidenceColumns: YoRHaColumn[] = [
  { key: 'yorha_id', title: 'YORHA ID', sortable: true, width: 140 },
  { key: 'title', title: 'EVIDENCE TITLE', sortable: true, filterable: true, width: 250 },
  { key: 'evidenceType', title: 'TYPE', sortable: true, width: 120, type: 'text' },
  { key: 'caseId', title: 'CASE ID', sortable: true, width: 120 },
  { key: 'collectedBy', title: 'COLLECTED BY', sortable: true, width: 150 },
  { key: 'yorha_status', title: 'STATUS', sortable: true, width: 100, type: 'text' },
  { key: 'yorha_timestamp', title: 'COLLECTED', sortable: true, width: 140, type: 'date' },
  { key: 'actions', title: 'ACTIONS', width: 150, type: 'action' }
];

export const documentFormFields: YoRHaFormField[] = [
  { id: 'title', label: 'Document Title', type: 'text', required: true },
  { id: 'content', label: 'Content', type: 'textarea', required: true },
  { id: 'documentType', label: 'Document Type', type: 'select', required: true, options: [
    { value: 'contract', label: 'Contract' },
    { value: 'statute', label: 'Statute' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'precedent', label: 'Legal Precedent' },
    { value: 'brief', label: 'Legal Brief' }
  ]},
  { id: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
  { id: 'court', label: 'Court', type: 'text' },
  { id: 'citation', label: 'Citation', type: 'text' }
];

export const caseFormFields: YoRHaFormField[] = [
  { id: 'title', label: 'Case Title', type: 'text', required: true },
  { id: 'description', label: 'Description', type: 'textarea', required: true },
  { id: 'caseNumber', label: 'Case Number', type: 'text', required: true },
  { id: 'priority', label: 'Priority', type: 'select', required: true, options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ]},
  { id: 'assignedTo', label: 'Assigned To', type: 'text' },
  { id: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' }
  ]}
];

export const evidenceFormFields: YoRHaFormField[] = [
  { id: 'title', label: 'Evidence Title', type: 'text', required: true },
  { id: 'description', label: 'Description', type: 'textarea', required: true },
  { id: 'evidenceType', label: 'Evidence Type', type: 'select', required: true, options: [
    { value: 'document', label: 'Document' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'digital', label: 'Digital Evidence' },
    { value: 'physical', label: 'Physical Evidence' }
  ]},
  { id: 'caseId', label: 'Case ID', type: 'text' },
  { id: 'collectedBy', label: 'Collected By', type: 'text', required: true },
  { id: 'collectedAt', label: 'Collection Date', type: 'date' }
];

export const YO_RHA_FETCH_TIMEOUT_MS = 12000;

type AbortLike = { signal?: any; abort?: () => void };

/**
 * withAbort - Accepts a function that receives an optional signal (for environments
 * that have AbortController) and returns an object with the promise and an abort function.
 * Uses a runtime check to avoid TypeScript/compile errors when DOM types are unavailable.
 */
export function withAbort<T>(fn: (signal?: any) => Promise<T>): { promise: Promise<T>; abort: () => void } {
  const controller = (typeof AbortController !== 'undefined')
    ? (new AbortController() as AbortLike)
    : ({ signal: undefined, abort: () => { } } as AbortLike);

  return {
    promise: fn(controller.signal),
    abort: () => controller.abort && controller.abort()
  };
}

/**
 * debounce - Simple debounce helper that returns a debounced version of the provided function.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return function (this: any, ...a: any[]) {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn.apply(this, a), wait);
  } as T;
}
