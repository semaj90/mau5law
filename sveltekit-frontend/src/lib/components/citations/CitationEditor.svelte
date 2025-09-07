<!--
  Citation Rich Text Editor with Legal Citation Formatter
  
  Features:
  - Rich text editing with Quill.js
  - Legal citation format validation
  - Auto-detection of citation types
  - Integration with case management system
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import type { Citation } from '$lib/server/db/schemas/cases-schema.js';

  // Props
  export let caseId: string;
  export let citation: Partial<Citation> | null = null;
  export let mode: 'create' | 'edit' = 'create';
  export let disabled = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    save: Citation;
    cancel: void;
    delete: string;
  }>();

  // Form state
  let formData = $state({
    title: citation?.title || '',
    citationType: citation?.citationType || 'case_law',
    author: citation?.author || '',
    source: citation?.source || '',
    citation: citation?.citation || '',
    url: citation?.url || '',
    doi: citation?.doi || '',
    abstract: citation?.abstract || '',
    relevantQuote: citation?.relevantQuote || '',
    contextNotes: citation?.contextNotes || '',
    relevanceScore: citation?.relevanceScore || 5,
    citationPurpose: citation?.citationPurpose || 'support',
    publicationDate: citation?.publicationDate ? 
      new Date(citation.publicationDate).toISOString().split('T')[0] : '',
    jurisdiction: citation?.jurisdiction || '',
    court: citation?.court || '',
    verified: citation?.verified || false,
    tags: citation?.tags || []
  });

  // Quill editor instance
  let quillEditor: any = null;
  let editorContainer: HTMLElement;
  let isLoading = $state(false);
  let errors = writable<Record<string, string>>({});

  // Citation types
  const citationTypes = [
    { value: 'case_law', label: 'Case Law' },
    { value: 'statute', label: 'Statute' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'secondary_authority', label: 'Secondary Authority' },
    { value: 'legal_brief', label: 'Legal Brief' },
    { value: 'court_document', label: 'Court Document' },
    { value: 'expert_report', label: 'Expert Report' },
    { value: 'news_article', label: 'News Article' },
    { value: 'academic_paper', label: 'Academic Paper' },
    { value: 'other', label: 'Other' }
  ];

  const citationPurposes = [
    { value: 'support', label: 'Support' },
    { value: 'distinguish', label: 'Distinguish' },
    { value: 'authority', label: 'Authority' },
    { value: 'background', label: 'Background' },
    { value: 'counter_argument', label: 'Counter Argument' }
  ];

  // Initialize Quill editor
  onMount(async () => {
    try {
      // Dynamic import of Quill
      const { default: Quill } = await import('quill');
      
      // Custom toolbar configuration for legal citations
      const toolbarOptions = [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['blockquote', 'link'],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ];

      quillEditor = new Quill(editorContainer, {
        modules: {
          toolbar: toolbarOptions
        },
        theme: 'snow',
        placeholder: 'Enter citation details, relevant quotes, and context notes...',
      });

      // Set initial content
      if (formData.contextNotes) {
        quillEditor.root.innerHTML = formData.contextNotes;
      }

      // Listen for content changes
      quillEditor.on('text-change', () => {
        formData.contextNotes = quillEditor.root.innerHTML;
      });

    } catch (error) {
      console.error('Failed to load Quill editor:', error);
    }
  });

  // Auto-format citation based on type
  function formatCitation() {
    if (!formData.title || !formData.author) return;

    let formatted = '';
    switch (formData.citationType) {
      case 'case_law':
        formatted = `${formData.title}, ${formData.source}${formData.court ? ` (${formData.court}` : ''}${formData.publicationDate ? ` ${new Date(formData.publicationDate).getFullYear()}` : ''}${formData.court ? ')' : ''}`;
        break;
      case 'statute':
        formatted = `${formData.title}, ${formData.source}${formData.publicationDate ? ` (${new Date(formData.publicationDate).getFullYear()})` : ''}`;
        break;
      case 'academic_paper':
        formatted = `${formData.author}, "${formData.title}"${formData.source ? `, ${formData.source}` : ''}${formData.publicationDate ? ` (${new Date(formData.publicationDate).getFullYear()})` : ''}`;
        break;
      default:
        formatted = `${formData.author}, "${formData.title}"${formData.source ? `, ${formData.source}` : ''}${formData.publicationDate ? ` (${new Date(formData.publicationDate).getFullYear()})` : ''}`;
    }
    
    formData.citation = formatted;
  }

  // Validate form data
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.citationType) {
      newErrors.citationType = 'Citation type is required';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      newErrors.url = 'Please enter a valid URL';
    }

    errors.set(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Save citation
  async function handleSave() {
    if (!validateForm()) return;

    isLoading = true;
    try {
      const endpoint = '/api/citations';
      const method = mode === 'create' ? 'POST' : 'PUT';
      
      const payload = {
        ...formData,
        caseId,
        publicationDate: formData.publicationDate ? new Date(formData.publicationDate) : null,
        ...(mode === 'edit' && { id: citation?.id })
      };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        dispatch('save', result.citation);
      } else {
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      isLoading = false;
    }
  }

  // Delete citation
  async function handleDelete() {
    if (!citation?.id || mode === 'create') return;

    if (!confirm('Are you sure you want to delete this citation?')) return;

    isLoading = true;
    try {
      const response = await fetch('/api/citations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: citation.id })
      });

      const result = await response.json();

      if (result.success) {
        dispatch('delete', citation.id);
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      isLoading = false;
    }
  }

  // Add tag
  function addTag(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.target) {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const tag = input.value.trim().toLowerCase();
      
      if (tag && !formData.tags.includes(tag)) {
        formData.tags = [...formData.tags, tag];
        input.value = '';
      }
    }
  }

  // Remove tag
  function removeTag(tagToRemove: string) {
    formData.tags = formData.tags.filter(tag => tag !== tagToRemove);
  }

  // Auto-format on field changes
  $effect(() => {
    if (formData.title || formData.author || formData.source) {
      formatCitation();
    }
  });
</script>

<!-- Citation Editor Form -->
<div class="citation-editor space-y-6 p-6 bg-white rounded-lg shadow-sm border">
  <div class="flex justify-between items-center">
    <h3 class="text-lg font-semibold text-gray-900">
      {mode === 'create' ? 'Add New Citation' : 'Edit Citation'}
    </h3>
    {#if mode === 'edit'}
      <button 
        onclick={handleDelete}
        disabled={isLoading}
        class="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
      >
        Delete
      </button>
    {/if}
  </div>

  <form onsubmit|preventDefault={handleSave} class="space-y-4">
    <!-- Basic Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          bind:value={formData.title}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Citation title"
          required
        />
        {#if $errors.title}
          <p class="text-red-600 text-sm mt-1">{$errors.title}</p>
        {/if}
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Citation Type *
        </label>
        <select
          bind:value={formData.citationType}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          required
        >
          {#each citationTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Author
        </label>
        <input
          type="text"
          bind:value={formData.author}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Author name"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Source
        </label>
        <input
          type="text"
          bind:value={formData.source}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Publication or source"
        />
      </div>
    </div>

    <!-- Auto-formatted Citation -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Formatted Citation
      </label>
      <input
        type="text"
        bind:value={formData.citation}
        disabled={disabled || isLoading}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 bg-gray-50"
        placeholder="Auto-generated citation format"
      />
    </div>

    <!-- URLs and Identifiers -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <input
          type="url"
          bind:value={formData.url}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="https://example.com"
        />
        {#if $errors.url}
          <p class="text-red-600 text-sm mt-1">{$errors.url}</p>
        {/if}
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          DOI
        </label>
        <input
          type="text"
          bind:value={formData.doi}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="10.1000/example"
        />
      </div>
    </div>

    <!-- Legal Details -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Jurisdiction
        </label>
        <input
          type="text"
          bind:value={formData.jurisdiction}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Federal, State, etc."
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Court
        </label>
        <input
          type="text"
          bind:value={formData.court}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Supreme Court, etc."
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Publication Date
        </label>
        <input
          type="date"
          bind:value={formData.publicationDate}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
    </div>

    <!-- Abstract and Quotes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Abstract
      </label>
      <textarea
        bind:value={formData.abstract}
        disabled={disabled || isLoading}
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        placeholder="Brief summary of the citation..."
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Relevant Quote
      </label>
      <textarea
        bind:value={formData.relevantQuote}
        disabled={disabled || isLoading}
        rows="2"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        placeholder="Key quote from the citation..."
      />
    </div>

    <!-- Rich Text Editor for Context Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Context Notes
      </label>
      <div class="border border-gray-300 rounded-md overflow-hidden">
        <div bind:this={editorContainer} class="min-h-[200px]"></div>
      </div>
    </div>

    <!-- Citation Purpose and Relevance -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Citation Purpose
        </label>
        <select
          bind:value={formData.citationPurpose}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          {#each citationPurposes as purpose}
            <option value={purpose.value}>{purpose.label}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Relevance Score (1-10)
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          bind:value={formData.relevanceScore}
          disabled={disabled || isLoading}
          class="w-full"
        />
        <div class="text-center text-sm text-gray-600 mt-1">
          {formData.relevanceScore}/10
        </div>
      </div>
    </div>

    <!-- Tags -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Tags
      </label>
      <input
        type="text"
        onkeydown={addTag}
        disabled={disabled || isLoading}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        placeholder="Type tag and press Enter..."
      />
      {#if formData.tags.length > 0}
        <div class="flex flex-wrap gap-2 mt-2">
          {#each formData.tags as tag}
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {tag}
              <button
                type="button"
                onclick={() => removeTag(tag)}
                class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
              >
                <svg class="w-2 h-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path stroke-linecap="round" stroke-width="1.5" d="m1 1 6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Verification -->
    <div class="flex items-center space-x-2">
      <input
        type="checkbox"
        id="verified"
        bind:checked={formData.verified}
        disabled={disabled || isLoading}
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label for="verified" class="text-sm font-medium text-gray-700">
        Mark as verified
      </label>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end space-x-3 pt-4 border-t">
      <button
        type="button"
        onclick={() => dispatch('cancel')}
        disabled={isLoading}
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled || isLoading}
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : (mode === 'create' ? 'Add Citation' : 'Save Changes')}
      </button>
    </div>
  </form>
</div>

<style>
  :global(.ql-editor) {
    min-height: 150px;
    font-family: inherit;
  }
  
  :global(.ql-toolbar) {
    border-top: 1px solid #ccc;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
  }
  
  :global(.ql-container) {
    border-bottom: 1px solid #ccc;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
  }
</style>