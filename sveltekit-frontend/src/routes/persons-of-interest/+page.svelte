<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PersonOfInterestCard from '$lib/components/ai/PersonOfInterestCard.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import Button from '$lib/components/ui/button';
  
  // Types
  interface PersonOfInterest {
    id: string;
    name: string;
    role: 'suspect' | 'witness' | 'victim' | 'associate' | 'unknown';
    details?: {
      age?: number;
      address?: string;
      phone?: string;
      occupation?: string;
      aliases?: string[];
    };
    confidence: number;
    sourceContext?: string;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'inactive' | 'archived';
    tags: string[];
    caseId?: string;
    createdAt: string;
    updatedAt: string;
  }

  interface Relationship {
    person1: string;
    person2: string;
    relationship: string;
    context?: string;
    confidence: number;
  }

  // State management using Svelte 5 runes
  let persons = $state<PersonOfInterest[]>([]);
  let relationships = $state<Relationship[]>([]);
  let filteredPersons = $state<PersonOfInterest[]>([]);
  let searchQuery = $state('');
  let selectedThreatLevel = $state<string>('all');
  let selectedStatus = $state<string>('all');
  let selectedRole = $state<string>('all');
  let isLoading = $state(false);
  let showAddModal = $state(false);
  let selectedPersons = $state<string[]>([]);
  let showGraphView = $state(false);

  // Computed values
  let totalPersons = $derived(persons.length);
  let highRiskCount = $derived(
    persons.filter(p => p.threatLevel === 'high' || p.threatLevel === 'critical').length
  );
  let activeCount = $derived(persons.filter(p => p.status === 'active').length);
  let relationshipCount = $derived(relationships.length);

  // Load persons of interest from API
  async function loadPersonsOfInterest() {
    isLoading = true;
    try {
      const response = await fetch('/api/v1/persons-of-interest');
      if (response.ok) {
        const data = await response.json();
        persons = data.data || [];
        // Generate mock relationships for demo
        generateMockRelationships();
        filterPersons();
      } else {
        console.error('Failed to load persons of interest');
        // Load demo data if API fails
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading persons of interest:', error);
      loadDemoData();
    } finally {
      isLoading = false;
    }
  }

  // Load demo data for development
  function loadDemoData() {
    persons = [
      {
        id: '1',
        name: 'John Smith',
        role: 'suspect',
        details: {
          age: 35,
          address: '123 Oak Street, Springfield',
          phone: '+1 (555) 123-4567',
          occupation: 'Construction Worker',
          aliases: ['Johnny S', 'Smitty']
        },
        confidence: 0.85,
        sourceContext: 'Identified through security footage and witness statements',
        threatLevel: 'high',
        status: 'active',
        tags: ['armed', 'dangerous', 'witness-intimidation'],
        caseId: 'case-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Maria Rodriguez',
        role: 'witness',
        details: {
          age: 28,
          phone: '+1 (555) 987-6543',
          occupation: 'Store Manager'
        },
        confidence: 0.92,
        sourceContext: 'Primary witness to the incident, provided detailed statement',
        threatLevel: 'low',
        status: 'active',
        tags: ['cooperative', 'reliable'],
        caseId: 'case-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'David Chen',
        role: 'associate',
        details: {
          age: 42,
          occupation: 'Business Owner',
          aliases: ['Dave Chen']
        },
        confidence: 0.67,
        sourceContext: 'Known associate of suspect, frequent contact patterns identified',
        threatLevel: 'medium',
        status: 'active',
        tags: ['financial-ties', 'surveillance-needed'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Sarah Williams',
        role: 'victim',
        details: {
          age: 31,
          address: '456 Pine Avenue, Springfield',
          occupation: 'Teacher'
        },
        confidence: 0.95,
        sourceContext: 'Primary victim of the incident, medical records confirmed',
        threatLevel: 'low',
        status: 'active',
        tags: ['protected-witness', 'medical-evidence'],
        caseId: 'case-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    generateMockRelationships();
    filterPersons();
  }

  // Generate mock relationships
  function generateMockRelationships() {
    relationships = [
      {
        person1: 'John Smith',
        person2: 'David Chen',
        relationship: 'business_partner',
        context: 'Co-owned construction company from 2019-2022',
        confidence: 0.78
      },
      {
        person1: 'John Smith',
        person2: 'Sarah Williams',
        relationship: 'suspect_victim',
        context: 'Incident occurred at victim\'s residence',
        confidence: 0.95
      },
      {
        person1: 'Maria Rodriguez',
        person2: 'Sarah Williams',
        relationship: 'neighbor',
        context: 'Lives two blocks away, witnessed incident',
        confidence: 0.85
      },
      {
        person1: 'David Chen',
        person2: 'Maria Rodriguez',
        relationship: 'customer',
        context: 'Frequent customer at witness\'s store',
        confidence: 0.62
      }
    ];
  }

  // Filter persons based on search and filters
  function filterPersons() {
    let filtered = persons;

    if (searchQuery.trim()) {
      filtered = filtered.filter(person =>
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.details?.occupation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        person.details?.aliases?.some(alias => 
          alias.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (selectedThreatLevel !== 'all') {
      filtered = filtered.filter(person => person.threatLevel === selectedThreatLevel);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(person => person.status === selectedStatus);
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(person => person.role === selectedRole);
    }

    filteredPersons = filtered;
  }

  // Search input handler with debouncing
  let searchTimeout: number;
  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterPersons();
    }, 300);
  }

  // Create new person of interest
  async function createPersonOfInterest(personData: any) {
    try {
      const response = await fetch('/api/v1/persons-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      });

      if (response.ok) {
        await loadPersonsOfInterest();
        showAddModal = false;
      } else {
        console.error('Failed to create person of interest');
      }
    } catch (error) {
      console.error('Error creating person of interest:', error);
    }
  }

  // Toggle selection
  function toggleSelection(personId: string) {
    if (selectedPersons.includes(personId)) {
      selectedPersons = selectedPersons.filter(id => id !== personId);
    } else {
      selectedPersons = [...selectedPersons, personId];
    }
  }

  // Initialize on mount
  onMount(() => {
    loadPersonsOfInterest();
  });

  // Role configuration for styling
  const roleConfig = {
    suspect: { color: 'bg-red-100 text-red-800', icon: '🚨' },
    witness: { color: 'bg-blue-100 text-blue-800', icon: '👁️' },
    victim: { color: 'bg-purple-100 text-purple-800', icon: '💔' },
    associate: { color: 'bg-orange-100 text-orange-800', icon: '🤝' },
    unknown: { color: 'bg-gray-100 text-gray-800', icon: '❓' }
  };

  // Threat level configuration
  const threatConfig = {
    low: { color: 'bg-green-100 text-green-800', label: 'Low Risk' },
    medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium Risk' },
    high: { color: 'bg-orange-100 text-orange-800', label: 'High Risk' },
    critical: { color: 'bg-red-100 text-red-800', label: 'Critical Risk' }
  };
</script>

<svelte:head>
  <title>Persons of Interest - Legal AI Assistant</title>
  <meta name="description" content="Manage persons of interest with AI-powered analysis and relationship mapping" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">👥 Persons of Interest</h1>
          <p class="text-gray-600 mt-1">AI-powered relationship mapping and risk assessment</p>
        </div>
        
        <div class="flex items-center gap-4">
          <Button class="bits-btn" 
            onclick={() => showGraphView = !showGraphView}
            variant="outline"
            class="flex items-center gap-2"
          >
            🕸️ {showGraphView ? 'List View' : 'Graph View'}
          </Button>
          
          <Button class="bits-btn" 
            onclick={() => showAddModal = true}
            class="flex items-center gap-2"
          >
            ➕ Add Person
          </Button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600">Total Persons</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{totalPersons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-red-600">{highRiskCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600">Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-blue-600">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600">Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-purple-600">{relationshipCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  </header>

  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Search and Filters -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Search & Filter</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Search Input -->
        <div>
          <input
            type="text"
            placeholder="🔍 Search by name, occupation, aliases, or tags..."
            bind:value={searchQuery}
            oninput={handleSearchInput}
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- Filters -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Role Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              bind:value={selectedRole}
              onchange={filterPersons}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="suspect">🚨 Suspects</option>
              <option value="witness">👁️ Witnesses</option>
              <option value="victim">💔 Victims</option>
              <option value="associate">🤝 Associates</option>
              <option value="unknown">❓ Unknown</option>
            </select>
          </div>

          <!-- Threat Level Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Threat Level</label>
            <select
              bind:value={selectedThreatLevel}
              onchange={filterPersons}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="low">🟢 Low Risk</option>
              <option value="medium">🟡 Medium Risk</option>
              <option value="high">🟠 High Risk</option>
              <option value="critical">🔴 Critical Risk</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              bind:value={selectedStatus}
              onchange={filterPersons}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">✅ Active</option>
              <option value="inactive">⏸️ Inactive</option>
              <option value="archived">📁 Archived</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Selection Controls -->
    {#if selectedPersons.length > 0}
      <Card class="mb-6 bg-blue-50 border-blue-200">
        <CardContent class="py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="font-medium text-blue-800">
                {selectedPersons.length} person{selectedPersons.length !== 1 ? 's' : ''} selected
              </span>
              <Button class="bits-btn"
                variant="outline"
                size="sm"
                onclick={() => selectedPersons = []}
              >
                Clear Selection
              </Button>
            </div>
            
            <div class="flex gap-2">
              <Button class="bits-btn" size="sm" variant="outline">📊 Analyze Relationships</Button>
              <Button class="bits-btn" size="sm" variant="outline">📋 Generate Report</Button>
              <Button class="bits-btn" size="sm" variant="outline">🏷️ Bulk Tag</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}

    <!-- Loading State -->
    {#if isLoading}
      <div class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">Loading persons of interest...</p>
      </div>
    {:else if filteredPersons.length === 0}
      <!-- Empty State -->
      <Card>
        <CardContent class="py-12 text-center">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">No Persons Found</h3>
          <p class="text-gray-500 mb-4">
            {searchQuery || selectedThreatLevel !== 'all' || selectedStatus !== 'all' || selectedRole !== 'all'
              ? 'Try adjusting your search criteria or filters'
              : 'Start by adding persons of interest to your investigation'}
          </p>
          <Button class="bits-btn" onclick={() => showAddModal = true} class="mt-2">
            ➕ Add First Person
          </Button>
        </CardContent>
      </Card>
    {:else}
      <!-- Persons Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredPersons as person (person.id)}
          <div class="relative">
            <!-- Selection Checkbox -->
            <label class="absolute top-2 left-2 z-10 flex items-center">
              <input
                type="checkbox"
                checked={selectedPersons.includes(person.id)}
                onchange={() => toggleSelection(person.id)}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>

            <!-- Person Card -->
            <PersonOfInterestCard 
              bind:person 
              bind:relationships 
              class="h-full"
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Add Person Modal (Placeholder) -->
{#if showAddModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <Card class="w-full max-w-md mx-4">
      <CardHeader>
        <CardTitle>Add Person of Interest</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-gray-600">Person creation form would go here...</p>
        
        <div class="flex gap-2 pt-4">
          <Button class="bits-btn" onclick={() => showAddModal = false} variant="outline">
            Cancel
          </Button>
          <Button class="bits-btn" onclick={() => showAddModal = false}>
            Create Person
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
{/if}

<style>
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
