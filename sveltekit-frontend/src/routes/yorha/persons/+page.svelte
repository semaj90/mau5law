<script lang="ts">
	import POIPhotoModal from '$lib/components/POIPhotoModal.svelte';
	import type { appActions, appStore  } from '$lib/stores/app-store';
	import type { Input as BitsInput, Badge as BitsBadge, Button as BitsButton, Card as BitsCard  } from 'bits-ui';
	import type { AlertCircle, Edit, Eye, Plus, Search, Shield, Trash2  } from 'lucide-svelte';
	import type { onDestroy, onMount  } from 'svelte';

// Enhanced Person interface with AI analysis and photos
interface Person {
	id: string;
	name: string;
	aliases: string[];
	threat_level: 'low' | 'medium' | 'high' | 'critical';
	status: 'wanted' | 'surveillance' | 'active' | 'cleared';
	last_seen: string | null;
	location: string | null;
	description: string | null;
	photos: string[];
	photoCount?: number;
	cases?: string[];
	photoMetadata: Record<string, any> | null;
	createdAt: string;
	ai_analysis?: {
		risk_score: number;
		patterns: string[];
		recommendations: string[];
		last_updated: string;
	};
}

	// Local reactive state (Svelte 5 runes)
	let persons = $state <Person[]>([]);
	let searchQuery = $state('');
	let selectedThreatLevel = $state('all');
	let showNewPersonModal = $state(false);
	let selectedPerson = $state <Person | null>(null);
	let loading = $state(false);
	let error = $state <string | null>(null);

	// Photo viewer modal state
	let showPhotoViewer = $state(false);
	let viewedPerson = $state <Person | null>(null);
	let viewedPhotos = $state <any[]>([]);
	let currentPhotoIndex = $state(0);

	// New person form state
 	let newPerson = $state({
		name: '',
		aliases: [] as string[],
		aliasesInput: '',
		threat_level: 'low' as Person['threat_level'],
		status: 'surveillance' as Person['status'],
		description: '',
		last_seen: '',
		location: '',
		photos: [] as File[],
		photoPreviews: [] as string[]
	});

	// Convert aliases input to array (simple reactive helper)
	$effect(() => {() => {
		newPerson.aliases = newPerson.aliasesInput
			.split(',')
			.map(alias => alias.trim())
			.filter(alias => alias.length > 0);
	});

	let formError = $state <string | null>(null);

	// Photo handling functions
	function handlePhotoSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files) {
			newPerson.photos = Array.from(files);
			// Generate previews
			newPerson.photoPreviews = [];
			newPerson.photos.forEach((file) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						newPerson.photoPreviews.push(e.target.result as string);
						newPerson.photoPreviews = [...newPerson.photoPreviews]; // Trigger reactivity
					}
				};
				reader.readAsDataURL(file);
			});
		}
	}

	function removePhoto(index: number) {
		newPerson.photos.splice(index, 1);
		newPerson.photoPreviews.splice(index, 1);
		newPerson.photos = [...newPerson.photos];
		newPerson.photoPreviews = [...newPerson.photoPreviews];
	}

	// Photo viewer functions
	async function openPhotoViewer(person: Person, photoIndex: number = 0) {
		try {
			viewedPerson = person;
			currentPhotoIndex = photoIndex;

			// Fetch photos from the new API endpoint
			const response = await fetch(`/api/persons/${person.id}/photos`);
			if (response.ok) {
				const data = await response.json();
				viewedPhotos = data.photos || [];
			} else {
				// Fallback to old system if new API fails
				viewedPhotos = person.photos?.map((url, index) => ({
					url,
					thumbnailUrl: url,
					originalName: `Photo ${index + 1}`,
					aiCaption: null,
					aiTags: [],
					exifData: {},
					forensicData: {}
				})) || [];
			}

			showPhotoViewer = true;
		} catch (err) {
			console.error('Error loading photos:', err);
			// Fallback to old system
			viewedPhotos = person.photos?.map((url, index) => ({
				url,
				thumbnailUrl: url,
				originalName: `Photo ${index + 1}`,
				aiCaption: null,
				aiTags: [],
				exifData: {},
				forensicData: {}
			})) || [];
			showPhotoViewer = true;
		}
	}

	function closePhotoViewer() {
		showPhotoViewer = false;
		viewedPerson = null;
		viewedPhotos = [];
		currentPhotoIndex = 0;
	}

	// Derived filtered list (reactive)
	let filteredPersons = $derived(persons.filter((person) => {
	  if (searchQuery) {
	    const q = searchQuery.toLowerCase();
	    if (
	      person.name.toLowerCase().includes(q) ||
	      person.aliases.some((a) => a.toLowerCase().includes(q)) ||
	      (person.description && person.description.toLowerCase().includes(q)) ||
	      (person.location && person.location.toLowerCase().includes(q))
	    ) {
	      // continue
	    } else {
	      return false;
	    }
	  }

	  if (selectedThreatLevel !== 'all' && person.threat_level !== selectedThreatLevel) return false;

	  return true;
	}));

	const threatColors = {
		low: 'bg-green-100 text-green-800 border-green-200',
		medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		high: 'bg-orange-100 text-orange-800 border-orange-200',
		critical: 'bg-red-100 text-red-800 border-red-200'
	};

	const statusColors = {
		wanted: 'bg-red-100 text-red-800 border-red-200',
		surveillance: 'bg-blue-100 text-blue-800 border-blue-200',
		active: 'bg-purple-100 text-purple-800 border-purple-200',
		cleared: 'bg-gray-100 text-gray-800 border-gray-200'
	};

	// Subscribe to app store
	const unsubscribe = appStore.subscribe((state) => {
		persons = (state.pois || []).map((poi: any) => ({
			id: poi.id,
			name: poi.name,
			aliases: poi.aliases || [],
			threat_level: (poi.threatLevel || 'low') as Person['threat_level'],
			status: (poi.status || 'surveillance') as Person['status'],
			last_seen: poi.lastSeen || null,
			location: poi.lastLocation || null,
			description: poi.description || null,
			photos: poi.photos || [],
			cases: poi.cases || [],
			photoMetadata: poi.photoMetadata || null,
			createdAt: poi.createdAt || new Date().toISOString()
		}));
		loading = !!state.isLoading;
		error = state.error || null;
	});

	onDestroy(() => unsubscribe());

	// Load persons data (fallback if not using store)
	async function loadPersons() {
		try {
			loading = true;
			error = null;

			const response = await fetch('/api/persons');
			if (!response.ok) throw new Error('Failed to load persons');

			const data = await response.json();
			persons = data.persons || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load persons';
			console.error('Error loading persons:', err);
		} finally {
			loading = false;
		}
	}

	async function createPerson() {
		try {
			formError = null;
			if (!newPerson.name.trim()) {
				formError = 'Name is required';
				return;
			}

			// Create FormData for multipart upload
			const formData = new FormData();
			formData.append('name', newPerson.name);
			formData.append('aliases', JSON.stringify(newPerson.aliases));
			formData.append('threat_level', newPerson.threat_level);
			formData.append('status', newPerson.status);
			formData.append('description', newPerson.description || '');
			formData.append('last_seen', newPerson.last_seen || '');
			formData.append('location', newPerson.location || '');

			// Add photos if any
			newPerson.photos.forEach((photo, index) => {
				formData.append('photos', photo);
			});

			const response = await fetch('/api/persons', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) throw new Error('Failed to create person');

			// Reset form
			newPerson = {
				name: '',
				aliases: [],
				aliasesInput: '',
				threat_level: 'low',
				status: 'surveillance',
				description: '',
				last_seen: '',
				location: '',
				photos: [],
				photoPreviews: []
			};
			showNewPersonModal = false;
			await loadPersons();
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to create person';
		}
	}

	async function addPerson(personData: any) {
		try {
			await appActions.createPOI({
				name: personData.name,
				aliases: personData.aliases,
				threatLevel: personData.threat_level,
				status: personData.status,
				description: personData.description,
				lastSeen: personData.last_seen,
				lastLocation: personData.location
			});
			showNewPersonModal = false;
		} catch (err) {
			error = 'Failed to add person';
			console.error('Add person failed:', err);
		}
	}

	async function handleAddPerson() {
		if (!newPerson.name || newPerson.name.trim().length === 0) {
			formError = 'Name is required';
			return;
		}
		try {
			await addPerson(newPerson);
			newPerson = {
				name: '',
				aliases: [],
				aliasesInput: '',
				threat_level: 'low',
				status: 'surveillance',
				description: '',
				last_seen: '',
				location: '',
				photos: [],
				photoPreviews: []
			};
			showNewPersonModal = false;
			formError = null;
		} catch (err) {
			console.error('Failed to add person from modal', err);
			formError = 'Failed to add person';
		}
	}

	async function deletePerson(personId: string) {
		if (!confirm('Are you sure you want to delete this person?')) return;
		try {
			const response = await fetch(`/api/persons/${personId}`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete person');
			await loadPersons();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete person';
		}
	}

	async function getAIAnalysis(personId: string) {
		try {
			const response = await fetch(`/api/persons/${personId}/ai-analysis`);
			if (!response.ok) throw new Error('Failed to get AI analysis');
			const analysis = await response.json();
			persons = persons.map((person) => (person.id === personId ? { ...person, ai_analysis: analysis } : person));
		} catch (err) {
			console.error('Error getting AI analysis:', err);
		}
	}

	function getThreatLevelColor(level: string) {
		switch (level) {
			case 'critical':
				return 'bg-red-500 text-white';
			case 'high':
				return 'bg-orange-500 text-white';
			case 'medium':
				return 'bg-yellow-500 text-black';
			case 'low':
				return 'bg-green-500 text-white';
			default:
				return 'bg-gray-500 text-white';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'wanted':
				return 'bg-red-600 text-white';
			case 'surveillance':
				return 'bg-blue-600 text-white';
			case 'active':
				return 'bg-orange-600 text-white';
			case 'cleared':
				return 'bg-green-600 text-white';
			default:
				return 'bg-gray-600 text-white';
		}
	}

	onMount(() => {
		appActions.loadPOIs();
		const interval = setInterval(() => {
			appActions.loadPOIs();
		}, 60000);
		return () => clearInterval(interval);
	});
</script>

<div class="yorha-interface">
  <!-- Left, Sidebar -->
  <aside class="yorha-sidebar">
    <div class="yorha-logo">
      <div class="yorha-title">YORHA</div>
      <div class="yorha-subtitle">DETECTIVE</div>
      <div class="yorha-subtext">Investigation Interface</div>
    </div>
    <nav class="yorha-nav">
      <div class="nav-section">
        <a href="/yorha-command-center" class="nav-item">
          <span class="nav-icon">⌘</span> COMMAND CENTER
        </a>
        <a href="/yorha/cases" class="nav-item">
          <span class="nav-text">ACTIVE CASES</span>
          <span class="nav-count">3</span>
        </a>
        <a href="/yorha/evidence" class="nav-item">
          <span class="nav-icon">📋</span> EVIDENCE LIBRARY
        </a>
        <!-- Changed to <a> tag and added persons-active class -->
        <a href="/yorha/persons" class="nav-item persons-active">
          <span class="nav-icon">👤</span> PERSONS OF INTEREST
        </a>
        <a href="/yorha/analysis" class="nav-item">
          <span class="nav-icon">📊</span> ANALYSIS
        </a>
        <a href="/yorha/search" class="nav-item">
          <span class="nav-icon">🔍</span> GLOBAL SEARCH
        </a>
        <a href="/yorha/terminal" class="nav-item">
          <span class="nav-icon">></span> TERMINAL
        </a>
      </div>
      <div class="nav-section">
        <a href="/yorha/config" class="nav-item">
          <span class="nav-icon">⚙️</span> SYSTEM CONFIG
        </a>
      </div>
    </nav>
    <div class="yorha-status">
      <div class="status-item">Online</div>
      <div class="status-time">{new Date().toLocaleTimeString()}</div>
      <div class="status-text">System: Operational</div>
    </div>
  </aside>

  <!-- Main, Content -->
  <main class="yorha-main">
    <!-- Header -->
    <header class="persons-header">
      <div class="header-left">
        <button class="header-icon">👤</button>
        <h1 class="persons-title">PERSONS OF INTEREST</h1>
        <div class="persons-subtitle">Surveillance and Investigation Targets</div>
      </div>
      <div class="header-right">
        <BitsButton
          class="header-btn bits-btn"
          onclick={() => (showNewPersonModal = true)}
          type="button"
        >
          <Plus class="w-4" /> ADD PERSON
        </BitsButton>
      </div>
    </header>

    <!-- Search, and, Filters -->
    <div class="search-toolbar">
      <div class="search-section">
        <div class="search-input-wrapper">
          <Search class="search-icon w-4" />
          <BitsInput
            type="text"
            placeholder="Search persons, aliases, descriptions..."
            bind:value={searchQuery}
            class="search-input"
          />
        </div>
        <select bind:value={selectedThreatLevel} class="threat-filter">
          <option value="all">All Threat Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-number">{persons.length}</span>
          <span class="stat-label">Total Persons</span>
        </div>
        <!-- Added 'critical' class to stat-item -->
        <div class="stat-item critical">
          <span class="stat-number"
            >{persons.filter((item) => item.threat_level === 'critical').length}</span
          >
          <span class="stat-label">Critical</span>
        </div>
        <!-- Added 'wanted' class to stat-item -->
        <div class="stat-item wanted">
          <span class="stat-number"
            >{persons.filter((item) => item.status === 'wanted').length}</span
          >
          <span class="stat-label">Wanted</span>
        </div>
      </div>
    </div>

    <!-- Error, State -->
    {#if error}
      <div class="error-banner">
        <AlertCircle class="w-4" />
        {error}
      </div>
    {/if}

    <!-- Persons, Grid -->
    <div class="persons-grid">
      {#if loading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading persons of interest...</div>
        </div>
      {:else}
        <!-- Corrected $derived store access -->
        {#each filteredPersons as person (person.id)}
          <!-- use direct component tags (Svelte, 5 supports dynamic, component, variables) -->
          <BitsCard class="person-nier-bits-card">
            <div class="person-header">
              <div class="person-photo">
                {#if person.photos && person.photos.length > 0}
                  <div class="relative cursor-pointer" onclick={() => openPhotoViewer(person, 0)}>
                    <img src={person.photos[0]} alt={person.name} class="hover:opacity-80 transition-opacity" />
                    {#if person.photos.length > 1}
                      <div class="absolute top-1 right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {person.photos.length}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="photo-placeholder">
                    <Shield class="w-8" />
                  </div>
                {/if}
              </div>
              <div class="person-basic-info">
                <div class="person-name">{person.name}</div>
                <div class="person-alias">"{person.aliases && person.aliases.length > 0 ? person.aliases[0] : 'No alias'}"</div>
                <div class="person-id">{person.id}</div>
              </div>
              <div class="person-badges">
                <Badge class={getThreatLevelColor(person.threat_level)}>
                <BitsBadge class={getThreatLevelColor(person.threat_level)}>
                  {person.threat_level.toUpperCase()}
                </BitsBadge>lass={getStatusColor(person.status)}>
                <BitsBadge class={getStatusColor(person.status)}>
                  {person.status.toUpperCase()}
                </BitsBadge>
            </div>
            <div class="person-content">
              <div class="person-details">
                <span class="detail-label">Last Seen:</span>
                <span class="detail-value">{person.last_seen}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location</span>
                <span class="detail-value">{person.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Cases:</span>
                <span class="detail-value">{person.cases.length} active</span>
              </div>
            </div>
            <div class="person-description">
              {person.description}
            </div>
            <div class="person-cases">
              {#each Array.isArray(person.cases) ? person.cases : [] as caseId (caseId)}
                <span
                  class="case-badge px-2 py-1 rounded text-xs font-medium border border-gray-300"
                  >{caseId}</span
                >
              {/each}
            </div>
            <div class="person-actions nes-container">
              <Button class="bits-btn" size="sm" variant="ghost" type="button">
              <BitsButton class="bits-btn" size="sm" variant="ghost" type="button">
                <Eye class="w-4" /> View
              </BitsButton>its-btn" size="sm" variant="ghost" type="button">
							<BitsButton class="bits-btn" size="sm" variant="ghost" type="button">
								<Edit class="w-4" /> Edit
							</BitsButton>utton class="bits-btn" size="sm" variant="destructive" type="button">
              <BitsButton class="bits-btn" size="sm" variant="destructive" type="button">
                <Trash2 class="w-4" /> Remove
              </BitsButton>
          </Card>
        {/each}
      {/if}
    </div>

    {#if filteredPersons.length === 0}
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-title">No Persons Found</div>
        <!-- fixed missing quote in class attribute -->
        <div class="empty-subtitle">
          {searchQuery
            ? 'Try adjusting your search criteria'
            : 'Add persons of interest to begin tracking'}
        </div>
      </div>
    {/if}
  </main>
</div>

{#if showNewPersonModal}
  <!-- overlay: focusable, has ARIA role and keyboard handler to, close, modal -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    aria-label="Close person modal"
    onclick={() => (showNewPersonModal = false)}
    onkeydown={(e) => {
      // Close on Enter / Space / Escape for keyboard users
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') {
        showNewPersonModal = false;
      }
    }}
  >
    <!-- dialog: stop propagation, explicitly, labelled, modal, semantics -->
    <div
      class="yorha-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <header class="dialog-header">
        <!-- ensure the heading has the id referenced, by, aria-labelledby -->
        <h3 id="dialog-title" class="dialog-title">ADD PERSON OF INTEREST</h3>
        <button
          class="close-btn"
          aria-label="Close"
          type="button"
          onclick={() => (showNewPersonModal = false)}
        >
          Ã—
        </button>
      </header>
      <div class="modal-form">
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label" for="full-name">FULL NAME</label>
            <Input
            <BitsInput
              id="full-name"
              placeholder="Enter full name"
              class="yorha-input"
              bind:value={newPerson.name}
            />v>
          <div class="form-field">
            <label class="form-label" for="alias">ALIAS / CODENAME</label>
            <Input
            <BitsInput
              id="alias"
              placeholder="Known aliases (comma-separated)"
              class="yorha-input"
              bind:value={newPerson.aliasesInput}
            />v>
          <div class="form-field">
            <label class="form-label" for="threat-level">THREAT LEVEL</label>
            <select id="threat-level" class="yorha-select" bind:value={newPerson.threat_level}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label" for="status">STATUS</label>
            <select id="status" class="yorha-select" bind:value={newPerson.status}>
              <option value="surveillance">Under Surveillance</option>
              <option value="wanted">Wanted</option>
              <option value="active">Active Investigation</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label" for="last-seen">LAST SEEN DATE</label>
            <Input
            <BitsInput
              id="last-seen"
              type="date"
              class="yorha-input"
              bind:value={newPerson.last_seen}
            />v>
          <div class="form-field">
            <label class="form-label" for="location">LAST KNOWN LOCATION</label>
            <Input
            <BitsInput
              id="location"
              placeholder="e.g. Downtown District"
              class="yorha-input"
              bind:value={newPerson.location}
            />v>
          <div class="form-field">
            <label class="form-label" for="description">DESCRIPTION</label>
            <textarea
              id="description"
              placeholder="Physical description, known activities, etc."
              rows="4"
              class="yorha-textarea"
              bind:value={newPerson.description}
            ></textarea>
          </div>
          <div class="form-field">
            <label class="form-label" for="photos">PHOTOS</label>
            <input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onchange={handlePhotoSelect}
              class="yorha-file-input"
            />
            <div class="text-xs text-gray-400 mt-1">Upload multiple photos for AI analysis and facial recognition</div>

            <!-- Photo Previews -->
            {#if newPerson.photoPreviews.length > 0}
              <div class="photo-previews mt-2">
                {#each newPerson.photoPreviews as preview}
                  <div class="photo-preview">
                    <img src={preview} alt="Preview" />
                    <button
                      type="button"
                      onclick={() => removePhoto(newPerson.photoPreviews.indexOf(preview))}
                      class="photo-remove"
                    >
                      ×
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
      <footer class="dialog-footer">
        <Button
        <BitsButton
          class="bits-btn"
          variant="ghost"
          onclick={() => {
            showNewPersonModal = false;
            newPerson = {
              name: '',
              aliases: [],
              aliasesInput: '',
              threat_level: 'low',
              status: 'surveillance',
              description: '',
              last_seen: '',
              location: '',
              photos: [],
              photoPreviews: []
            };
          }}
          type="button"
        >
          CANCEL
        <BitsButton class="bits-btn" onclick={handleAddPerson} type="submit">ADD PERSON</BitsButton>ton>
      </footer>
    </div>
  </div>
{/if}



<!-- Photo Viewer Modal -->
<POIPhotoModal
  bind:open={showPhotoViewer}
  photos={viewedPhotos}
  bind:currentIndex={currentPhotoIndex}
  on:close={closePhotoViewer}
/>


