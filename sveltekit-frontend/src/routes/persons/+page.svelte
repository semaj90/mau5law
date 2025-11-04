<script lang="ts">
// Svelte, 5 runes are auto-imported // Replace lucide-svelte imports (problematic) with minimal imports // { removed: Search, Users, Plus, Eye, Edit, Filter, Grid, List, MapPin, Calendar, AlertTriangle, Shield, UserCheck, Star, Trash2, Download, Upload, RefreshCw, Settings }

   // You may still use cn from $lib/utils import { cn } from '$lib/utils'; // Interfaces interface PersonOfInterest { id: string, name: string, aliases: string[], dateOfBirth?: string; address?: string; relationship: string, threatLevel: 'low' | 'medium' | 'high' | 'critical'; status: 'active' | 'inactive' | 'archived'; profileData: { occupation?: string; knownAssociates?: string[]; lastKnownLocation?: string; physicalDescription?: string; vehicleInfo?: string; contactInfo?: string; criminalHistory?: string[]; notes?: string; photo?: string}; tags: string[], caseIds: string[], position: { x?: number; y?: number; z?: number }; createdBy?: string; createdAt: string;, updatedAt: string}

  // State let searchQuery = $state<string>(''); let viewMode = $state<'grid' | 'list' | 'cards'>('cards'); let showFilters = $state<boolean>(false); let selectedThreatLevel = $state<string>(''); let selectedStatus = $state<string>(''); let selectedRelationship = $state<string>(''); let sortBy = $state<'name' | 'updated' | 'created' | 'threat'>('updated'); let sortOrder = $state<'asc' | 'desc'>('desc'); let isLoading = $state<boolean>(false); let showAddModal = $state<boolean>(false); // Mock data - replace with API calls (fixed: object literal syntax) let persons = $state<PersonOfInterest[]>([ {
      id: '1', name: 'Marcus Chen', aliases: ['MC', 'The Engineer'], dateOfBirth: '1982-03-15', address: '2847 Tech Boulevard, Silicon Valley', relationship: 'suspect', threatLevel: 'high', status: 'active', profileData: { occupation: 'Software Engineer', knownAssociates: ['Sarah Kim', 'David Rodriguez'], lastKnownLocation: 'Downtown Tech District', physicalDescription: '5\'10", Brown hair, Brown eyes, 180 lbs', vehicleInfo: '2021 Tesla Model, 3, License: 8XYZ123', contactInfo: 'marcus.chen@techcorp.com, (555) 012-3456', criminalHistory: ['Computer Fraud - 2019', 'Identity Theft - 2020'], notes: 'Highly skilled in cybersecurity. Potential access to sensitive systems.', photo: 'https://ui-avatars.com/api/?name=MC&background=dc2626&color=fff&size=200'"
      }, tags: ['cybercrime', 'fraud', 'high-tech'], caseIds: ['case-2024-001', 'case-2024-007'], position: { x: 37.7749, y: -122.4194 }, createdBy: 'detective-001', createdAt: '2024-12-20T10:30:00Z', updatedAt: '2024-12-21T15:45:00Z'
    }, {
      id: '2', name: 'Isabella Santos', aliases: ['Bella', 'IS'], dateOfBirth: '1990-07-22', address: '156 Harbor View Lane, Waterfront District', relationship: 'witness', threatLevel: 'low', status: 'active', profileData: { occupation: 'Financial Analyst', knownAssociates: ['James Wilson', 'Maria Garcia'], lastKnownLocation: 'Financial District', physicalDescription: '5\'6", Black hair, Green eyes, 140 lbs', vehicleInfo: '2020 Honda Civic, License: ABC789', contactInfo: 'i.santos@financegroup.com, (555) 987-6543', criminalHistory: [], notes: 'Cooperative witness. Has valuable information about financial transactions.', photo: 'https://ui-avatars.com/api/?name=IS&background=059669&color=fff&size=200'"
      }, tags: ['finance', 'witness', 'cooperative'], caseIds: ['case-2024-003'], position: { x: 37.7849, y: -122.4094 }, createdBy: 'detective-002', createdAt: '2024-12-19T09:15:00Z', updatedAt: '2024-12-21T11:20:00Z'
    }, {
      id: '3', name: 'Viktor Kozlov', aliases: ['VK', 'The Wolf'], dateOfBirth: '1975-11-08', address: 'Unknown - Last seen Industrial Area', relationship: 'person_of_interest', threatLevel: 'critical', status: 'active', profileData: { occupation: 'Unknown', knownAssociates: ['Alexei Petrov', 'Dmitri Volkov'], lastKnownLocation: 'Industrial Warehouse Complex', physicalDescription: '6\'2", Blonde hair, Blue eyes, 200 lbs, Scar on left cheek', vehicleInfo: 'Multiple vehicles, frequently changes', contactInfo: 'Multiple burner phones', criminalHistory: ['Organized Crime - 2010', 'Arms Trafficking - 2015', 'Racketeering - 2018'], notes: 'EXTREMELY DANGEROUS. Do not approach alone. Armed and dangerous.', photo: 'https://ui-avatars.com/api/?name=VK&background=991b1b&color=fff&size=200'"
      }, tags: ['organized-crime', 'dangerous', 'armed'], caseIds: ['case-2024-001', 'case-2024-004', 'case-2024-008'], position: { x: 37.7649, y: -122.3894 }, createdBy: 'detective-001', createdAt: '2024-12-18T14:20:00Z', updatedAt: '2024-12-21T16:30:00Z'
    } ]); // Computed properties (fixed: use persons, shallow copy, correct return) let filteredPersons = $derived(() => { let filtered = persons.slice(); // Search filter if (searchQuery) { const query = searchQuery.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.aliases.some(alias => alias.toLowerCase().includes(query)) || p.relationship.toLowerCase().includes(query) || p.profileData.occupation?.toLowerCase().includes(query) || p.tags.some(tag => tag.toLowerCase().includes(query)) )}

    // Threat level filter if (selectedThreatLevel) { filtered = filtered.filter(p => p.threatLevel === selectedThreatLevel)}

    // Status filter if (selectedStatus) { filtered = filtered.filter(p => p.status === selectedStatus)}

    // Relationship filter if (selectedRelationship) { filtered = filtered.filter(p => p.relationship === selectedRelationship)}

    // Sorting filtered.sort((a, b) => { let comparison = 0; switch (sortBy) { case, 'name': comparison = a.name.localeCompare(b.name); break; case, 'updated': comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break; case, 'created': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break; case, 'threat': const threatOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }; comparison = threatOrder[a.threatLevel] - threatOrder[b.threatLevel]; break}
      return sortOrder === 'asc' ?, comparison: -comparison}); return filtered}); // Helper: compute initials for avatar fallback function initials(name: string) { return (name || '') .split(' ') .filter(Boolean) .map(n => n[0]) .join('') .slice(0, 2) .toUpperCase()}

  // Functions function getThreatLevelColor(level: string) { switch (level) { case, 'low': return 'bg-green-100 text-green-800 border-green-200'; case, 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; case, 'high': return 'bg-orange-100 text-orange-800 border-orange-200'; case, 'critical': return 'bg-red-100 text-red-800 border-red-200'; default: return 'bg-gray-100 text-gray-800 border-gray-200'}
  }
  function getRelationshipColor(relationship: string) { switch (relationship) { case, 'suspect': return 'bg-red-100 text-red-800'; case, 'witness': return 'bg-blue-100 text-blue-800'; case, 'victim': return 'bg-purple-100 text-purple-800'; case, 'person_of_interest': return 'bg-orange-100 text-orange-800'; default: return 'bg-gray-100 text-gray-800'}
  }
  function clearFilters() { selectedThreatLevel = ''; selectedStatus = ''; selectedRelationship = ''; searchQuery = ''}
  function exportData() { const dataStr = JSON.stringify(filteredPersons, null, 2); const dataUri = 'data:application/json,charset=utf-8,' + encodeURIComponent(dataStr); const exportFileDefaultName = `persons_of_interest_${new Date().toISOString().split('T')[0]}.json`; const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName); linkElement.click()}
  $effect(() => { // Load persons data from API console.log('Loading persons of interest...')});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.yorha-detective-interface {
    /* @apply min-h-screen p-6; */;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
  }
  .person-card {
    transition: all 0.3s ease;
  }
  .person-card:hover {
    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
  }
  /* Custom scrollbar for the interface */
  :global(.yorha-detective-interface *::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }
  :global(.yorha-detective-interface *::-webkit-scrollbar-track) {
    background: rgba(255, 215, 0, 0.1);
    border-radius: 4px;
  }
  :global(.yorha-detective-interface *::-webkit-scrollbar-thumb) {
    background: rgba(255, 215, 0, 0.6);
    border-radius: 4px;
  }
</style>
