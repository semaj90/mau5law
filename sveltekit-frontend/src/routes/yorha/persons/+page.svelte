<script lang="ts">
	import { goto } from '$app/navigation';
	import { appActions, appStore } from '$lib/stores/app-store';
	import {
	  Alert,
	  AlertDescription,
	  Badge,
	  Button,
	  Card,
	  CardContent,
	  CardHeader,
	  CardTitle,
	  Dialog,
	  DialogContent,
	  DialogHeader,
	  DialogTitle,
	  DialogTrigger,
	  Input,
	  Select,
	  SelectContent,
	  SelectItem,
	  SelectTrigger,
	  SelectValue,
	  Tooltip,
	  TooltipContent,
	  TooltipProvider,
	  TooltipTrigger
	} from "bits-ui";
	import POIPhotoModal from '$lib/components/POIPhotoModal.svelte';
	import { onDestroy, onMount } from 'svelte';

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

	// Local reactive state (standard Svelte)
	let persons: Person[] = [];
	let searchQuery = '';
	let selectedThreatLevel: string = 'all';
	let showNewPersonModal = false;
	let selectedPerson: Person | null = null;
	let loading = false;
	let error: string | null = null;

	// Photo viewer modal state
	let showPhotoViewer = false;
	let viewedPerson: Person | null = null;
	let viewedPhotos: any[] = [];
	let currentPhotoIndex = 0;

	// New person form state
 	let newPerson = {
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
	};

	// Convert aliases input to array (simple reactive helper)
	$: newPerson.aliases = newPerson.aliasesInput
		.split(',')
		.map(alias => alias.trim())
		.filter(alias => alias.length > 0);

	let formError: string | null = null;

	// Photo handling functions
	function handlePhotoSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files) {
			newPerson.photos = Array.from(files);
			// Generate previews
			newPerson.photoPreviews = [];
			newPerson.photos.forEach((file, index) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						newPerson.photoPreviews[index] = e.target.result as string;
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
	$: filteredPersons = persons.filter((person) => {
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
	});

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
				location: personData.location
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
				location: ''
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

	onMount(async () => {
		await appActions.loadPOIs();
		const interval = setInterval(async () => {
			await appActions.loadPOIs();
		}, 60000);
		return () => clearInterval(interval);
	});
</script>

<div class="persons-of-interest-container">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
				<User class="w-8 h-8 text-blue-600" />
				Persons of Interest
			</h1>
			<p class="text-gray-600 mt-1">FugitiveDex POI Management System</p>
		</div>

		<div class="flex items-center gap-4">
			<!-- Search -->
			<div class="relative">
				<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
				<Input
					bind:value={searchQuery}
					placeholder="Search persons..."
					class="pl-10 w-64"
				/>
			</div>

			<!-- Threat Level Filter -->
			<Select bind:value={selectedThreatLevel}>
				<SelectTrigger class="w-40">
					<SelectValue placeholder="Threat Level" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Levels</SelectItem>
					<SelectItem value="low">Low</SelectItem>
					<SelectItem value="medium">Medium</SelectItem>
					<SelectItem value="high">High</SelectItem>
					<SelectItem value="critical">Critical</SelectItem>
				</SelectContent>
			</Select>

			<!-- Add New Person -->
			<Dialog bind:open={showNewPersonModal}>
				<DialogTrigger asChild>
					<Button class="flex items-center gap-2">
						<Plus class="w-4 h-4" />
						Add Person
					</Button>
				</DialogTrigger>
				<DialogContent class="max-w-md">
					<DialogHeader>
						<DialogTitle>Add New Person of Interest</DialogTitle>
					</DialogHeader>

					<div class="space-y-4">
						{#if formError}
							<Alert variant="destructive">
								<AlertTriangle class="w-4 h-4" />
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						{/if}

							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="bits-name" class="text-sm font-medium">Name *</label>
									<Input id="bits-name" bind:value={newPerson.name} placeholder="Full name" />
								</div>
								<div>
									<label for="bits-aliases" class="text-sm font-medium">Aliases</label>
									<Input
										id="bits-aliases"
										bind:value={newPerson.aliasesInput}
										placeholder="Known aliases (comma-separated)"
									/>
								</div>
							</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="bits-threat" class="text-sm font-medium">Threat Level</label>
								<Select id="bits-threat" bind:value={newPerson.threat_level}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="critical">Critical</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label for="bits-status" class="text-sm font-medium">Status</label>
								<Select id="bits-status" bind:value={newPerson.status}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="surveillance">Surveillance</SelectItem>
										<SelectItem value="wanted">Wanted</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="cleared">Cleared</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<label for="bits-last-seen" class="text-sm font-medium">Last Seen</label>
							<Input id="bits-last-seen" bind:value={newPerson.last_seen} type="date" />
						</div>

						<div>
							<label for="bits-location" class="text-sm font-medium">Location</label>
							<Input id="bits-location" bind:value={newPerson.location} placeholder="Last known location" />
						</div>

						<div>
							<label for="bits-description" class="text-sm font-medium">Description</label>
							<textarea
								id="bits-description"
								bind:value={newPerson.description}
								class="w-full p-2 border border-gray-300 rounded-md resize-none"
								rows="3"
								placeholder="Additional details..."
							></textarea>
						</div>

						<!-- Photo Upload Section -->
						<div>
							<label for="bits-photos" class="text-sm font-medium">Photos</label>
							<div class="mt-2">
								<input
									id="bits-photos"
									type="file"
									accept="image/*"
									multiple
									on:change={handlePhotoSelect}
									class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
								/>
								<p class="mt-1 text-xs text-gray-500">Upload multiple photos for facial recognition and forensic analysis</p>
							</div>

							<!-- Photo Previews -->
							{#if newPerson.photoPreviews.length > 0}
								<div class="mt-3 grid grid-cols-2 gap-2">
									{#each newPerson.photoPreviews as preview, index}
										<div class="relative">
											<img
												src={preview}
												alt="Preview {index + 1}"
												class="w-full h-20 object-cover rounded-md border"
											/>
											<button
												type="button"
												on:click={() => removePhoto(index)}
												class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
											>
												×
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="flex justify-end gap-2">
							<Button variant="outline" onclick={() => showNewPersonModal = false}>
								Cancel
							</Button>
							<Button onclick={createPerson}>
								Create Person
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	</div>

	<!-- Error Alert -->
	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertTriangle class="w-4 h-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-2 text-gray-600">Loading persons...</span>
		</div>
	{:else}
		<!-- Persons Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredPersons as person (person.id)}
				<Card class="hover:shadow-lg transition-shadow cursor-pointer" onclick={() => selectedPerson = person}>
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								{#if person.photos && person.photos.length > 0}
									<div class="relative cursor-pointer" on:click={() => openPhotoViewer(person, 0)}>
										<img
											src={person.photos[0]}
											alt={person.name}
											class="w-12 h-12 rounded-full object-cover border-2 border-gray-200 hover:border-blue-400 transition-colors"
										/>
										{#if person.photos.length > 1}
											<div class="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
												{person.photos.length}
											</div>
										{/if}
									</div>
								{:else}
									<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
										<User class="w-6 h-6 text-gray-500" />
									</div>
								{/if}
								<div>
									<CardTitle class="text-lg">{person.name}</CardTitle>
									{#if person.aliases && person.aliases.length > 0}
										<p class="text-sm text-gray-500">"{person.aliases[0]}"{#if person.aliases.length > 1}, +{person.aliases.length - 1} more{/if}</p>
									{/if}
								</div>
							</div>

							<div class="flex gap-1">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												onclick={(e) => { e.stopPropagation(); getAIAnalysis(person.id); }}
											>
												<Shield class="w-4 h-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Get AI Analysis</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												onclick={(e) => { e.stopPropagation(); goto(`/persons/${person.id}`); }}
											>
												<Eye class="w-4 h-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>View Details</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
															<Button
																			variant="ghost"
																			size="sm"
																			onclick={(e) => { e.stopPropagation(); goto(`/persons/${person.id}/edit`); }}
																		>
																			<Edit3 class="w-4 h-4" />
																		</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Edit Person</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												onclick={(e) => { e.stopPropagation(); deletePerson(person.id); }}
											>
												<Trash2 class="w-4 h-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Delete Person</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
					</CardHeader>

					<CardContent class="space-y-3">
						<div class="flex gap-2">
							<Badge class={threatColors[person.threat_level]}>
								{person.threat_level.toUpperCase()}
							</Badge>
							<Badge class={statusColors[person.status]}>
								{person.status.toUpperCase()}
							</Badge>
						</div>

						{#if person.location}
							<div class="flex items-center gap-2 text-sm text-gray-600">
								<MapPin class="w-4 h-4" />
								<span>{person.location}</span>
							</div>
						{/if}

						{#if person.last_seen}
							<div class="flex items-center gap-2 text-sm text-gray-600">
								<Calendar class="w-4 h-4" />
								<span>Last seen: {new Date(person.last_seen).toLocaleDateString()}</span>
							</div>
						{/if}

						{#if person.description}
							<p class="text-sm text-gray-700 line-clamp-2">{person.description}</p>
						{/if}

						{#if person.cases && person.cases.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each person.cases.slice(0, 3) as caseId}
									<Badge variant="outline" class="text-xs">
										Case {caseId}
									</Badge>
								{/each}
								{#if person.cases.length > 3}
									<Badge variant="outline" class="text-xs">
										+{person.cases.length - 3} more
									</Badge>
								{/if}
							</div>
						{/if}

						{#if person.ai_analysis}
							<div class="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-blue-900">AI Analysis</span>
									<span class="text-xs text-blue-600">
										Risk: {person.ai_analysis.risk_score}%
									</span>
								</div>
								{#if person.ai_analysis.patterns && person.ai_analysis.patterns.length > 0}
									<div class="text-xs text-blue-800">
										<strong>Patterns:</strong> {person.ai_analysis.patterns.slice(0, 2).join(', ')}
										{#if person.ai_analysis.patterns.length > 2}
											...
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if filteredPersons.length === 0}
			<div class="text-center py-12">
				<User class="w-16 h-16 text-gray-400 mx-auto mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">No persons found</h3>
				<p class="text-gray-600">
					{#if searchQuery || selectedThreatLevel !== 'all'}
						Try adjusting your search or filter criteria.
					{:else}
						Get started by adding your first person of interest.
					{/if}
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.persons-of-interest-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-clamp: 2;
	}
</style>

<style>
	/* YoRHa Interface Styles */
	.yorha-interface {
		display: flex;
		min-height: 100vh;
		background: #000;
		color: #00ff41;
		font-family: 'Courier New', monospace;
	}

	.yorha-sidebar {
		width: 250px;
		background: rgba(0, 255, 65, 0.1);
		border-right: 1px solid #00ff41;
		padding: 20px;
	}

	.yorha-logo {
		text-align: center;
		margin-bottom: 30px;
	}

	.yorha-title {
		font-size: 24px;
		font-weight: bold;
		margin-bottom: 5px;
	}

	.yorha-subtitle {
		font-size: 14px;
		opacity: 0.8;
	}

	.yorha-subtext {
		font-size: 10px;
		opacity: 0.6;
		margin-top: 2px;
	}

	.yorha-nav {
		margin-bottom: 30px;
	}

	.nav-section {
		margin-bottom: 20px;
	}

	.nav-item {
		display: block;
		padding: 8px 12px;
		margin-bottom: 5px;
		color: #00ff41;
		text-decoration: none;
		border: 1px solid transparent;
		transition: all 0.3s;
	}

	.nav-item:hover {
		background: rgba(0, 255, 65, 0.2);
		border-color: #00ff41;
	}

	.nav-item.persons-active {
		background: rgba(0, 255, 65, 0.3);
		border-color: #00ff41;
	}

	.nav-icon {
		margin-right: 8px;
	}

	.nav-count {
		float: right;
		background: #00ff41;
		color: #000;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 12px;
	}

	.yorha-status {
		border-top: 1px solid #00ff41;
		padding-top: 20px;
		font-size: 12px;
	}

	.status-item {
		margin-bottom: 5px;
	}

	.status-time {
		color: #ffff00;
	}

	.status-text {
		color: #00ffff;
	}

	.yorha-main {
		flex: 1;
		padding: 20px;
		background: rgba(0, 0, 0, 0.9);
	}

	.persons-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		border-bottom: 1px solid #00ff41;
		padding-bottom: 15px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.header-icon {
		font-size: 24px;
		cursor: pointer;
	}

	.persons-title {
		font-size: 28px;
		font-weight: bold;
		margin: 0;
	}

	.persons-subtitle {
		font-size: 14px;
		opacity: 0.8;
		margin: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.header-btn {
		background: #00ff41;
		color: #000;
		border: none;
		padding: 8px 16px;
		cursor: pointer;
		font-family: inherit;
		font-size: 14px;
		transition: background 0.3s;
	}

	.header-btn:hover {
		background: #00cc33;
	}

	.search-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding: 15px;
		background: rgba(0, 255, 65, 0.1);
		border: 1px solid #00ff41;
	}

	.search-section {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.search-input-wrapper {
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: #00ff41;
	}

	.search-input {
		padding: 8px 12px 8px 35px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid #00ff41;
		color: #00ff41;
		font-family: inherit;
		min-width: 300px;
	}

	.threat-filter {
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid #00ff41;
		color: #00ff41;
		font-family: inherit;
	}

	.stats-section {
		display: flex;
		gap: 20px;
	}

	.stat-item {
		text-align: center;
	}

	.stat-item.critical {
		color: #ff4444;
	}

	.stat-item.wanted {
		color: #ff8844;
	}

	.stat-number {
		font-size: 24px;
		font-weight: bold;
		display: block;
	}

	.stat-label {
		font-size: 12px;
		opacity: 0.8;
	}

	.error-banner {
		background: rgba(255, 68, 68, 0.2);
		border: 1px solid #ff4444;
		color: #ff4444;
		padding: 10px 15px;
		margin-bottom: 20px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.persons-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 20px;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 50px;
		color: #00ff41;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(0, 255, 65, 0.3);
		border-top: 3px solid #00ff41;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 15px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.loading-text {
		font-size: 16px;
	}

	.person-nier-bits-card {
		background: rgba(0, 255, 65, 0.1);
		border: 1px solid #00ff41;
		padding: 15px;
		transition: all 0.3s;
		cursor: pointer;
	}

	.person-nier-bits-card:hover {
		background: rgba(0, 255, 65, 0.2);
		box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
	}

	.person-header {
		display: flex;
		align-items: center;
		gap: 15px;
		margin-bottom: 15px;
	}

	.person-photo {
		position: relative;
	}

	.person-photo img {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		border: 2px solid #00ff41;
		object-fit: cover;
	}

	.photo-placeholder {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		border: 2px solid #00ff41;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 255, 65, 0.1);
		color: #00ff41;
	}

	.person-basic-info {
		flex: 1;
	}

	.person-name {
		font-size: 18px;
		font-weight: bold;
		margin-bottom: 5px;
	}

	.person-alias {
		font-size: 14px;
		opacity: 0.8;
		margin-bottom: 5px;
	}

	.person-id {
		font-size: 12px;
		opacity: 0.6;
	}

	.person-badges {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.person-content {
		margin-bottom: 15px;
	}

	.person-details {
		display: flex;
		justify-content: space-between;
		margin-bottom: 5px;
		font-size: 14px;
	}

	.detail-label {
		opacity: 0.8;
	}

	.detail-value {
		color: #00ff41;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 5px;
		font-size: 14px;
	}

	.person-description {
		font-size: 14px;
		margin-bottom: 10px;
		line-height: 1.4;
	}

	.person-cases {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-bottom: 15px;
	}

	.case-badge {
		background: rgba(0, 255, 65, 0.2);
		border: 1px solid #00ff41;
		color: #00ff41;
		padding: 2px 8px;
		border-radius: 3px;
		font-size: 12px;
	}

	.person-actions {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}

	.bits-btn {
		background: #00ff41;
		color: #000;
		border: none;
		padding: 6px 12px;
		cursor: pointer;
		font-family: inherit;
		font-size: 14px;
		transition: background 0.3s;
		flex: 1;
	}

	.bits-btn:hover {
		background: #00cc33;
	}

	.bits-btn[variant="ghost"] {
		background: transparent;
		border: 1px solid #00ff41;
		color: #00ff41;
	}

	.bits-btn[variant="destructive"] {
		background: #ff4444;
		color: #fff;
	}

	.bits-btn[variant="destructive"]:hover {
		background: #cc3333;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 50px;
		color: #00ff41;
		text-align: center;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 20px;
	}

	.empty-title {
		font-size: 24px;
		margin-bottom: 10px;
	}

	.empty-subtitle {
		font-size: 16px;
		opacity: 0.8;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.yorha-modal {
		background: #000;
		border: 2px solid #00ff41;
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 1px solid #00ff41;
	}

	.dialog-title {
		font-size: 20px;
		font-weight: bold;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		color: #00ff41;
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: rgba(0, 255, 65, 0.2);
	}

	.modal-form {
		padding: 20px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
	}

	.form-field:nth-child(7) {
		grid-column: span 2;
	}

	.form-field:nth-child(8) {
		grid-column: span 2;
	}

	.form-label {
		font-size: 12px;
		font-weight: bold;
		margin-bottom: 5px;
		color: #00ff41;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.yorha-input,
	.yorha-select,
	.yorha-textarea,
	.yorha-file-input {
		background: rgba(0, 255, 65, 0.1);
		border: 1px solid #00ff41;
		color: #00ff41;
		padding: 8px 12px;
		font-family: inherit;
		font-size: 14px;
	}

	.yorha-input:focus,
	.yorha-select:focus,
	.yorha-textarea:focus,
	.yorha-file-input:focus {
		outline: none;
		box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
	}

	.yorha-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.yorha-file-input {
		cursor: pointer;
	}

	.photo-previews {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 10px;
		margin-top: 10px;
	}

	.photo-preview {
		position: relative;
	}

	.photo-preview img {
		width: 100%;
		height: 60px;
		object-fit: cover;
		border: 1px solid #00ff41;
		border-radius: 3px;
	}

	.photo-remove {
		position: absolute;
		top: -5px;
		right: -5px;
		background: #ff4444;
		color: white;
		border: none;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		cursor: pointer;
		font-size: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.photo-remove:hover {
		background: #cc3333;
	}

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 20px;
		border-top: 1px solid #00ff41;
	}
</style>




<svelte:head>
  <title>PERSONS OF INTEREST - YoRHa Detective Interface</title>
</svelte:head>

<!-- YoRHa, Interface -->
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
        <Button
          class="header-btn bits-btn"
          onclick={() => (showNewPersonModal = true)}
          type="button"
        >
          <Plus class="w-4" /> ADD PERSON
        </Button>
      </div>
    </header>

    <!-- Search, and, Filters -->
    <div class="search-toolbar">
      <div class="search-section">
        <div class="search-input-wrapper">
          <Search class="search-icon w-4" />
          <Input
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
        <AlertTriangle class="w-4" />
        {error}
      </div>
    {/if}

    <!-- Persons, Grid -->
    <div class="persons-grid">
      {#if isLoading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading persons of interest...</div>
        </div>
      {:else}
        <!-- Corrected $derived store access -->
        {#each filteredPersons() as person (person.id)}
          <!-- use direct component tags (Svelte, 5 supports dynamic, component, variables) -->
          <!-- @ts-expect-error: Type '() => any' is not assignable to type 'never'. Type 'string' is not assignable to type 'never'. This is likely a type inference issue with Svelte 5 and the Card component's definition. -->
          <Card class="person-nier-bits-card">
            <div class="person-header">
              <div class="person-photo">
                {#if person.photos && person.photos.length > 0}
                  <div class="relative cursor-pointer" on:click={() => openPhotoViewer(person, 0)}>
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
                  {person.threat_level.toUpperCase()}
                </Badge>
                <Badge class={getStatusColor(person.status)}>
                  {person.status.toUpperCase()}
                </Badge>
              </div>
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
                <Eye class="w-4" /> View
              </Button>
							<Button class="bits-btn" size="sm" variant="ghost" type="button">
								<Edit3 class="w-4" /> Edit
							</Button>
              <Button class="bits-btn" size="sm" variant="destructive" type="button">
                <Trash2 class="w-4" /> Remove
              </Button>
            </div>
          </Card>
        {/each}
      {/if}
    </div>

    {#if filteredPersons().length === 0}
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
              id="full-name"
              placeholder="Enter full name"
              class="yorha-input"
              bind:value={newPerson.name}
            />
          </div>
          <div class="form-field">
            <label class="form-label" for="alias">ALIAS / CODENAME</label>
            <Input
              id="alias"
              placeholder="Known aliases (comma-separated)"
              class="yorha-input"
              bind:value={newPerson.aliasesInput}
            />
          </div>
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
              id="last-seen"
              type="date"
              class="yorha-input"
              bind:value={newPerson.last_seen}
            />
          </div>
          <div class="form-field">
            <label class="form-label" for="location">LAST KNOWN LOCATION</label>
            <Input
              id="location"
              placeholder="e.g. Downtown District"
              class="yorha-input"
              bind:value={newPerson.location}
            />
          </div>
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
              on:change={handlePhotoSelect}
              class="yorha-file-input"
            />
            <div class="text-xs text-gray-400 mt-1">Upload multiple photos for AI analysis and facial recognition</div>

            <!-- Photo Previews -->
            {#if newPerson.photoPreviews.length > 0}
              <div class="photo-previews mt-2">
                {#each newPerson.photoPreviews as preview, index}
                  <div class="photo-preview">
                    <img src={preview} alt="Preview {index + 1}" />
                    <button
                      type="button"
                      on:click={() => removePhoto(index)}
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
        </Button>
        <Button class="bits-btn" onclick={handleAddPerson} type="submit">ADD PERSON</Button>
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


