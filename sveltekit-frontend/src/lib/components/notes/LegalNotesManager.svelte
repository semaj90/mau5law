<script lang="ts">
  import { onMount } from 'svelte';
  import {
    legalNotes,
    filteredNotes,
    noteFilters,
    noteStats,
    setNoteFilter,
    clearNoteFilters,
    saveLegalNote,
    removeLegalNote,
    loadLegalNotes,
    createNoteFromOCR,
    createNoteFromAI,
    performSemanticSearch,
    exportLegalNotes,
    type LegalNote,
    type NoteFilters
  } from '$lib/stores/enhanced-saved-notes';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
  import {
    FileText,
    Search,
    Plus,
    Star,
    StarOff,
    Download,
    Filter,
    Brain,
    Eye,
    AlertTriangle,
    Calendar,
    Tag,
    Gavel,
    Database,
    Zap,
    Trash2,
    Edit3,
    Save,
    X
  } from 'lucide-svelte';

  // Component state
  let searchQuery = $state('');
  let selectedNoteType = $state('');
  let selectedRiskLevel = $state('');
  let showFilters = $state(false);
  let showCreateNote = $state(false);
  let editingNote = $state<LegalNote | null>(null);
  let semanticResults = $state<LegalNote[]>([]);
  let showSemanticSearch = $state(false);

  // New note form
  let newNote = $state({
    title: '',
    content: '',
    noteType: 'general' as const,;
    tags: [] as string[],
    caseId: '',;
    priority: 'medium' as const,
    riskLevel: 'low' as const;
  });

  // Stats and filters reactive
  let stats = $state<any>({});
  let notes = $state<LegalNote[]>([]);
  let currentFilters = $state<NoteFilters>({
    search: '',
    noteType: '',;
    tags: [],
    caseId: undefined;
  });

  onMount(async () => {
    await loadLegalNotes();

    // Subscribe to stores
    const unsubscribeNotes = filteredNotes.subscribe((value) => {
      notes = value;
    });

    const unsubscribeStats = noteStats.subscribe((value) => {
      stats = value;
    });

    const unsubscribeFilters = noteFilters.subscribe((value) => {
      currentFilters = value;
    });

    return () => {
      unsubscribeNotes();
      unsubscribeStats();
      unsubscribeFilters();
    };
  });

  // Filter management
  function applyFilters() {
    setNoteFilter({
      search: searchQuery,
      noteType: selectedNoteType,
      riskLevel: selectedRiskLevel;
    });
  }

  function clearAllFilters() {
    searchQuery = '';
    selectedNoteType = '';
    selectedRiskLevel = '';
    clearNoteFilters();
  }

  // Note creation
  async function createNote() {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tags = newNote.tags.length > 0 ? newNote.tags : [newNote.noteType];

    const note: Omit<LegalNote, 'savedAt' | 'updatedAt'> = {
      id: noteId,
      title: newNote.title,
      content: newNote.content,
      markdown: newNote.content,;
      html: `<p>${newNote.content.replace(/\n/g, '<br>')}</p>`,
      contentJson: { content: newNote.content },
      noteType: newNote.noteType,
      tags,
      caseId: newNote.caseId || undefined,
      userId: 'current-user', // TODO: Get from auth
      metadata: {
        priority: newNote.priority,
        riskLevel: newNote.riskLevel,;
        starred: false,
        aiGenerated: false,
        processingStatus: 'completed';
      }
    };

    await saveLegalNote(note);
    resetNewNoteForm();
    showCreateNote = false;
  }

  function resetNewNoteForm() {
    newNote = {
      title: '',
      content: '',
      noteType: 'general',;
      tags: [],
      caseId: '',;
      priority: 'medium',
      riskLevel: 'low';
    };
  }

  // Note editing
  function startEditNote(note: LegalNote) {
    editingNote = { ...note };
  }

  async function saveEditedNote() {
    if (!editingNote) return;

    await saveLegalNote({
      ...editingNote,
      markdown: editingNote.content,;
      html: `<p>${editingNote.content.replace(/\n/g, '<br>')}</p>`
    });

    editingNote = null;
  }

  function cancelEdit() {
    editingNote = null;
  }

  // Note actions
  async function toggleStar(note: LegalNote) {
    const updated = {
      ...note,
      metadata: {
        ...note.metadata,;
        starred: !note.metadata.starred;
      }
    };
    await saveLegalNote(updated);
  }

  async function deleteNote(noteId: string) {
    if (confirm('Are you sure you want to delete this note?')) {
      await removeLegalNote(noteId);
    }
  }

  // Semantic search
  async function performSemSearch() {
    if (!searchQuery.trim()) return;

    const results = await performSemanticSearch(searchQuery, 10);
    semanticResults = results;
    showSemanticSearch = true;
  }

  // Export functionality
  async function exportNotes(format: 'json' | 'markdown' | 'legal_brief') {
    await exportLegalNotes(format);
  }

  // Utility functions
  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',;
      hour: '2-digit',;
      minute: '2-digit';
    });
  }

  function getRiskBadgeVariant(riskLevel?: string) {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  }

  function getTypeBadgeColor(noteType: string): string {
    const colors: Record<string, string> = {
      'legal_analysis': 'bg-blue-500',
      'case_note': 'bg-green-500',
      'evidence_note': 'bg-purple-500',
      'research': 'bg-orange-500',
      'ai_generated': 'bg-pink-500',
      'ocr_extracted': 'bg-cyan-500',
      'todo': 'bg-yellow-500',
      'general': 'bg-gray-500'
    };
    return colors[noteType] || 'bg-gray-500';
  }

  function addTag(tag: string) {
    if (tag.trim() && !newNote.tags.includes(tag.trim())) {
      newNote.tags = [...newNote.tags, tag.trim()];
    }
  }

  function removeTag(index: number) {
    newNote.tags = newNote.tags.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-6 p-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold flex items-center gap-2">
        <FileText class="h-8 w-8 text-blue-600" />
        Legal Notes Manager
      </h1>
      <p class="text-muted-foreground">
        AI-Enhanced Legal Documentation with OCR, Embeddings & Graph Relations
      </p>
    </div>
    <div class="flex gap-2">
      <Button onclick={() => showCreateNote = !showCreateNote} variant="outline">
        <Plus class="h-4 w-4 mr-2" />
        New Note
      </Button>
      <Button onclick={() => showFilters = !showFilters} variant="outline">
        <Filter class="h-4 w-4 mr-2" />
        Filters
      </Button>
    </div>
  </div>

  <!-- Statistics Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <FileText class="h-4 w-4" />
          Total Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{stats.total || 0}</div>
        <div class="text-xs text-muted-foreground">
          {stats.recentlyUpdated || 0} updated this week
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <Brain class="h-4 w-4" />
          AI Enhanced
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{stats.aiGenerated || 0}</div>
        <div class="text-xs text-muted-foreground">
          {((stats.aiGenerated / Math.max(stats.total, 1)) * 100).toFixed(1)}% AI-generated
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <Eye class="h-4 w-4" />
          OCR Extracted
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{stats.ocrExtracted || 0}</div>
        <div class="text-xs text-muted-foreground">
          Avg confidence: {(stats.averageConfidence * 100).toFixed(1)}%
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm flex items-center gap-2">
          <AlertTriangle class="h-4 w-4" />
          High Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">
          {(stats.byRiskLevel?.high || 0) + (stats.byRiskLevel?.critical || 0)}
        </div>
        <div class="text-xs text-muted-foreground">
          Require attention
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Search and Filters -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Search class="h-5 w-5" />
        Search & Filter
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex gap-4">
        <div class="flex-1">
          <Input
            type="text"
            placeholder="Search notes, content, citations..."
            bind:value={searchQuery}
            onkeydown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <Button onclick={applyFilters}>
          <Search class="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button onclick={performSemSearch} variant="outline">
          <Brain class="h-4 w-4 mr-2" />
          Semantic
        </Button>
        <Button onclick={clearAllFilters} variant="ghost">
          Clear
        </Button>
      </div>

      {#if showFilters}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <label class="block text-sm font-medium mb-2">Note Type</label>
            <Select bind:value={selectedNoteType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="legal_analysis">Legal Analysis</SelectItem>
                <SelectItem value="case_note">Case Note</SelectItem>
                <SelectItem value="evidence_note">Evidence Note</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="ai_generated">AI Generated</SelectItem>
                <SelectItem value="ocr_extracted">OCR Extracted</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Risk Level</label>
            <Select bind:value={selectedRiskLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All levels</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-end gap-2">
            <Button onclick={() => exportNotes('json')} variant="outline" size="sm">
              <Download class="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button onclick={() => exportNotes('markdown')} variant="outline" size="sm">
              <Download class="h-4 w-4 mr-2" />
              Markdown
            </Button>
            <Button onclick={() => exportNotes('legal_brief')} variant="outline" size="sm">
              <Gavel class="h-4 w-4 mr-2" />
              Brief
            </Button>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Create New Note -->
  {#if showCreateNote}
    <Card>
      <CardHeader>
        <CardTitle>Create New Note</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Title</label>
            <Input
              type="text"
              placeholder="Note title";
              bind:value={newNote.title}
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Case ID</label>
            <Input
              type="text"
              placeholder="Optional case ID"
              bind:value={newNote.caseId}
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Type</label>
            <Select bind:value={newNote.noteType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="legal_analysis">Legal Analysis</SelectItem>
                <SelectItem value="case_note">Case Note</SelectItem>
                <SelectItem value="evidence_note">Evidence Note</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Priority</label>
            <Select bind:value={newNote.priority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Content</label>
          <Textarea
            placeholder="Note content...";
            bind:value={newNote.content}
            rows={6}
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Tags</label>
          <div class="flex flex-wrap gap-2 mb-2">
            {#each newNote.tags as tag, index}
              <Badge variant="outline" class="flex items-center gap-1">
                {tag}
                <button onclick={() => removeTag(index)} class="ml-1">
                  <X class="h-3 w-3" />
                </button>
              </Badge>
            {/each}
          </div>
          <Input
            type="text"
            placeholder="Add tag and press Enter"
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                addTag(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>

        <div class="flex gap-2">
          <Button onclick={createNote}>
            <Save class="h-4 w-4 mr-2" />
            Save Note
          </Button>
          <Button onclick={() => showCreateNote = false} variant="outline">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Semantic Search Results -->
  {#if showSemanticSearch && semanticResults.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Brain class="h-5 w-5" />
          Semantic Search Results
          <Button onclick={() => showSemanticSearch = false} variant="ghost" size="sm">
            <X class="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each semanticResults as note}
            <div class="border rounded p-4">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold">{note.title}</h3>
                <Badge variant="outline">
                  {(note.metadata.semanticSimilarity * 100).toFixed(1)}% match
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mb-2">
                {note.content.substring(0, 200)}...
              </p>
              <div class="flex gap-2">
                <Badge class={getTypeBadgeColor(note.noteType) + ' text-white'}>
                  {note.noteType.replace(/_/g, ' ')}
                </Badge>
                {#if note.metadata.riskLevel}
                  <Badge variant={getRiskBadgeVariant(note.metadata.riskLevel)}>
                    {note.metadata.riskLevel}
                  </Badge>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Notes List -->
  <div class="space-y-4">
    {#each notes as note (note.id)}
      <Card>
        <CardContent class="p-4">
          {#if editingNote?.id === note.id}
            <!-- Edit Mode -->
            <div class="space-y-4">
              <Input
                type="text"
                bind:value={editingNote.title}
                class="font-semibold"
              />
              <Textarea
                bind:value={editingNote.content}
                rows={6}
              />
              <div class="flex gap-2">
                <Button onclick={saveEditedNote} size="sm">
                  <Save class="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button onclick={cancelEdit} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          {:else}
            <!-- Display Mode -->
            <div class="space-y-3">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-lg">{note.title}</h3>
                    {#if note.metadata.starred}
                      <Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {/if}
                  </div>

                  <div class="flex flex-wrap gap-2 mb-3">
                    <Badge class={getTypeBadgeColor(note.noteType) + ' text-white'}>
                      {note.noteType.replace(/_/g, ' ')}
                    </Badge>

                    {#if note.metadata.riskLevel}
                      <Badge variant={getRiskBadgeVariant(note.metadata.riskLevel)}>
                        <AlertTriangle class="h-3 w-3 mr-1" />
                        {note.metadata.riskLevel}
                      </Badge>
                    {/if}

                    {#if note.metadata.aiGenerated}
                      <Badge variant="outline" class="border-purple-500 text-purple-500">
                        <Brain class="h-3 w-3 mr-1" />
                        AI Generated
                      </Badge>
                    {/if}

                    {#if note.metadata.ocrExtracted}
                      <Badge variant="outline" class="border-cyan-500 text-cyan-500">
                        <Eye class="h-3 w-3 mr-1" />
                        OCR
                      </Badge>
                    {/if}

                    {#if note.metadata.confidence}
                      <Badge variant="outline">
                        {(note.metadata.confidence * 100).toFixed(1)}% confidence
                      </Badge>
                    {/if}
                  </div>

                  <p class="text-sm text-muted-foreground mb-3">
                    {note.content.length > 300 ? note.content.substring(0, 300) + '...' : note.content}
                  </p>

                  <div class="flex flex-wrap gap-1 mb-3">
                    {#each note.tags as tag}
                      <Badge variant="outline" class="text-xs">
                        <Tag class="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    {/each}
                  </div>

                  <div class="flex items-center gap-4 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      {formatDate(note.updatedAt || note.savedAt)}
                    </span>
                    {#if note.caseId}
                      <span class="flex items-center gap-1">
                        <Gavel class="h-3 w-3" />
                        {note.caseId}
                      </span>
                    {/if}
                    {#if note.metadata.neo4jNodeId}
                      <span class="flex items-center gap-1">
                        <Database class="h-3 w-3" />
                        Linked
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="flex gap-2">
                  <Button
                    onclick={() => toggleStar(note)}
                    variant="ghost"
                    size="sm"
                  >
                    {#if note.metadata.starred}
                      <Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {:else}
                      <StarOff class="h-4 w-4" />
                    {/if}
                  </Button>
                  <Button
                    onclick={() => startEditNote(note)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit3 class="h-4 w-4" />
                  </Button>
                  <Button
                    onclick={() => deleteNote(note.id)}
                    variant="ghost"
                    size="sm"
                    class="text-red-600 hover:text-red-700"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <!-- Legal Citations -->
              {#if note.metadata.legalCitations?.length}
                <div class="border-t pt-3">
                  <h4 class="font-medium text-sm mb-2">Legal Citations</h4>
                  <div class="space-y-1">
                    {#each note.metadata.legalCitations.slice(0, 3) as citation}
                      <div class="text-xs text-muted-foreground">
                        <Badge variant="outline" class="mr-2">{citation.type}</Badge>
                        {citation.citation} (relevance: {citation.relevance})
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </CardContent>
      </Card>
    {/each}

    {#if notes.length === 0}
      <Card>
        <CardContent class="p-8 text-center">
          <FileText class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="font-semibold mb-2">No notes found</h3>
          <p class="text-muted-foreground mb-4">
            {currentFilters.search || currentFilters.noteType || currentFilters.riskLevel
              ? 'Try adjusting your filters or search query.'
              : 'Create your first note to get started.'}
          </p>
          {#if !showCreateNote}
            <Button onclick={() => showCreateNote = true}>
              <Plus class="h-4 w-4 mr-2" />
              Create Note
            </Button>
          {/if}
        </CardContent>
      </Card>
    {/if}
  </div>
</div>;