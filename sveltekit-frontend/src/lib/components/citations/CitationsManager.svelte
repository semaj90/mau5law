<!-- Citations Manager - Legal Citation System with AI-powered search -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Input } from '$lib/components/ui/input';
	import { 
		Search, BookOpen, ExternalLink, Download, 
		Plus, FileText, Calendar, User, Tags,
		Filter, SortAsc, Eye, Edit, Trash2
	} from 'lucide-svelte';

	// Svelte 5 state management
	let citations = $state<any[]>([]);
	let filteredCitations = $state<any[]>([]);
	let searchQuery = $state('');
	let selectedCategory = $state('all');
	let sortBy = $state<'date' | 'title' | 'relevance'>('date');
	let isLoading = $state(false);
	
	let citationCategories = $state([
		{ id: 'all', label: 'All Citations', count: 0 },
		{ id: 'cases', label: 'Case Law', count: 0 },
		{ id: 'statutes', label: 'Statutes', count: 0 },
		{ id: 'regulations', label: 'Regulations', count: 0 },
		{ id: 'articles', label: 'Articles', count: 0 },
		{ id: 'evidence', label: 'Evidence', count: 0 }
	]);

	let newCitation = $state({
		title: '',
		authors: '',
		year: new Date().getFullYear(),
		source: '',
		category: 'cases',
		pages: '',
		url: '',
		notes: '',
		tags: [] as string[],
		relevanceScore: 0
	});

	let showAddForm = $state(false);
	let selectedCitation = $state<any>(null);
	let showDetailModal = $state(false);

	// Component props
	let { 
		caseId = '',
		readonly = false
	} = $props<{
		caseId?: string;
		readonly?: boolean;
	}>();

	// Initialize citations
	onMount(async () => {
		await loadCitations();
		updateCategoryCounts();
	});

	async function loadCitations() {
		isLoading = true;
		console.log('📚 Loading citations for case:', caseId);

		try {
			// Load sample citations data
			citations = [
				{
					id: 'citation-1',
					title: 'Brown v. Board of Education',
					authors: 'Supreme Court of the United States',
					year: 1954,
					source: '347 U.S. 483',
					category: 'cases',
					pages: '483-496',
					url: 'https://supreme.justia.com/cases/federal/us/347/483/',
					notes: 'Landmark case establishing that racial segregation in public schools is unconstitutional',
					tags: ['constitutional-law', 'education', 'civil-rights', 'segregation'],
					relevanceScore: 95,
					dateAdded: new Date('2024-01-15'),
					caseId
				},
				{
					id: 'citation-2',
					title: 'Federal Rules of Evidence',
					authors: 'U.S. Congress',
					year: 2023,
					source: 'Fed. R. Evid.',
					category: 'statutes',
					pages: 'Rule 401-403',
					url: 'https://www.law.cornell.edu/rules/fre',
					notes: 'Rules governing admissibility of evidence in federal court proceedings',
					tags: ['evidence-law', 'federal-rules', 'admissibility', 'relevance'],
					relevanceScore: 88,
					dateAdded: new Date('2024-01-16'),
					caseId
				},
				{
					id: 'citation-3',
					title: 'Miranda v. Arizona',
					authors: 'Supreme Court of the United States',
					year: 1966,
					source: '384 U.S. 436',
					category: 'cases',
					pages: '436-526',
					url: 'https://supreme.justia.com/cases/federal/us/384/436/',
					notes: 'Established Miranda rights - suspects must be informed of rights before interrogation',
					tags: ['criminal-law', 'constitutional-rights', 'interrogation', 'fifth-amendment'],
					relevanceScore: 92,
					dateAdded: new Date('2024-01-17'),
					caseId
				},
				{
					id: 'citation-4',
					title: 'Digital Evidence and Computer Crime',
					authors: 'Casey, E. & Rose, C.',
					year: 2022,
					source: 'Academic Press',
					category: 'articles',
					pages: '1-45',
					url: 'https://doi.org/example',
					notes: 'Comprehensive guide to handling digital evidence in modern legal proceedings',
					tags: ['digital-forensics', 'computer-crime', 'evidence-handling', 'technology'],
					relevanceScore: 78,
					dateAdded: new Date('2024-01-18'),
					caseId
				}
			];

			filteredCitations = citations;
			updateCategoryCounts();
			console.log(`✅ Loaded ${citations.length} citations`);
		} catch (error) {
			console.error('❌ Failed to load citations:', error);
		} finally {
			isLoading = false;
		}
	}

	function updateCategoryCounts() {
		citationCategories = citationCategories.map(category => ({
			...category,
			count: category.id === 'all' 
				? citations.length 
				: citations.filter(c => c.category === category.id).length
		}));
	}

	function filterCitations() {
		let filtered = citations;

		// Filter by category
		if (selectedCategory !== 'all') {
			filtered = filtered.filter(c => c.category === selectedCategory);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(c => 
				c.title.toLowerCase().includes(query) ||
				c.authors.toLowerCase().includes(query) ||
				c.source.toLowerCase().includes(query) ||
				c.notes.toLowerCase().includes(query) ||
				c.tags.some(tag => tag.toLowerCase().includes(query))
			);
		}

		// Sort results
		filtered.sort((a, b) => {
			switch (sortBy) {
				case 'title':
					return a.title.localeCompare(b.title);
				case 'relevance':
					return b.relevanceScore - a.relevanceScore;
				case 'date':
				default:
					return b.dateAdded.getTime() - a.dateAdded.getTime();
			}
		});

		filteredCitations = filtered;
	}

	function handleSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;
		filterCitations();
	}

	function selectCategory(categoryId: string) {
		selectedCategory = categoryId;
		filterCitations();
	}

	function changeSortBy(newSortBy: 'date' | 'title' | 'relevance') {
		sortBy = newSortBy;
		filterCitations();
	}

	function showAddCitationForm() {
		showAddForm = true;
		newCitation = {
			title: '',
			authors: '',
			year: new Date().getFullYear(),
			source: '',
			category: 'cases',
			pages: '',
			url: '',
			notes: '',
			tags: [],
			relevanceScore: 0
		};
	}

	function hideAddCitationForm() {
		showAddForm = false;
	}

	async function saveCitation() {
		if (!newCitation.title.trim() || !newCitation.authors.trim()) {
			console.error('❌ Title and authors are required');
			return;
		}

		const citation = {
			...newCitation,
			id: `citation-${Date.now()}`,
			dateAdded: new Date(),
			caseId
		};

		try {
			console.log('💾 Saving citation:', citation.title);
			
			// Save to server (stubbed)
			const response = await fetch('/api/legal/citations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(citation)
			});

			if (response.ok) {
				citations = [...citations, citation];
				updateCategoryCounts();
				filterCitations();
				hideAddCitationForm();
				console.log('✅ Citation saved successfully');
			}
		} catch (error) {
			console.error('❌ Failed to save citation:', error);
		}
	}

	function viewCitationDetails(citation: any) {
		selectedCitation = citation;
		showDetailModal = true;
	}

	function hideDetailModal() {
		showDetailModal = false;
		selectedCitation = null;
	}

	async function deleteCitation(citationId: string) {
		if (!confirm('Are you sure you want to delete this citation?')) {
			return;
		}

		try {
			const response = await fetch(`/api/legal/citations/${citationId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				citations = citations.filter(c => c.id !== citationId);
				updateCategoryCounts();
				filterCitations();
				console.log('✅ Citation deleted successfully');
			}
		} catch (error) {
			console.error('❌ Failed to delete citation:', error);
		}
	}

	function formatCitation(citation: any): string {
		// Generate proper legal citation format
		switch (citation.category) {
			case 'cases':
				return `${citation.title}, ${citation.source} (${citation.year})`;
			case 'statutes':
				return `${citation.source} (${citation.year})`;
			case 'articles':
				return `${citation.authors}, ${citation.title}, ${citation.source} (${citation.year})`;
			default:
				return `${citation.authors}, ${citation.title}, ${citation.source} (${citation.year})`;
		}
	}

	async function exportCitations() {
		console.log('📄 Exporting citations...');
		
		const exportData = filteredCitations.map(citation => ({
			formattedCitation: formatCitation(citation),
			...citation
		}));

		// Create downloadable file
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
			type: 'application/json' 
		});
		
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `citations-${caseId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<!-- Citations Manager Interface -->
<div class="w-full h-full flex flex-col bg-background">
	<!-- Header -->
	<Card class="mb-4">
		<CardHeader class="pb-3">
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-4">
					<div class="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
						<BookOpen class="w-5 h-5 text-primary" />
					</div>
					<div>
						<CardTitle class="text-xl">Citations & References</CardTitle>
						<p class="text-sm text-muted-foreground">Legal citation management system</p>
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					{#if !readonly}
						<Button variant="outline" size="sm" onclick={showAddCitationForm}>
							<Plus class="w-4 h-4 mr-1" />
							Add Citation
						</Button>
					{/if}
					<Button variant="outline" size="sm" onclick={exportCitations}>
						<Download class="w-4 h-4 mr-1" />
						Export
					</Button>
				</div>
			</div>
		</CardHeader>
	</Card>

	<!-- Search and Filters -->
	<Card class="mb-4">
		<CardContent class="py-4">
			<div class="flex flex-col lg:flex-row gap-4">
				<!-- Search -->
				<div class="flex-1">
					<div class="relative">
						<Search class="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
						<Input
							placeholder="Search citations, authors, sources..."
							value={searchQuery}
							oninput={handleSearch}
							class="pl-9"
						/>
					</div>
				</div>
				
				<!-- Sort Options -->
				<div class="flex gap-2">
					<Button
						variant={sortBy === 'date' ? 'default' : 'outline'}
						size="sm"
						onclick={() => changeSortBy('date')}
					>
						<Calendar class="w-4 h-4 mr-1" />
						Date
					</Button>
					<Button
						variant={sortBy === 'title' ? 'default' : 'outline'}
						size="sm"
						onclick={() => changeSortBy('title')}
					>
						<SortAsc class="w-4 h-4 mr-1" />
						Title
					</Button>
					<Button
						variant={sortBy === 'relevance' ? 'default' : 'outline'}
						size="sm"
						onclick={() => changeSortBy('relevance')}
					>
						<Filter class="w-4 h-4 mr-1" />
						Relevance
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Main Content -->
	<div class="flex-1 grid grid-cols-4 gap-4">
		<!-- Categories Sidebar -->
		<Card class="h-fit">
			<CardHeader class="pb-3">
				<CardTitle class="text-sm">Categories</CardTitle>
			</CardHeader>
			<CardContent class="space-y-2">
				{#each citationCategories as category}
					<button
						class="w-full flex justify-between items-center p-2 rounded text-sm hover:bg-muted transition-colors"
						class:bg-primary={selectedCategory === category.id}
						class:text-primary-foreground={selectedCategory === category.id}
						onclick={() => selectCategory(category.id)}
					>
						<span>{category.label}</span>
						<Badge variant="secondary" class="text-xs">
							{category.count}
						</Badge>
					</button>
				{/each}
			</CardContent>
		</Card>

		<!-- Citations List -->
		<div class="col-span-3 space-y-4">
			{#if isLoading}
				<Card>
					<CardContent class="py-8 text-center">
						<div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
						<p class="text-sm text-muted-foreground">Loading citations...</p>
					</CardContent>
				</Card>
			{:else if filteredCitations.length === 0}
				<Card>
					<CardContent class="py-8 text-center">
						<BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p class="text-sm text-muted-foreground mb-2">No citations found</p>
						{#if searchQuery}
							<p class="text-xs text-muted-foreground">Try adjusting your search terms</p>
						{/if}
					</CardContent>
				</Card>
			{:else}
				{#each filteredCitations as citation}
					<Card class="hover:shadow-md transition-shadow">
						<CardContent class="py-4">
							<div class="flex justify-between items-start">
								<div class="flex-1 pr-4">
									<div class="flex items-center gap-2 mb-2">
										<h3 class="font-semibold text-lg">{citation.title}</h3>
										<Badge variant="outline" class="text-xs">
											{citation.category}
										</Badge>
										{#if citation.relevanceScore > 80}
											<Badge variant="default" class="text-xs">
												High Relevance
											</Badge>
										{/if}
									</div>
									
									<div class="text-sm text-muted-foreground mb-2">
										<div class="flex items-center gap-4 flex-wrap">
											<span class="flex items-center gap-1">
												<User class="w-3 h-3" />
												{citation.authors}
											</span>
											<span class="flex items-center gap-1">
												<Calendar class="w-3 h-3" />
												{citation.year}
											</span>
											<span class="flex items-center gap-1">
												<FileText class="w-3 h-3" />
												{citation.source}
											</span>
											{#if citation.pages}
												<span>pp. {citation.pages}</span>
											{/if}
										</div>
									</div>
									
									{#if citation.notes}
										<p class="text-sm mb-3">{citation.notes}</p>
									{/if}
									
									<div class="flex flex-wrap gap-1">
										{#each citation.tags as tag}
											<Badge variant="outline" class="text-xs">
												<Tags class="w-2 h-2 mr-1" />
												{tag}
											</Badge>
										{/each}
									</div>
								</div>
								
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => viewCitationDetails(citation)}
										class="h-8 w-8 p-0"
									>
										<Eye class="w-4 h-4" />
									</Button>
									{#if citation.url}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => window.open(citation.url, '_blank')}
											class="h-8 w-8 p-0"
										>
											<ExternalLink class="w-4 h-4" />
										</Button>
									{/if}
									{#if !readonly}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => deleteCitation(citation.id)}
											class="h-8 w-8 p-0 text-destructive hover:text-destructive"
										>
											<Trash2 class="w-4 h-4" />
										</Button>
									{/if}
								</div>
							</div>
						</CardContent>
					</Card>
				{/each}
			{/if}
		</div>
	</div>
</div>

<!-- Add Citation Modal -->
{#if showAddForm}
	<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onclick|self={hideAddCitationForm}>
		<Card class="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
			<CardHeader>
				<CardTitle>Add New Citation</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-1">Title *</label>
						<Input bind:value={newCitation.title} placeholder="Case name or article title" />
					</div>
					<div>
						<label class="block text-sm font-medium mb-1">Authors *</label>
						<Input bind:value={newCitation.authors} placeholder="Author names or court" />
					</div>
				</div>
				
				<div class="grid grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium mb-1">Year</label>
						<Input type="number" bind:value={newCitation.year} />
					</div>
					<div>
						<label class="block text-sm font-medium mb-1">Category</label>
						<select bind:value={newCitation.category} class="w-full p-2 border rounded">
							<option value="cases">Case Law</option>
							<option value="statutes">Statutes</option>
							<option value="regulations">Regulations</option>
							<option value="articles">Articles</option>
							<option value="evidence">Evidence</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium mb-1">Pages</label>
						<Input bind:value={newCitation.pages} placeholder="e.g., 123-145" />
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-1">Source</label>
					<Input bind:value={newCitation.source} placeholder="Journal, reporter, publisher" />
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-1">URL</label>
					<Input bind:value={newCitation.url} placeholder="https://..." />
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-1">Notes</label>
					<textarea 
						bind:value={newCitation.notes}
						placeholder="Brief description or notes about this citation"
						class="w-full p-2 border rounded min-h-[80px]"
					></textarea>
				</div>
				
				<div class="flex justify-end gap-2 pt-4">
					<Button variant="outline" onclick={hideAddCitationForm}>
						Cancel
					</Button>
					<Button onclick={saveCitation}>
						Save Citation
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>
{/if}

<!-- Citation Detail Modal -->
{#if showDetailModal && selectedCitation}
	<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onclick|self={hideDetailModal}>
		<Card class="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
			<CardHeader>
				<CardTitle>{selectedCitation.title}</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="bg-muted p-4 rounded font-mono text-sm">
					{formatCitation(selectedCitation)}
				</div>
				
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<strong>Authors:</strong> {selectedCitation.authors}
					</div>
					<div>
						<strong>Year:</strong> {selectedCitation.year}
					</div>
					<div>
						<strong>Source:</strong> {selectedCitation.source}
					</div>
					{#if selectedCitation.pages}
						<div>
							<strong>Pages:</strong> {selectedCitation.pages}
						</div>
					{/if}
				</div>
				
				{#if selectedCitation.notes}
					<div>
						<strong>Notes:</strong>
						<p class="mt-1">{selectedCitation.notes}</p>
					</div>
				{/if}
				
				{#if selectedCitation.tags.length > 0}
					<div>
						<strong>Tags:</strong>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each selectedCitation.tags as tag}
								<Badge variant="outline" class="text-xs">{tag}</Badge>
							{/each}
						</div>
					</div>
				{/if}
				
				<div class="flex justify-between items-center pt-4">
					<div>
						<Badge variant="outline">Relevance: {selectedCitation.relevanceScore}%</Badge>
					</div>
					<div class="flex gap-2">
						{#if selectedCitation.url}
							<Button variant="outline" onclick={() => window.open(selectedCitation.url, '_blank')}>
								<ExternalLink class="w-4 h-4 mr-1" />
								Open Link
							</Button>
						{/if}
						<Button onclick={hideDetailModal}>
							Close
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
{/if}

<style>
	/* Custom scrollbar for modal content */
	.overflow-y-auto {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--muted));
	}
	
	.overflow-y-auto::-webkit-scrollbar {
		width: 6px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-track {
		background: hsl(var(--muted));
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground));
		border-radius: 3px;
	}
</style>