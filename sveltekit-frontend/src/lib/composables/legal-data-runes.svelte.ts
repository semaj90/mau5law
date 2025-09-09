/**
 * Legal Data Composables using Svelte 5 Runes
 * Reusable state management for legal entities, cases, evidence, and POIs
 */

// Core legal data interfaces
export interface LegalCase {
  id: string;
  title: string;
  status: 'active' | 'closed' | 'pending' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  metadata: Record<string, any>;
}

export interface Evidence {
  id: string;
  caseId: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'physical' | 'digital';
  title: string;
  description?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface PersonOfInterest {
  id: string;
  name: string;
  alias?: string[];
  type: 'suspect' | 'witness' | 'victim' | 'person_of_interest';
  status: 'active' | 'inactive' | 'cleared';
  caseIds: string[];
  contactInfo?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

// Legal case composable
export function useLegalCase(initialCaseId?: string) {
  let currentCase = $state<LegalCase | null>(null);
  let cases = $state<LegalCase[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let lastFetched = $state<number>(0);

  // Derived values
  let hasCurrentCase = $derived(currentCase !== null);
  let currentCaseStatus = $derived(currentCase?.status || null);
  let currentCasePriority = $derived(currentCase?.priority || null);
  let activeCases = $derived(cases.filter(c => c.status === 'active'));
  let urgentCases = $derived(cases.filter(c => c.priority === 'urgent'));
  let casesCount = $derived(cases.length);
  
  // Case status summary
  let statusSummary = $derived(() => {
    const summary: Record<string, number> = {};
    cases.forEach(c => {
      summary[c.status] = (summary[c.status] || 0) + 1;
    });
    return summary;
  });
  
  // Priority distribution
  let priorityDistribution = $derived(() => {
    const distribution: Record<string, number> = {};
    cases.forEach(c => {
      distribution[c.priority] = (distribution[c.priority] || 0) + 1;
    });
    return distribution;
  });

  // Effect to load initial case
  $effect(() => {
    if (initialCaseId && !currentCase) {
      loadCase(initialCaseId);
    }
  });

  // Methods
  async function loadCase(caseId: string): Promise<void> {
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) throw new Error(`Failed to load case: ${response.statusText}`);
      
      currentCase = await response.json();
      lastFetched = Date.now();
    } catch (err: any) {
      error = err.message;
      currentCase = null;
    } finally {
      isLoading = false;
    }
  }

  async function loadCases(): Promise<void> {
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch('/api/cases');
      if (!response.ok) throw new Error(`Failed to load cases: ${response.statusText}`);
      
      cases = await response.json();
      lastFetched = Date.now();
    } catch (err: any) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  async function updateCase(updates: Partial<LegalCase>): Promise<void> {
    if (!currentCase) return;
    
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch(`/api/cases/${currentCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error(`Failed to update case: ${response.statusText}`);
      
      const updated = await response.json();
      currentCase = updated;
      
      // Update in cases list if present
      const index = cases.findIndex(c => c.id === currentCase!.id);
      if (index !== -1) {
        cases[index] = updated;
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  function clearCurrentCase(): void {
    currentCase = null;
    error = null;
  }

  return {
    // State
    currentCase: () => currentCase,
    cases: () => cases,
    isLoading: () => isLoading,
    error: () => error,
    lastFetched: () => lastFetched,
    
    // Derived
    hasCurrentCase,
    currentCaseStatus,
    currentCasePriority,
    activeCases,
    urgentCases,
    casesCount,
    statusSummary,
    priorityDistribution,
    
    // Methods
    loadCase,
    loadCases,
    updateCase,
    clearCurrentCase
  };
}

// Evidence composable
export function useEvidence(caseId?: string) {
  let evidence = $state<Evidence[]>([]);
  let currentEvidence = $state<Evidence | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let uploadProgress = $state<Map<string, number>>(new Map());

  // Derived values
  let evidenceCount = $derived(evidence.length);
  let hasCurrentEvidence = $derived(currentEvidence !== null);
  let isUploading = $derived(uploadProgress.size > 0);
  
  // Evidence by type
  let evidenceByType = $derived(() => {
    const byType: Record<string, Evidence[]> = {};
    evidence.forEach(e => {
      if (!byType[e.type]) byType[e.type] = [];
      byType[e.type].push(e);
    });
    return byType;
  });
  
  // Recent evidence (last 7 days)
  let recentEvidence = $derived(() => {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return evidence.filter(e => new Date(e.createdAt).getTime() > weekAgo);
  });

  // Effect to load evidence when caseId changes
  $effect(() => {
    if (caseId) {
      loadEvidenceForCase(caseId);
    }
  });

  async function loadEvidenceForCase(targetCaseId: string): Promise<void> {
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch(`/api/cases/${targetCaseId}/evidence`);
      if (!response.ok) throw new Error(`Failed to load evidence: ${response.statusText}`);
      
      evidence = await response.json();
    } catch (err: any) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  async function uploadEvidence(file: File, metadata: Record<string, any> = {}): Promise<Evidence | null> {
    if (!caseId) return null;
    
    const uploadId = `upload_${Date.now()}`;
    uploadProgress.set(uploadId, 0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      
      const newEvidence = await response.json();
      evidence = [...evidence, newEvidence];
      
      uploadProgress.set(uploadId, 100);
      setTimeout(() => uploadProgress.delete(uploadId), 2000);
      
      return newEvidence;
    } catch (err: any) {
      error = err.message;
      uploadProgress.delete(uploadId);
      return null;
    }
  }

  async function deleteEvidence(evidenceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(`Failed to delete evidence: ${response.statusText}`);
      
      evidence = evidence.filter(e => e.id !== evidenceId);
      if (currentEvidence?.id === evidenceId) {
        currentEvidence = null;
      }
      
      return true;
    } catch (err: any) {
      error = err.message;
      return false;
    }
  }

  function selectEvidence(evidenceItem: Evidence): void {
    currentEvidence = evidenceItem;
  }

  function clearSelection(): void {
    currentEvidence = null;
  }

  return {
    // State
    evidence: () => evidence,
    currentEvidence: () => currentEvidence,
    isLoading: () => isLoading,
    error: () => error,
    uploadProgress: () => uploadProgress,
    
    // Derived
    evidenceCount,
    hasCurrentEvidence,
    isUploading,
    evidenceByType,
    recentEvidence,
    
    // Methods
    loadEvidenceForCase,
    uploadEvidence,
    deleteEvidence,
    selectEvidence,
    clearSelection
  };
}

// Person of Interest composable
export function usePersonsOfInterest() {
  let persons = $state<PersonOfInterest[]>([]);
  let currentPerson = $state<PersonOfInterest | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let searchQuery = $state('');

  // Derived values
  let personsCount = $derived(persons.length);
  let hasCurrentPerson = $derived(currentPerson !== null);
  
  // Filtered persons based on search
  let filteredPersons = $derived(() => {
    if (!searchQuery.trim()) return persons;
    
    const query = searchQuery.toLowerCase();
    return persons.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.alias?.some(alias => alias.toLowerCase().includes(query)) ||
      p.notes?.toLowerCase().includes(query)
    );
  });
  
  // Persons by type
  let personsByType = $derived(() => {
    const byType: Record<string, PersonOfInterest[]> = {};
    persons.forEach(p => {
      if (!byType[p.type]) byType[p.type] = [];
      byType[p.type].push(p);
    });
    return byType;
  });
  
  // Active persons
  let activePersons = $derived(persons.filter(p => p.status === 'active'));

  async function loadPersons(): Promise<void> {
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch('/api/persons-of-interest');
      if (!response.ok) throw new Error(`Failed to load persons: ${response.statusText}`);
      
      persons = await response.json();
    } catch (err: any) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  async function createPerson(personData: Omit<PersonOfInterest, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonOfInterest | null> {
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch('/api/persons-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      });
      
      if (!response.ok) throw new Error(`Failed to create person: ${response.statusText}`);
      
      const newPerson = await response.json();
      persons = [...persons, newPerson];
      
      return newPerson;
    } catch (err: any) {
      error = err.message;
      return null;
    } finally {
      isLoading = false;
    }
  }

  async function updatePerson(personId: string, updates: Partial<PersonOfInterest>): Promise<boolean> {
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch(`/api/persons-of-interest/${personId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error(`Failed to update person: ${response.statusText}`);
      
      const updated = await response.json();
      const index = persons.findIndex(p => p.id === personId);
      
      if (index !== -1) {
        persons[index] = updated;
      }
      
      if (currentPerson?.id === personId) {
        currentPerson = updated;
      }
      
      return true;
    } catch (err: any) {
      error = err.message;
      return false;
    } finally {
      isLoading = false;
    }
  }

  function selectPerson(person: PersonOfInterest): void {
    currentPerson = person;
  }

  function clearSelection(): void {
    currentPerson = null;
  }

  function setSearchQuery(query: string): void {
    searchQuery = query;
  }

  return {
    // State
    persons: () => persons,
    currentPerson: () => currentPerson,
    isLoading: () => isLoading,
    error: () => error,
    searchQuery: () => searchQuery,
    
    // Derived
    personsCount,
    hasCurrentPerson,
    filteredPersons,
    personsByType,
    activePersons,
    
    // Methods
    loadPersons,
    createPerson,
    updatePerson,
    selectPerson,
    clearSelection,
    setSearchQuery
  };
}

// Unified legal data composable
export function useLegalData(caseId?: string) {
  const caseComposable = useLegalCase(caseId);
  const evidenceComposable = useEvidence(caseId);
  const personComposable = usePersonsOfInterest();

  // Combined loading state
  let isAnyLoading = $derived(
    caseComposable.isLoading() || 
    evidenceComposable.isLoading() || 
    personComposable.isLoading()
  );

  // Combined error state
  let hasAnyError = $derived(
    !!caseComposable.error() || 
    !!evidenceComposable.error() || 
    !!personComposable.error()
  );

  // Initialize all data
  async function initializeAll(): Promise<void> {
    await Promise.all([
      caseComposable.loadCases(),
      personComposable.loadPersons(),
      caseId ? evidenceComposable.loadEvidenceForCase(caseId) : Promise.resolve()
    ]);
  }

  return {
    case: caseComposable,
    evidence: evidenceComposable,
    persons: personComposable,
    isAnyLoading,
    hasAnyError,
    initializeAll
  };
}