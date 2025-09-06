
import { writable, derived } from "svelte/store";
import { browser } from "$app/environment";
// TODO: Fix import - // Orphaned content: import {  // Case data store
export const cases = writable<any[]>([]);
;
// Search and filter state
export const caseSearch = writable("");
export const caseFilters = writable({
  status: "",
  priority: "",
  dateRange: { start: "", end: "" },
});

// Filtered cases (derived store)
export const filteredCases = derived(
  [cases, caseSearch, caseFilters],
  ([$cases, $search, $filters]) =>
    $cases.filter((case_) => {
      const matchesSearch = (case_.title || "")
        .toString()
        .toLowerCase()
        .includes($search.toLowerCase());
      const matchesStatus = !$filters.status || case_.status === $filters.status;
      const matchesPriority = !$filters.priority || case_.priority === $filters.priority;
      return matchesSearch && matchesStatus && matchesPriority;
    })
);

// UI state
export const selectedCase = writable<string | null>(null);
export const sidebarOpen = writable(false);
;
// Functions for case management
export const caseStore = {
  // Load cases (call from +page.server.ts load function)
  init: (initialCases: any[]) => {
    cases.set(initialCases);
  },

  // Add a new case (optimistic update)
  add: (newCase: any) => {
    cases.update((list) => [newCase, ...list]);
  },

  // Update case status optimistically
  updateStatus: (caseId: string, status: string) => {
    cases.update((list) =>
      list.map((c) => (c.id === caseId ? { ...c, status } : c)),
    );
  },

  // Refresh from server if needed
  refresh: async () => {
    if (browser) {
      const response = await fetch("/api/cases");
      const latestCases = await response.json();
      cases.set(latestCases);
    }
  },
};

export default caseStore;
