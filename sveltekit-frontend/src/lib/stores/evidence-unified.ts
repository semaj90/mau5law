/// <reference types="vite/client" />
import { writable, derived, get } from "svelte/store";

/**
 * FIXED Evidence Unified Store - Phase 2 Integration
 * Addresses critical and compatibility issues
 */

import { browser } from "$app/environment";

// Safe import with fallback
let selectedCase: any;
try {
  const casesModule = await import("./cases");
  selectedCase = casesModule.selectedCase || writable(null);
} catch {
  console.warn("Cases store not found, using fallback");
  selectedCase = writable(null);
}

export interface Evidence {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  type: "document" | "image" | "video" | "audio" | "note" | "physical";
  content: string;
  x: number;
  y: number;
  fileUrl?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  embedding?: number[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  classification?: {
    category: string;
    relevance: number;
    confidence: number;
  };
  timeline?: {
    createdAt: string;
    updatedAt: string;
    collectedAt?: string;
  };
  analysis?: {
    aiSummary?: string;
    vectorSimilarity?: number;
    relatedEvidence?: string[];
  };
}

export interface EvidenceStoreState {
  evidence: Evidence[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

class UnifiedEvidenceStore {
  public store = writable<EvidenceStoreState>({
    evidence: [],
    isLoading: false,
    error: null,
    isConnected: false,
  });

  private websocket: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    if (browser) {
      this.initializeConnection();
      this.loadFromLocalStorage();

      // Safe subscription to selectedCase
      if (selectedCase?.subscribe) {
        selectedCase.subscribe((caseId: string | null) => {
          this.fetchEvidence(caseId);
        });
      }
    }
  }

  private async initializeConnection() {
    if (!browser) return;

    try {
      await this.connectWebSocket();
    } catch (error: any) {
      console.warn("WebSocket failed, using polling fallback");
    }
  }

  private async connectWebSocket(): Promise<void> {
    if (!browser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const port =
      import.meta.env.NODE_ENV === "production" ? window.location.port : "3030";
    const wsUrl = `${protocol}//${hostname}:${port}`;

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        this.store.update((s) => ({ ...s, isConnected: true }));
        this.websocket?.send(
          JSON.stringify({
            type: "subscribe",
            channels: ["evidence_update"],
          }),
        );
      };

      this.websocket.onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          this.handleRealtimeUpdate(message);
        } catch (error: any) {
          console.error("WebSocket message error:", error);
        }
      };

      this.websocket.onclose = () => {
        this.store.update((s) => ({ ...s, isConnected: false }));
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(
            () => {
              this.reconnectAttempts++;
              this.connectWebSocket();
            },
            Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000),
          );
        }
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket connection error:", error);
      };
    } catch (error: any) {
      console.error("Failed to create WebSocket:", error);
      throw error;
    }
  }

  private handleRealtimeUpdate(message: any) {
    if (message.channel === "evidence_update") {
      const { type, data } = message.data;

      switch (type) {
        case "EVIDENCE_CREATED":
          this.store.update((s) => ({
            ...s,
            evidence: [...s.evidence, data],
          }));
          break;
        case "EVIDENCE_UPDATED":
          this.store.update((s) => ({
            ...s,
            evidence: s.evidence.map((e: any) =>
              e.id === data.id ? { ...e, ...data } : e,
            ),
          }));
          break;
        case "EVIDENCE_DELETED":
          this.store.update((s) => ({
            ...s,
            evidence: s.evidence.filter((e: any) => e.id !== data.id),
          }));
          break;
      }
      this.saveToLocalStorage();
    }
  }

  public async fetchEvidence(caseId: string | null) {
    if (!caseId) {
      this.store.update((s) => ({ ...s, evidence: [], error: null }));
      return;
    }

    this.store.update((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/evidence/${caseId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch evidence: ${response.statusText}`);
      }

      const evidenceList: Evidence[] = await response.json();
      this.store.update((s) => ({
        ...s,
        evidence: evidenceList,
        isLoading: false,
      }));
      this.saveToLocalStorage();
    } catch (error: any) {
      this.store.update((s) => ({
        ...s,
        isLoading: false,
        error: error.message,
      }));
      console.error("Failed to fetch evidence:", error);
    }
  }

  public async addEvidence(
    newEvidenceData: Omit<Evidence, "id" | "x" | "y" | "caseId">,
  ) {
    const currentCaseId = selectedCase ? get(selectedCase) : null;
    if (!currentCaseId) {
      throw new Error("No case selected");
    }

    this.store.update((s) => ({ ...s, isLoading: true }));

    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvidenceData, caseId: currentCaseId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add evidence: ${response.statusText}`);
      }

      const createdEvidence: Evidence = await response.json();
      this.store.update((s) => ({
        ...s,
        evidence: [...s.evidence, createdEvidence],
        isLoading: false,
      }));
      this.saveToLocalStorage();
    } catch (error: any) {
      this.store.update((s) => ({
        ...s,
        isLoading: false,
        error: error.message,
      }));
      throw error;
    }
  }

  public async updateEvidence(evidenceId: string, updates: Partial<Evidence>) {
    let originalEvidence: Evidence | undefined;
    this.store.update((s) => {
      originalEvidence = s.evidence.find((e: any) => e.id === evidenceId);
      return {
        ...s,
        evidence: s.evidence.map((e: any) =>
          e.id === evidenceId ? { ...e, ...updates } : e,
        ),
      };
    });

    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update evidence: ${response.statusText}`);
      }
      this.saveToLocalStorage();
    } catch (error: any) {
      if (originalEvidence) {
        this.store.update((s) => ({
          ...s,
          evidence: s.evidence.map((e: any) =>
            e.id === evidenceId ? originalEvidence! : e,
          ),
          error: error.message,
        }));
      }
      throw error;
    }
  }

  public async deleteEvidence(evidenceId: string) {
    let originalEvidence: Evidence | undefined;
    this.store.update((s) => {
      originalEvidence = s.evidence.find((e: any) => e.id === evidenceId);
      return {
        ...s,
        evidence: s.evidence.filter((e: any) => e.id !== evidenceId),
      };
    });

    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete evidence: ${response.statusText}`);
      }
      this.saveToLocalStorage();
    } catch (error: any) {
      if (originalEvidence) {
        this.store.update((s) => ({
          ...s,
          evidence: [...s.evidence, originalEvidence!],
          error: error.message,
        }));
      }
      throw error;
    }
  }

  private saveToLocalStorage() {
    if (!browser) return;
    try {
      const data = get(this.store);
      localStorage.setItem(
        "evidenceStore",
        JSON.stringify({
          ...data,
          lastUpdated: new Date().toISOString(),
        }),
      );
    } catch (error: any) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  private loadFromLocalStorage() {
    if (!browser) return;
    try {
      const stored = localStorage.getItem("evidenceStore");
      if (stored) {
        const data = JSON.parse(stored);
        const lastUpdated = new Date(data.lastUpdated);
        const hoursDiff =
          (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          this.store.set({
            evidence: data.evidence || [],
            isLoading: false,
            error: null,
            isConnected: false,
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to load from localStorage:", error);
    }
  }

  public clearError() {
    this.store.update((s) => ({ ...s, error: null }));
  }

  public disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.store.update((s) => ({ ...s, isConnected: false }));
  }

  public subscribe = this.store.subscribe;
}

export const evidenceStore = new UnifiedEvidenceStore();
;
export const evidenceById = derived(evidenceStore, ($store) => {
  const map = new Map<string, Evidence>();
  $store.evidence.forEach((item) => map.set(item.id, item));
  return map;
});

export const evidenceByCase = derived(evidenceStore, ($store) => {
  const map = new Map<string, Evidence[]>();
  $store.evidence.forEach((item) => {
    if (!map.has(item.caseId)) {
      map.set(item.caseId, []);
    }
    map.get(item.caseId)!.push(item);
  });
  return map;
});

export const evidence = evidenceStore;
export default evidenceStore;
