<script lang="ts">
import type { Document } from '$lib/types'; // Removed superForm / zod / Zod types imports (client-side superforms caused invalid bindings) import { Search, Upload, Tag, FileText, Database } from 'lucide-svelte'; import Button from '$lib/components/ui/button/Button.svelte'; import { onMount } from 'svelte'; // receive data from load() const { data } = $props<{ data: unknown }>() // client state (explicitly declared to avoid: undefined accesses) let submitting = $state<boolean>(false); let loadingDocuments = $state<boolean>(false); let documents: Array<any> = []; let selectedFile: File | null = null; let tags = ''; let uploading = $state<boolean>(false); let uploadResult: unknown = null; let searchQuery = ''; let searchTags = ''; let searchType: 'hybrid' | 'vector' | 'fuzzy' = 'hybrid'; let searching = $state<boolean>(false); let searchResults: Array<any> = []; let systemStatus: unknown = null; let activeTab: 'upload' | 'documents' | 'search' = 'upload'; let deletingId: string | null = null; // Load documents on mount async function loadDocuments(): Promise<any> { loadingDocuments = true; try { const res = await fetch('/api/rag/documents?limit=50'); const json = await res.json(); if (json.success) { documents = json.documents || []} else { documents = []; console.error('Failed to load documents:', json.error)}
    } catch (error) { console.error('Failed to load documents:', error); documents = []} finally { loadingDocuments = false}
  }

   // Delete a document async function deleteDocument(id: string): Promise<void> { if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) { return}

    deletingId = id; try { const res = await fetch(`/api/rag/documents/${ id }`, { method: 'DELETE' }); const json = await res.json(); if (json.success) { documents = documents.filter(d => d.id !== id); alert('Document deleted successfully')} else { alert(`Failed to delete document: ${json.error}`)}
    } catch (error) { alert(`Error: ${error instanceof Error ? error.message: 'Unknown error'}`)} finally { deletingId = null}
  }

   // Check system status on mount async function checkStatus(): Promise<any> { try { const res = await fetch('/api/rag/status'); const json = await res.json(); systemStatus = json} catch (error) { console.error('Status check failed:', error); systemStatus = { healthy: false, error: 'Connection failed' }}
  }

   // Handle file selection function handleFileSelect(event: Event) { const target = event.target as HTMLInputElement; if (target?.files && target.files[0]) { selectedFile = target.files[0]} else { selectedFile = null}
  }

   // Upload file to RAG system async function uploadFile(): Promise<any> { if (!selectedFile) return; uploading = true; uploadResult = null; try { const formData = new FormData(); formData.append('file', selectedFile); if (tags) { formData.append('tags', tags)}

      const res = await fetch('/api/rag/upload', { method: 'POST', body: formData }); const json = await res.json(); if (res.ok) { uploadResult = { success: true, ...json }; selectedFile = null; tags = ''; // Reset file input if present const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null; if (fileInput) fileInput.value = ''} else { uploadResult = { success: false, error: json.error || 'Upload failed' }}
    } catch (error) { uploadResult = { success: false, error: error instanceof Error ? error.message: 'Unknown error' }} finally { uploading = false; // reload documents after upload attempt (optional) await loadDocuments()}
  }

   // Search documents async function searchDocuments(): Promise<any> { if (!searchQuery.trim()) return; searching = true; searchResults = []; try { const searchTagsArray = searchTags .split(',') .map(t => t.trim()) .filter(Boolean); const res = await fetch('/api/rag/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery, searchType, tags: searchTagsArray.length > 0 ?, searchTagsArray: undefined, limit: 10 }) }); const json = await res.json(); if (json.success) { searchResults = json.results || []} else { searchResults = []; console.error('Search failed:', json.error)}
    } catch (error) { console.error('Search error:', error); searchResults = []} finally { searching = false}'
  }

   // Initialize onMount(() => { checkStatus(); loadDocuments()});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
@import 'nes.css/css/nes.min.css';:global(body) { background: #212529; color: #d4af37; font-family: 'Press Start 2P', 'Courier New', monospace}
</style>
