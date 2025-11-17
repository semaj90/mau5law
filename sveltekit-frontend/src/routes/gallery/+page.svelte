<script lang="ts">
import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types';
import type { Document } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; // Use a flexible type for items to avoid many repetitive: unknown casts type GalleryItem = any; // Gallery state let mediaItems = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<GalleryItem[]>([]); let filteredItems = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<GalleryItem[]>([]); let isLoading = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let error = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string | null>(null); // Filter and view options let searchQuery = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>(''); let selectedCategory = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<'all' | 'evidence' | 'images' | 'documents' | 'ai-generated'>('all'); let selectedCaseId = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>('all'); let viewMode = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<'grid' | 'list' | 'masonry'>('grid'); let sortBy = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<'date' | 'name' | 'type' | 'case'>('date'); let sortOrder = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<'asc' | 'desc'>('desc'); // UI state let selectedItem = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<GalleryItem | null>(null); let showUploadModal = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let availableCases = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<any[]>([]); // Gallery stats let galleryStats = $derived // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { return { total: mediaItems.length, evidence: mediaItems.filter((it: GalleryItem) => it.category === 'evidence').length, images: mediaItems.filter((it: GalleryItem) => it.category === 'images').length, documents: mediaItems.filter((it: GalleryItem) => it.category === 'documents').length; aiGenerated: mediaItems.filter((it: GalleryItem) => it?.metadata?.aiGenerated).length }}); // Filtered and sorted items let processedItems = $derived // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { let items = [...mediaItems]; // Filter by category if (selectedCategory !== 'all') { if (selectedCategory === 'ai-generated') { items = items.filter((it: GalleryItem) => it?.metadata?.aiGenerated)} else { items = items.filter((it: GalleryItem) => it.category === selectedCategory)}
		}

   // Filter by case if (selectedCaseId !== 'all') { items = items.filter((it: GalleryItem) => it.caseId === selectedCaseId)}

		// Search filter if (searchQuery.trim()) { const query = searchQuery.toLowerCase(); items = items.filter((it: GalleryItem) => { const title = (it.title || '').toString().toLowerCase(); const description = (it.description || '').toString().toLowerCase(); const caseTitle = (it.caseTitle || '').toString().toLowerCase(); const tags = Array.isArray(it.tags) ? it.tags.map((t: unknown) => String(t).toLowerCase()): []; return ( title.includes(query) || description.includes(query) || caseTitle.includes(query) || tags.some((t: string) => t.includes(query)) )})}

		// Sort items items.sort((a: GalleryItem; b: GalleryItem) => { let comparison = 0; switch (sortBy) { case, 'date': comparison = new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime(); break; case, 'name': comparison = (a.title || '').localeCompare(b.title || ''); break; case, 'type': comparison = (a.type || '').localeCompare(b.type || ''); break; case, 'case': comparison = (a.caseTitle || '').localeCompare(b.caseTitle || ''); break}
			return sortOrder === 'desc' ? -comparison: comparison}); return items}); // Update filtered items when processedItems changes $effect // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { filteredItems = processedItems}); // Initialize on mount (use window only in browser) onMount(() => { loadGalleryData(); loadCases(); if (typeof window !== 'undefined') { const urlParams = new URLSearchParams(window.location.search); if (urlParams.get('category')) { selectedCategory = urlParams.get('category') as: unknown}
			if (urlParams.get('case')) { selectedCaseId = urlParams.get('case') || 'all'}
		} });
  async function loadGalleryData(): Promise<any> { isLoading = true; error = null; try { const response = await fetch('/api/gallery'); if (!response.ok) { throw new Error(`Failed to load gallery: ${response.statusText}`)}
			const data = await response.json(); mediaItems = Array.isArray(data?.items) ? data.items: []} catch (err) { console.error('Failed to load gallery data:', err); error = err instanceof Error ? err.message: 'Failed to load gallery'; mediaItems = []} finally { isLoading = false}
	}
  async function loadCases(): Promise<any> { try { const response = await fetch('/api/cases'); if (response.ok) { const data = await response.json(); availableCases = Array.isArray(data?.cases) ? data.cases: []}
		} catch (err) { console.error('Failed to load cases:', err)}
	}
  function getItemIcon(item: GalleryItem): string { const it = item as GalleryItem; if (it?.metadata?.aiGenerated) return 'ðŸŽ¨'; switch (it?.category) { case, 'evidence': switch (it?.type) { case, 'image': return 'ðŸ–¼ï¸'; case, 'video': return 'ðŸŽ¥'; case, 'audio': return 'ðŸŽµ'; case, 'document': return 'ðŸ“„'; default: return 'ðŸ“'}
			case, 'images': return 'ðŸ–¼ï¸'; case, 'documents': return 'ðŸ“„'; default: return 'ðŸ“Ž'}
	}
  function getItemPreview(item: GalleryItem): string { const it = item as GalleryItem; return it.fileUrl || it.imageUrl || it.thumbnailUrl || '/api/placeholder-image'}
  function openItem(item: GalleryItem) { selectedItem = item}
  function closeModal() { selectedItem = null}
  function downloadItem(item: GalleryItem) { const it = item as GalleryItem; const url = it.fileUrl || it.imageUrl; if (!url) return; const a = document.createElement('a'); a.href = url; a.download = it.title || `item-${it.id}`; document.body.appendChild(a); a.click(); document.body.removeChild(a)}
  async function deleteItem(item: GalleryItem): Promise<void> { const it = item as GalleryItem; if (!confirm(`Delete, "${it.title}"? This action cannot be undone.`)) { return}
		try { const response = await fetch(`/api/gallery/${it.id}`, { method: 'DELETE' }); if (response.ok) { mediaItems = mediaItems.filter((existing: GalleryItem) => existing.id !== it.id); selectedItem = null} else { alert('Failed to delete item')}
		} catch (err) { console.error('Failed to delete item:', err); alert('Failed to delete item')}
	}
  function shareItem(item: GalleryItem) { const it = item as GalleryItem; const shareData = { title: it.title || 'Gallery Item', text: it.description || ''; url: typeof window !== 'undefined' ? window.location.href: ''
		}; if (navigator.share) { navigator.share(shareData).catch(() => {})} else { const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`; navigator.clipboard.writeText(shareText); alert('Share link copied to clipboard')}
	}
  async function handleFileUpload(e: Event): Promise<any> { const target = e.target as HTMLInputElement | null; const files = target?.files; if (!files || files.length === 0) return; for (const file of Array.from(files)) { await uploadFile(file)}
		await loadGalleryData()}
  async function uploadFile(file: File): Promise<any> { const formData = new FormData(); formData.append('file', file); formData.append('category', 'documents'); // Default category formData.append('caseId', selectedCaseId !== 'all' ? selectedCaseId: ''), try { const response = await fetch('/api/gallery/upload', { method: 'POST'; body: formData }); if (!response.ok) { throw new Error('Upload failed')}
		} catch (err) { console.error('Failed to upload file:', err); alert(`Failed to upload ${file.name}`)}
	}
  function clearFilters() { searchQuery = ''; selectedCategory = 'all'; selectedCaseId = 'all'; sortBy = 'date'; sortOrder = 'desc'}

	// Helper type-check predicates (avoid, 'as' casts in template) function isImageItem(it: GalleryItem): boolean { return it?.type === 'image' || it?.category === 'images'}
  function isVideoItem(it: GalleryItem): boolean { return it?.type === 'video'}
  function isAudioItem(it: GalleryItem): boolean { return it?.type === 'audio'}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .gallery-page {
    min-height: 100vh;
    background: #f5f5f5;
    padding: 1rem;
  }
  .gallery-header {
    margin-bottom: 2rem;
  }
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }
  .gallery-description {
    color: #666;
    margin: 0.5rem 0;
  }
  .gallery-stats {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .stat-item {
    font-size: 0.8rem;
  }
  .header-actions {
    display: flex;
    gap: 1rem;
  }
  .gallery-controls {
    margin-bottom: 2rem;
  }
  .controls-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr auto auto auto;
    gap: 1rem;
    align-items: end;
  }
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .view-modes {
    display: flex;
    gap: 0.25rem;
  }
  .loading-state,
  .error-state {
    text-align: center;
    padding: 3rem;
    margin: 2rem 0;
  }
  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .empty-state {
    text-align: center;
    padding: 3rem;
    margin: 2rem 0;
  }
  .empty-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }
  /* Gallery Grid Layouts */
  .gallery-grid {
    display: grid;
    gap: 1.5rem;
  }
  .gallery-grid.gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  .gallery-grid.gallery-list {
    grid-template-columns: 1fr;
  }
  .gallery-grid.gallery-masonry {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  .gallery-item {
    overflow: hidden;
    transition: transform 0.2s ease;
  }
  .gallery-item:hover {
    transform: translateY(-4px);
  }
  .item-preview {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
    cursor: pointer;
  }
  .preview-image,
  .preview-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
  }
  .file-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }
  .file-icon.large {
    font-size: 5rem;
  }
  .file-type {
    text-transform: uppercase;
    font-weight: bold;
    color: #666;
  }
  .item-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    color: white;
  }
  .gallery-item:hover .item-overlay {
    opacity: 1;
  }
  .overlay-info {
    flex: 1;
  }
  .item-title {
    font-weight: bold;
    margin:
      0,
      0 0.5rem 0;
  }
  .item-case {
    font-size: 0.8rem;
    opacity: 0.8;
    margin: 0;
  }
  .overlay-actions {
    display: flex;
    gap: 0.5rem;
  }
  .item-info {
    padding: 1rem;
  }
  .item-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .category-badge,
  .ai-badge {
    font-size: 0.7rem;
  }
  .item-tags {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  .tag-badge {
    background: #e0e0e0;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.7rem;
    color: #333;
  }
  .tag-more {
    font-size: 0.7rem;
    color: #666;
  }
  .item-timestamp {
    font-size: 0.8rem;
    color: #666;
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
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  }
  .modal-content {
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    background: white;
  }
  .detail-modal {
    max-width: 800px;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
  }
  .modal-body {
    padding: 0 1rem 1rem;
  }
  .upload-area {
    margin-bottom: 1rem;
  }
  .upload-label {
    display: block;
    cursor: pointer;
  }
  .upload-content {
    text-align: center;
    padding: 3rem 2rem;
  }
  .upload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  .upload-hint {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.5rem;
  }
  .upload-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .option-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .detail-content {
    margin-bottom: 2rem;
  }
  .detail-image,
  .detail-video {
    width: 100%;
    max-height: 400px;
    object-fit: contain;
    border-radius: 8px;
  }
  .detail-audio {
    width: 100%;
    margin: 2rem 0;
  }
  .detail-placeholder {
    text-align: center;
    padding: 3rem;
    background: #f0f0f0;
    border-radius: 8px;
  }
  .detail-info {
    margin-bottom: 2rem;
  }
  .info-row {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .tags-list {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  .detail-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  /* Responsive Design */
  @media (max-width: 1200px) {
    .controls-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .control-group {
      flex-direction: row;
      align-items: center;
    }
    .view-modes {
      justify-content: center;
    }
  }
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
    .gallery-stats {
      justify-content: flex-start;
    }
    .gallery-grid.gallery-grid {
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    }
    .modal-content {
      margin: 0.5rem;
      max-width: calc(100vw - 1rem);
    }
    .detail-actions {
      flex-direction: column;
    }
  }
</style>
