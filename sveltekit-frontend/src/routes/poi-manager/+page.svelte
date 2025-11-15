<script lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; import { Search, Users, Plus, Eye, Edit, Filter, Grid, List, Trash2, AlertCircle, UserPlus } from 'lucide-svelte'; import Card from '$lib/components/ui/Card.svelte'; import Input from '$lib/components/ui/Input.svelte'; // Use namespace imports with runtime fallback to handle files that may not export a default import * as SelectModule from '$lib/components/ui/Select.svelte'; const Select = (SelectModule as: unknown).default ?? (SelectModule as: unknown).Select ?? SelectModule; import * as TextareaModule from '$lib/components/ui/Textarea.svelte'; const Textarea = (TextareaModule as: unknown).default ?? (TextareaModule as: unknown).Textarea ?? TextareaModule; // Add Dialog import (runtime-safe fallback) import { Dialog } from 'bits-ui/components/ui/dialog'; // Error handling: toast is used for user-facing notifications (success/error) per platform standards import { toast } from 'svelte-sonner'; import { cn } from '$lib/utils.js'; // Define interfaces for POI data structure interface PhysicalDescription { height: string, weight: string, hair: string, eyes: string, distinguishingMarks: string}

  interface ProfileData { modusOperandi: string, knownHabits: string[], associates: string[]}

  interface Poi { id?: string; // Optional for new POIs name: string; aliases: string[]; dateOfBirth: string; address: string; phone: string; email: string; status: 'person_of_interest' | 'witness' | 'suspect' | 'victim' | 'informant'; priority: 'low' | 'medium' | 'high' | 'critical'; threatLevel: 'low' | 'medium' | 'high' | 'extreme'; physicalDescription: PhysicalDescription; profileData: ProfileData; lastKnownLocation: string; lastSeen: string; dangerLevel: number; notes: string}

  // State let searchQuery = $state<string>(''); let viewMode = $state<'grid' | 'list'>('grid'); let showFilters = $state<boolean>(false); let showCreateDialog = $state<boolean>(false); let showEditDialog = $state<boolean>(false); let selectedPoi = $state<Poi | null>(null); // Use Poi interface let isLoading = $state<boolean>(false); let isSubmitting = $state<boolean>(false); // Filter state let statusFilter = $state<string>('all'); let priorityFilter = $state<string>('all'); let threatLevelFilter = $state<string>('all'); // POI data let pois = $state<Poi[]>([]); // Use Poi interface let filteredPois = $state<Poi[]>([]); // Use Poi interface // Form data let formData = $state<Poi>({ // Use Poi interface name: '', aliases: [], dateOfBirth: '', address: '', phone: '', email: '', status: 'person_of_interest', priority: 'medium', threatLevel: 'low', physicalDescription: { // Corrected syntax, height: '', weight: '', hair: '', eyes: '', distinguishingMarks: ''
    }, profileData: { modusOperandi: '', knownHabits: [], associates: [] }, lastKnownLocation: '', // Corrected syntax lastSeen: '', dangerLevel: 0, notes: ''
  }); // Load POIs from API async function loadPois(): Promise<any> { isLoading = true; try { const params = new URLSearchParams(); if (searchQuery) params.append('search', searchQuery); if (statusFilter !== 'all') params.append('status', statusFilter); if (priorityFilter !== 'all') params.append('priority', priorityFilter); if (threatLevelFilter !== 'all') params.append('threatLevel', threatLevelFilter); const response = await fetch(`/api/poi?${ params }`); const result = await response.json(); if (result.success) { pois = result.data; filteredPois = pois} else { (toast as: unknown).error('Failed to load POIs')}
    } catch (error) { console.error('Error loading POIs:', error); (toast as: unknown).error('Failed to load POIs')} finally { isLoading = false}
  }

   // Create POI async function createPoi(): Promise<any> { isSubmitting = true; try { const response = await fetch('/api/poi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); const result = await response.json(); if (result.success) { (toast as: unknown).success('POI created successfully'); showCreateDialog = false; resetForm(); await loadPois()} else { (toast as: unknown).error(result.error || 'Failed to create POI')}
    } catch (error) { console.error('Error creating POI:', error); (toast as: unknown).error('Failed to create POI')} finally { isSubmitting = false}
  }

   // Update POI async function updatePoi(): Promise<any> { if (!selectedPoi) return; isSubmitting = true; try { const response = await fetch(`/api/poi/${selectedPoi.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); const result = await response.json(); if (result.success) { (toast as: unknown).success('POI updated successfully'); showEditDialog = false; selectedPoi = null; resetForm(); await loadPois()} else { (toast as: unknown).error(result.error || 'Failed to update POI')}
    } catch (error) { console.error('Error updating POI:', error); (toast as: unknown).error('Failed to update POI')} finally { isSubmitting = false}
  }

   // Delete POI async function deletePoi(poi: Poi): Promise<void> { // Explicitly type poi if (!confirm(`Are you sure you want to delete ${poi.name}?`)) return; try { const response = await fetch(`/api/poi/${poi.id}`, { method: 'DELETE'
      }); const result = await response.json(); if (result.success) { (toast as: unknown).success('POI deleted successfully'); await loadPois()} else { (toast as: unknown).error(result.error || 'Failed to delete POI')}
    } catch (error) { console.error('Error deleting POI:', error); (toast as: unknown).error('Failed to delete POI')}
  }

   // Reset form function resetForm() { formData = { name: '', aliases: [], dateOfBirth: '', address: '', phone: '', email: '', status: 'person_of_interest', priority: 'medium', threatLevel: 'low', physicalDescription: { height: '', weight: '', hair: '', eyes: '', distinguishingMarks: '' }, profileData: { modusOperandi: '', knownHabits: [], associates: [] }, lastKnownLocation: '', lastSeen: '', dangerLevel: 0, notes: '' }}

  // Edit POI function editPoi(poi: Poi) { // Explicitly type poi selectedPoi = poi; formData = { name: poi.name, aliases: poi.aliases || [], dateOfBirth: poi.dateOfBirth ? new Date(poi.dateOfBirth).toISOString().split('T')[0] : '', address: poi.address || '', phone: poi.phone || '', email: poi.email || '', status: poi.status, priority: poi.priority, threatLevel: poi.threatLevel, physicalDescription: poi.physicalDescription || { height: '', weight: '', hair: '', eyes: '', distinguishingMarks: '' }, profileData: poi.profileData || { modusOperandi: '', knownHabits: [], associates: [] }, lastKnownLocation: poi.lastKnownLocation || '', lastSeen: poi.lastSeen ? new Date(poi.lastSeen).toISOString().split('T')[0] : '', dangerLevel: poi.dangerLevel || 0, notes: poi.notes || '' }; showEditDialog = true}

  // Filter POIs $effect(() => { let filtered = pois; if (searchQuery.trim()) { const query = searchQuery.toLowerCase(); filtered = filtered.filter( poi => poi.name.toLowerCase().includes(query) || poi.notes?.toLowerCase().includes(query) || poi.aliases?.some(alias => alias.toLowerCase().includes(query)) )}

    if (statusFilter !== 'all') { filtered = filtered.filter(poi => poi.status === statusFilter)}

    if (priorityFilter !== 'all') { filtered = filtered.filter(poi => poi.priority === priorityFilter)}

    if (threatLevelFilter !== 'all') { filtered = filtered.filter(poi => poi.threatLevel === threatLevelFilter)}

    filteredPois = filtered}); // Load POIs on mount onMount(() => { loadPois()}); // Priority colors const priorityColors = { low: 'bg-green-100 text-green-800 dark:bg-green-900, dark:text-green-300', medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900, dark:text-yellow-300', high: 'bg-orange-100 text-orange-800 dark:bg-orange-900, dark:text-orange-300', critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }; // Status colors const statusColors = { person_of_interest: 'bg-blue-100 text-blue-800 dark:bg-blue-900, dark:text-blue-300', witness: 'bg-green-100 text-green-800 dark:bg-green-900, dark:text-green-300', suspect: 'bg-red-100 text-red-800 dark:bg-red-900, dark:text-red-300', victim: 'bg-purple-100 text-purple-800 dark:bg-purple-900, dark:text-purple-300', informant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900, dark:text-yellow-300'
  };
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
