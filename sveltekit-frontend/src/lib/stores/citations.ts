import { randomUUID } from "crypto";

import { writable } from "svelte/store";

export interface Citation {
  id: string;
  title: string;
  content: string;
  author?: string;
  date?: string;
  source?: string;
  type: "case" | "statute" | "regulation" | "secondary" | "other";
  tags?: string[];
  url?: string;
  pageNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitationStore {
  citations: Citation[];
  recentCitations: Citation[];
  searchQuery: string;
  selectedCategories: string[];
}

// Create the store
function createCitationStore() {
  const { subscribe, set, update } = writable<CitationStore>({
    citations: [],
    recentCitations: [],
    searchQuery: "",
    selectedCategories: [],
  });

  return {
    subscribe,
    set,
    update,

    // Add a new citation
    addCitation: (
      citation: Omit<Citation, "id" | "createdAt" | "updatedAt">,
    ) => {
      const newCitation: Citation = {
        ...citation,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      update((store) => ({
        ...store,
        citations: [...store.citations, newCitation],
        recentCitations: [newCitation, ...store.recentCitations.slice(0, 9)], // Keep last 10
      }));

      return newCitation;
    },

    // Update an existing citation
    updateCitation: (id: string, updates: Partial<Citation>) => {
      update((store) => ({
        ...store,
        citations: store.citations.map((citation) =>
          citation.id === id
            ? { ...citation, ...updates, updatedAt: new Date() }
            : citation,
        ),
      }));
    },

    // Delete a citation
    deleteCitation: (id: string) => {
      update((store) => ({
        ...store,
        citations: store.citations.filter((citation) => citation.id !== id),
        recentCitations: store.recentCitations.filter(
          (citation) => citation.id !== id,
        ),
      }));
    },

    // Search citations
    searchCitations: (query: string) => {
      update((store) => ({
        ...store,
        searchQuery: query,
      }));
    },

    // Get filtered citations
    getFilteredCitations: (store: CitationStore) => {
      let filtered = store.citations;

      // Filter by search query
      if (store.searchQuery) {
        const query = store.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (citation) =>
            citation.title.toLowerCase().includes(query) ||
            citation.content.toLowerCase().includes(query) ||
            citation.author?.toLowerCase().includes(query) ||
            citation.source?.toLowerCase().includes(query) ||
            citation.tags?.some((tag) => tag.toLowerCase().includes(query)),
        );
      }
      // Filter by categories
      if (store.selectedCategories.length > 0) {
        filtered = filtered.filter((citation) =>
          store.selectedCategories.includes(citation.type),
        );
      }
      return filtered;
    },

    // Get recent citations
    getRecentCitations: (store: CitationStore, limit = 5) => {
      return store.recentCitations.slice(0, limit);
    },

    // Mark citation as recently used
    markAsRecentlyUsed: (id: string) => {
      update((store) => {
        const citation = store.citations.find((c) => c.id === id);
        if (citation) {
          const updatedRecent = [
            citation,
            ...store.recentCitations.filter((c) => c.id !== id),
          ].slice(0, 10);

          return {
            ...store,
            recentCitations: updatedRecent,
          };
        }
        return store;
      });
    },

    // Load citations from API
    loadCitations: async () => {
      try {
        const response = await fetch("/api/citations");
        if (response.ok) {
          const data = await response.json();
          update((store) => ({
            ...store,
            citations: data.citations || [],
            recentCitations: data.recentCitations || [],
          }));
        }
      } catch (error: any) {
        console.error("Failed to load citations:", error);
      }
    },

    // Save citation to API
    saveCitation: async (citation: Citation) => {
      try {
        const response = await fetch("/api/citations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(citation),
        });

        if (response.ok) {
          const savedCitation = await response.json();
          update((store) => ({
            ...store,
            citations: store.citations.map((c) =>
              c.id === citation.id ? savedCitation : c,
            ),
          }));
          return savedCitation;
        }
      } catch (error: any) {
        console.error("Failed to save citation:", error);
      }
      return null;
    },
  };
}

export const citationStore = createCitationStore();
;
// Sample citations for development
const sampleCitations: Citation[] = [
  {
    id: "1",
    title: "Miranda v. Arizona",
    content:
      "The Court held that both inculpatory and exculpatory statements made in response to interrogation by a defendant in police custody will be admissible at trial only if the prosecution can show that the defendant was informed of the right to consult with an attorney.",
    author: "U.S. Supreme Court",
    date: "1966",
    source: "384 U.S. 436",
    type: "case",
    tags: ["criminal procedure", "constitutional law", "miranda rights"],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "Federal Rules of Evidence Rule 404",
    content:
      "Evidence of a person's character or character trait is not admissible to prove that on a particular occasion the person acted in accordance with the character or trait.",
    source: "Fed. R. Evid. 404",
    type: "statute",
    tags: ["evidence", "character evidence", "federal rules"],
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "3",
    title: "Daubert v. Merrell Dow Pharmaceuticals",
    content:
      "The Federal Rules of Evidence, not Frye, provide the standard for admitting expert scientific testimony in federal court.",
    author: "U.S. Supreme Court",
    date: "1993",
    source: "509 U.S. 579",
    type: "case",
    tags: ["expert testimony", "scientific evidence", "daubert standard"],
    createdAt: new Date("2024-01-17"),
    updatedAt: new Date("2024-01-17"),
  },
];

// Initialize with sample data in development
if (
  typeof window !== "undefined" &&
  !localStorage.getItem("citations-initialized")
) {
  citationStore.update((store) => ({
    ...store,
    citations: sampleCitations,
    recentCitations: sampleCitations.slice(0, 3),
  }));
  localStorage.setItem("citations-initialized", "true");
}

export default citationStore;
