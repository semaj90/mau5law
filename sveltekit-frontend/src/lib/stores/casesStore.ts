
import type { Case } from "$lib/types";
import { writable } from "svelte/store";

export interface CaseStoreData {
  cases: any[];
  stats: any[];
  filters: {
    search: string;
    status: string;
    priority: string;
    sort?: string;
    order?: string;
  };
}
const initialData: CaseStoreData = {
  cases: [],
  stats: [],
  filters: {
    search: "",
    status: "all",
    priority: "all",
    sort: "openedAt",
    order: "desc",
  },
};

export const casesStore = writable<CaseStoreData>(initialData);
;
// Computed stores for easy access
export const activeCases = writable<any[]>([]);
export const caseStats = writable<any[]>([]);
export const filterState = writable<CaseStoreData["filters"]>(
  initialData.filters,
);

// Sync derived stores with main store
casesStore.subscribe((data) => {
  activeCases.set(data.cases);
  caseStats.set(data.stats);
  filterState.set(data.filters);
});

// Helper functions for store operations
export const casesActions = {
  updateCase: (caseId: string, updates: Partial<any>) => {
    casesStore.update((store) => ({
      ...store,
      cases: store.cases.map((c) =>
        c.id === caseId ? { ...c, ...updates } : c,
      ),
    }));
  },

  addCase: (newCase: any) => {
    casesStore.update((store) => ({
      ...store,
      cases: [newCase, ...store.cases],
    }));
  },

  removeCase: (caseId: string) => {
    casesStore.update((store) => ({
      ...store,
      cases: store.cases.filter((c) => c.id !== caseId),
    }));
  },

  updateFilters: (newFilters: Partial<CaseStoreData["filters"]>) => {
    casesStore.update((store) => ({
      ...store,
      filters: { ...store.filters, ...newFilters },
    }));
  },

  setCases: (cases: any[]) => {
    casesStore.update((store) => ({
      ...store,
      cases,
    }));
  },
};
