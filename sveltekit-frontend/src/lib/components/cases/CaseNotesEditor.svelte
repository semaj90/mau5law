<script lang="ts">
  import NierRichTextEditor from '$lib/components/editors/NierRichTextEditor.svelte';
  import { onMount } from 'svelte';

  interface CaseNote {
    id: string;
    caseId: string;
    title: string | null;
    content: string;
    isAI: boolean;
    isPinned: boolean;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
  }

  interface Props {
    caseId: string;
    onClose?: () => void;
  }

  let { caseId, onClose }: Props = $props();

  let notes = $state<CaseNote[]>([]);
  let selectedNote = $state<CaseNote | null>(null);
  let isLoading = $state(true);
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  // Editor state
  let noteTitle = $state('');
  let noteContent = $state('');
  let isNewNote = $state(false);

  // Autosave debounce
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Autosave baselines to prevent loops
  let lastSavedTitle = $state('');
  let lastSavedContent = $state('');

  // Helper for stable sorting: pinned first, then by most recent update
  function sortNotes(list: CaseNote[]) {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  // Autosave effect - reacts to content changes
  $effect(() => {
    // Only autosave if we're editing something
    if (!selectedNote && !isNewNote) return;

    // Avoid autosave loops on initial load/select
    if (noteTitle === lastSavedTitle && noteContent === lastSavedContent) return;

    // Debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      // Don't spam POST for new notes – require manual save once, then autosave updates
      if (isNewNote) return;

      if (noteContent.trim()) saveNote();
    }, 800);
  });

  onMount(() => {
    loadNotes();
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  });

  async function loadNotes() {
    isLoading = true;
    error = null;
    try {
      const response = await fetch(`/api/cases/${caseId}/notes`);
      if (!response.ok) throw new Error('Failed to load notes');
      const data = await response.json();
      notes = sortNotes(data.notes || []);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load notes';
    } finally {
      isLoading = false;
    }
  }

  function selectNote(note: CaseNote) {
    selectedNote = note;
    noteTitle = note.title || '';
    noteContent = note.content;
    isNewNote = false;

    // Set baselines to prevent autosave on select
    lastSavedTitle = note.title || '';
    lastSavedContent = note.content;
  }

  function startNewNote() {
    selectedNote = null;
    noteTitle = '';
    noteContent = '';
    isNewNote = true;
  }

  async function saveNote() {
    if (!noteContent.trim()) {
      error = 'Note content cannot be empty';
      return;
    }

    isSaving = true;
    error = null;

    try {
      if (isNewNote) {
        // Create new note
        const response = await fetch(`/api/cases/${caseId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle.trim() || null,
            content: noteContent.trim(),
          }),
        });

        if (!response.ok) throw new Error('Failed to create note');
        const data = await response.json();
        notes = sortNotes([data.note, ...notes]);
        selectedNote = data.note;
        isNewNote = false;

        // Update baselines after successful save
        lastSavedTitle = data.note.title || '';
        lastSavedContent = data.note.content;
      } else if (selectedNote) {
        // Update existing note
        const response = await fetch(`/api/cases/${caseId}/notes/${selectedNote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle.trim() || null,
            content: noteContent.trim(),
          }),
        });

        if (!response.ok) throw new Error('Failed to update note');
        const data = await response.json();
        notes = sortNotes(notes.map(n => n.id === data.note.id ? data.note : n));
        selectedNote = data.note;

        // Update baselines after successful save
        lastSavedTitle = data.note.title || '';
        lastSavedContent = data.note.content;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save note';
    } finally {
      isSaving = false;
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete note');
      notes = notes.filter(n => n.id !== noteId);
      if (selectedNote?.id === noteId) {
        selectedNote = null;
        noteTitle = '';
        noteContent = '';
        isNewNote = false;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete note';
    }
  }

  async function togglePin(note: CaseNote) {
    try {
      const response = await fetch(`/api/cases/${caseId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });

      if (!response.ok) throw new Error('Failed to update note');
      const data = await response.json();
      notes = sortNotes(notes.map(n => n.id === data.note.id ? data.note : n));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to pin note';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Export functions
  let isExporting = $state(false);
  let exportStatus = $state<string | null>(null);

  async function exportMemo() {
    isExporting = true;
    exportStatus = 'Generating AI memo...';
    error = null;

    try {
      const response = await fetch(`/api/cases/${caseId}/export/memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveAsNote: true })
      });

      if (!response.ok) throw new Error('Failed to generate memo');

      const data = await response.json();
      exportStatus = 'Memo generated and saved!';

      // Reload notes to show the new AI memo
      await loadNotes();

      // Select the new AI note if it was saved
      if (data.savedNote) {
        selectNote(data.savedNote);
      }

      setTimeout(() => { exportStatus = null; }, 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate memo';
      exportStatus = null;
    } finally {
      isExporting = false;
    }
  }

  async function exportPdf() {
    isExporting = true;
    exportStatus = 'Generating PDF...';
    error = null;

    try {
      const response = await fetch(`/api/cases/${caseId}/export/pdf`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Open in new tab or download
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${caseId}_export.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportStatus = 'Export downloaded!';
      setTimeout(() => { exportStatus = null; }, 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate PDF';
      exportStatus = null;
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="case-notes-editor">
  <!-- Header -->
  <div class="notes-header">
    <h2>📝 Case Notes</h2>
    <div class="header-actions">
      <button class="btn-export" onclick={exportMemo} disabled={isExporting || notes.length === 0} title="Generate AI memo from notes">
        🧠 AI Memo
      </button>
      <button class="btn-export" onclick={exportPdf} disabled={isExporting} title="Export case to file">
        📄 Export
      </button>
      <button class="btn-new" onclick={startNewNote}>+ New Note</button>
      {#if onClose}
        <button class="btn-close" onclick={onClose}>✕</button>
      {/if}
    </div>
  </div>

  {#if exportStatus}
    <div class="status-banner">{exportStatus}</div>
  {/if}

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="notes-content">
    <!-- Notes List -->
    <div class="notes-list">
      {#if isLoading}
        <div class="loading">Loading notes...</div>
      {:else if notes.length === 0 && !isNewNote}
        <div class="empty-state">
          <p>No notes yet</p>
          <button onclick={startNewNote}>Create your first note</button>
        </div>
      {:else}
        {#each notes as note (note.id)}
          <div
            class="note-item"
            class:selected={selectedNote?.id === note.id}
            class:pinned={note.isPinned}
            role="button"
            tabindex="0"
            onclick={() => selectNote(note)}
            onkeydown={(e) => e.key === 'Enter' && selectNote(note)}
          >
            <div class="note-item-header">
              <span class="note-title">{note.title || 'Untitled Note'}</span>
              <button
                class="pin-btn"
                class:active={note.isPinned}
                aria-pressed={note.isPinned}
                onclick={(e) => { e.stopPropagation(); togglePin(note); }}
                title={note.isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
            </div>
            <p class="note-preview">{note.content.slice(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
            <span class="note-date">{formatDate(note.updatedAt)}</span>
            {#if note.isAI}
              <span class="ai-badge">AI</span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Editor Panel -->
    <div class="editor-panel">
      {#if selectedNote || isNewNote}
        <div class="editor-header">
          <input
            type="text"
            class="title-input"
            placeholder="Note title (optional)"
            bind:value={noteTitle}
          />
          <div class="editor-actions">
            <button
              class="btn-save"
              onclick={saveNote}
              disabled={isSaving || !noteContent.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {#if selectedNote}
              <button
                class="btn-delete"
                onclick={() => selectedNote && deleteNote(selectedNote.id)}
              >
                🗑️
              </button>
            {/if}
          </div>
        </div>
        <div class="editor-body">
          <NierRichTextEditor
            bind:value={noteContent}
            placeholder="Write your case notes here..."
            {caseId}
            autosave={true}
          />
        </div>
        {#if selectedNote}
          <div class="editor-footer">
            <span>Last updated: {formatDate(selectedNote.updatedAt)}</span>
          </div>
        {/if}
      {:else}
        <div class="no-selection">
          <p>Select a note or create a new one</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .case-notes-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--yorha-bg-primary, #0a0a0a);
    color: var(--yorha-text-primary, #e0e0e0);
    border: 1px solid var(--yorha-border, #606060);
    border-radius: 8px;
    overflow: hidden;
  }

  .notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--yorha-bg-secondary, #1a1a1a);
    border-bottom: 1px solid var(--yorha-border, #606060);
  }

  .notes-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-new {
    padding: 0.5rem 1rem;
    background: var(--yorha-accent, #3cbcfc);
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-new:hover {
    background: var(--yorha-accent-hover, #5cd0ff);
  }

  .btn-export {
    padding: 0.5rem 0.75rem;
    background: var(--yorha-bg-tertiary, #2a2a2a);
    color: var(--yorha-text-primary, #e0e0e0);
    border: 1px solid var(--yorha-border, #606060);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .btn-export:hover:not(:disabled) {
    background: var(--yorha-bg-secondary, #1a1a1a);
    border-color: var(--yorha-accent, #3cbcfc);
  }

  .btn-export:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-banner {
    padding: 0.5rem 1rem;
    background: rgba(60, 188, 252, 0.2);
    color: var(--yorha-accent, #3cbcfc);
    border-bottom: 1px solid var(--yorha-accent, #3cbcfc);
    font-size: 0.85rem;
    text-align: center;
  }

  .btn-close {
    padding: 0.5rem;
    background: transparent;
    color: var(--yorha-text-secondary, #a0a0a0);
    border: 1px solid var(--yorha-border, #606060);
    border-radius: 4px;
    cursor: pointer;
  }

  .error-banner {
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border-bottom: 1px solid #ef4444;
  }

  .notes-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .notes-list {
    width: 280px;
    border-right: 1px solid var(--yorha-border, #606060);
    overflow-y: auto;
    background: var(--yorha-bg-secondary, #1a1a1a);
  }

  .loading, .empty-state, .no-selection {
    padding: 2rem;
    text-align: center;
    color: var(--yorha-text-secondary, #a0a0a0);
  }

  .empty-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--yorha-accent, #3cbcfc);
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .note-item {
    display: block;
    width: 100%;
    padding: 1rem;
    text-align: left;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--yorha-border, #606060);
    cursor: pointer;
    color: inherit;
    transition: background 0.2s;
  }

  .note-item:hover {
    background: rgba(60, 188, 252, 0.1);
  }

  .note-item.selected {
    background: rgba(60, 188, 252, 0.2);
    border-left: 3px solid var(--yorha-accent, #3cbcfc);
  }

  .note-item.pinned {
    background: rgba(245, 158, 11, 0.1);
  }

  .note-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .note-title {
    font-weight: 600;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pin-btn {
    padding: 0.25rem;
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .pin-btn:hover, .pin-btn.active {
    opacity: 1;
  }

  .note-preview {
    margin: 0;
    font-size: 0.8rem;
    color: var(--yorha-text-secondary, #a0a0a0);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .note-date {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: var(--yorha-text-tertiary, #707070);
  }

  .ai-badge {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.125rem 0.375rem;
    background: var(--yorha-accent, #3cbcfc);
    color: #000;
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 2px;
  }

  .editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--yorha-border, #606060);
    gap: 1rem;
  }

  .title-input {
    flex: 1;
    padding: 0.5rem;
    background: var(--yorha-bg-secondary, #1a1a1a);
    border: 1px solid var(--yorha-border, #606060);
    border-radius: 4px;
    color: inherit;
    font-size: 1rem;
  }

  .title-input:focus {
    outline: none;
    border-color: var(--yorha-accent, #3cbcfc);
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-save {
    padding: 0.5rem 1rem;
    background: var(--yorha-accent, #3cbcfc);
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-delete {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid #ef4444;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .editor-body {
    flex: 1;
    padding: 1rem;
    overflow: auto;
  }

  .editor-footer {
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--yorha-border, #606060);
    font-size: 0.75rem;
    color: var(--yorha-text-tertiary, #707070);
  }
</style>
