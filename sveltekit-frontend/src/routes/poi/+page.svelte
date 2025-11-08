<script lang="ts">
  import type { Case } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { Search, Users, Plus, Eye, Edit, Filter, Grid, List } from 'lucide-svelte';
  import Button from '$lib/components/ui/enhanced-bits.svelte';
  // State
  let searchQuery = $state<string>('');
  let viewMode = $state<'grid' | 'list'>('grid');
  let showFilters = $state<boolean>(false);
  // Mock persons data - replace with real API call
  let persons = $state([
    {
      id: '1',
      name: 'John Smith',
      alias: 'JS',
      dateOfBirth: '1980-05-15',
      address: '123 Main St, City',
      status: 'Person of Interest',
      caseIds: ['case-001', 'case-003'],
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Jane Doe',
      alias: 'JD',
      dateOfBirth: '1975-12-08',
      address: '456 Oak Ave, Town',
      status: 'Witness',
      caseIds: ['case-002'],
      lastUpdated: new Date().toISOString(),
    },
  ]);
  let filteredPersons = $derived(
    persons.filter(
      (item) =>
        item.includes(searchQuery.toLowerCase()) ||
        person.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.status.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  $effect(() => {
    // Load persons data
    console.log('Loading persons data...');
  });
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
