<!-- @migration-task Error while migrating Svelte code: ')}' is not a valid attribute name -->
<!-- AI-Enhanced "Did You Mean?" Suggestions Component with Intent Prediction -->
<script lang="ts">
  import { createCombobox, melt } from 'melt';
  import { Check, ChevronDown, Search, FileText, User, Folder, Tag, Brain, Zap, Target } from 'lucide-svelte';
  import { fly, fade } from 'svelte/transition';
  interface Suggestion {
    term?: string;
    suggestion?: string;
    text?: string;
    score?: number;
    confidence?: number;
    source?: 'lexical' | 'semantic' | 'ai';
    enhanced?: boolean;
    intent?: string;
    type?: 'spelling' | 'synonym' | 'contextual' | 'task';
    // Legacy support for existing format
    label?: string;
    entityId?: string;
    description?: string;
    icon?: string;
    tags?: string[];
  }

  interface TaskSuggestion {
    task: string;
    confidence: number;
    estimatedSteps: number;
    priority: 'low' | 'medium' | 'high';
    category: string;
  }

  interface UserProfile {
    confidenceLevel: number;
    learningPhase: 'exploration' | 'learning' | 'proficient' | 'expert';
    preferredIntents: string[];
  }

  interface Props {
    query?: string;
    placeholder?: string;
    contextType?: string;
    userId?: string;
    includeTaskSuggestions?: boolean;
    includeAI?: boolean;
    maxSuggestions?: number;
    showUserProfile?: boolean;
    onSelect?: (suggestion: Suggestion) => void;
    onTaskSelect?: (task: TaskSuggestion) => void;
    onSearch?: (query: string) => void;
  }

  let { 
    query = $bindable(''), 
    placeholder = 'Ask anything... AI will suggest and learn', 
    contextType = 'GENERAL',
    userId = 'anonymous',
    includeTaskSuggestions = true,
    includeAI = true,
    maxSuggestions = 8,
    showUserProfile = false,
    onSelect,
    onTaskSelect,
    onSearch 
  }: Props = $props();

  // Svelte 5 reactive state
  let suggestions = $state<Suggestion[]>([]);
  let taskSuggestions = $state<TaskSuggestion[]>([]);
  let userProfile = $state<UserProfile | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let metadata = $state<{ took_ms?: number; cached?: boolean }>({});
  let debounceTimer = $state<NodeJS.Timeout | null>(null);

  // Melt-UI combobox builder
  const {
    elements: { menu, input, option, label },
    states: { open, inputValue, selected },
    helpers: { isSelected }
  } = createCombobox<Suggestion>({
    forceVisible: true,
  });

  // Sync input with query prop
  $effect(() => {
    inputValue.set(query);
  });

  $effect(() => {
    query = $inputValue;
  });

  // Debounced search effect
  $effect(() => {
    if (query.length >= 2) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        await performSearch(query);
      }, 300);
    } else {
      suggestions = [];
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  });

  async function performSearch(searchQuery: string) {
    if (!searchQuery || searchQuery.length < 2) {
      suggestions = [];
      taskSuggestions = [];
      userProfile = null;
      return;
    }
    loading = true;
    error = null;
    try {
      const response = await fetch('/api/suggest/did-you-mean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          userId,
          context: contextType,
          limit: maxSuggestions,
          includeTaskSuggestions,
          includeAI
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      suggestions = data.suggestions || [];
      taskSuggestions = data.taskSuggestions || [];
      userProfile = data.userProfile || null;
      metadata = { 
        took_ms: data.took_ms, 
        cached: data.cached 
      };
      onSearch?.(searchQuery);
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      error = errorMessage;
      suggestions = [];
      taskSuggestions = [];
      userProfile = null;
    } finally {
      loading = false;
    }
  }

  function handleSelection(suggestion: Suggestion) {
    const suggestionText = suggestion.term || suggestion.suggestion || suggestion.text || suggestion.label || '';
    query = suggestionText;
    onSelect?.(suggestion);
    open.set(false);
  }

  function handleTaskSelection(task: TaskSuggestion) {
    onTaskSelect?.(task);
    open.set(false);
  }

  function getIconComponent(source?: string, type?: string) {
    if (source === 'ai') return Brain;
    if (type === 'task') return Target;
    switch (type) {
      case 'spelling': return Search;
      case 'synonym': return Zap;
      case 'contextual': return Brain;
      default: 
        // Legacy support
        switch (type) {
          case 'PERSON': return User;
          case 'DOCUMENT': return FileText;
          case 'CASE': return Folder;
          case 'TAG': return Tag;
          default: return Search;
        }
    }
  }

  function getSourceBadge(source?: string): { color: string; text: string } {
    switch (source) {
      case 'ai':
        return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', text: 'AI' };
      case 'semantic':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', text: 'Semantic' };
      case 'lexical':
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', text: 'Lexical' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', text: 'Auto' };
    }
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  }

  function getTypeColor(type: string): string {
    switch (type) {
      case 'spelling': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'synonym': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'contextual': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'task': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      // Legacy support
      case 'PERSON': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'DOCUMENT': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'CASE': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'EVIDENCE': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'TAG': return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  }
</script>

<div class="relative w-full">
  <!-- Search Input -->
  <div class="relative">
    <input
      class="w-full px-4 py-3 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      {placeholder}
      autocomplete="off"
    />
    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    {#if loading}
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <ChevronDown class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    {/if}
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" transition:fade>
      <p class="text-sm text-red-800 dark:text-red-200">
        <span class="font-medium">Error:</span> {error}
      </p>
    </div>
  {/if}

  <!-- Metadata Display -->
  {#if metadata.took_ms}
    <div class="mt-1 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
      <span>{metadata.took_ms}ms {metadata.cached ? '(cached)' : ''}</span>
      {#if includeAI}
        <span class="flex items-center gap-1">
          <Brain class="w-3 h-3" />
          AI Enhanced
        </span>
      {/if}
    </div>
  {/if}

  <!-- AI-Enhanced Suggestions Dropdown -->
  {#if $open && (suggestions.length > 0 || taskSuggestions.length > 0)}
    <div
      
      class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-auto"
      transition:fly={{ y: -5, duration: 150 }}
    >
      <!-- Regular Suggestions -->
      {#if suggestions.length > 0}
        <div class="p-2">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
            Suggestions
          </div>
          {#each suggestions as suggestion, index}
            {@const suggestionText = suggestion.term || suggestion.suggestion || suggestion.text || suggestion.label || ''}
            {@const confidence = suggestion.confidence || suggestion.score || 0}
            <button
              )}
              class="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none rounded border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              on:click={() => handleSelection(suggestion)}
            >
              <div class="flex items-center gap-3">
                <!-- Icon -->
                <div class="p-1.5 {getTypeColor(suggestion.type || 'default')} rounded-md">
                  <svelte:component 
                    this={getIconComponent(suggestion.source, suggestion.type)} 
                    class="w-3.5 h-3.5" 
                  />
                </div>
                
                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {suggestionText}
                    </span>
                    <div class="flex items-center gap-2 ml-2">
                      <span class="text-xs {getConfidenceColor(confidence)}">
                        {Math.round(confidence * 100)}%
                      </span>
                      {#if suggestion.source}
                        {@const badge = getSourceBadge(suggestion.source)}
                        <span class="px-1.5 py-0.5 text-xs {badge.color} rounded-full">
                          {badge.text}
                        </span>
                      {/if}
                      {#if suggestion.enhanced}
                        <span class="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                          Enhanced
                        </span>
                      {/if}
                    </div>
                  </div>
                  
                  {#if suggestion.intent}
                    <p class="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      Intent: {suggestion.intent}
                    </p>
                  {/if}
                  
                  {#if suggestion.description}
                    <p class="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {suggestion.description}
                    </p>
                  {/if}
                  
                  <!-- Legacy Tags Support -->
                  {#if suggestion.tags && suggestion.tags.length > 0}
                    <div class="flex gap-1 mt-1">
                      {#each suggestion.tags.slice(0, 3) as tag}
                        <span class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          {tag}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Task Suggestions -->
      {#if taskSuggestions.length > 0}
        <div class="p-2 border-t border-gray-200 dark:border-gray-600">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 flex items-center gap-1">
            <Target class="w-3 h-3" />
            Task Suggestions
          </div>
          {#each taskSuggestions as task, index}
            <button
              class="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none rounded border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              on:click={() => handleTaskSelection(task)}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {task.task}
                  </p>
                  <div class="flex items-center space-x-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                    <span>{task.estimatedSteps} steps</span>
                    <span class="capitalize">{task.category}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 ml-2">
                  <span class="text-xs {getConfidenceColor(task.confidence)}">
                    {Math.round(task.confidence * 100)}%
                  </span>
                  <span class="px-1.5 py-0.5 text-xs rounded-full {
                    task.priority === 'high' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : task.priority === 'medium' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  }">
                    {task.priority}
                  </span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <!-- User Profile -->
      {#if showUserProfile && userProfile}
        <div class="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Your Profile
          </div>
          <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div class="flex justify-between">
              <span>Learning Phase:</span>
              <span class="capitalize font-medium">{userProfile.learningPhase}</span>
            </div>
            <div class="flex justify-between">
              <span>Confidence:</span>
              <span class="{getConfidenceColor(userProfile.confidenceLevel)} font-medium">
                {Math.round(userProfile.confidenceLevel * 100)}%
              </span>
            </div>
            {#if userProfile.preferredIntents.length > 0}
              <div class="flex flex-wrap gap-1 mt-1">
                {#each userProfile.preferredIntents as intent}
                  <span class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    {intent}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- No Results -->
  {#if $open && !loading && !error && suggestions.length === 0 && taskSuggestions.length === 0 && query.length >= 2}
    <div class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4">
      <div class="text-center text-gray-500 dark:text-gray-400">
        <Brain class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p class="text-sm">No AI suggestions found for "{query}"</p>
        <p class="text-xs mt-1">Try a different search term or check spelling</p>
        {#if includeAI}
          <p class="text-xs mt-1 text-blue-600 dark:text-blue-400">
            AI learning in progress... suggestions will improve over time
          </p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure proper z-index stacking */
  :global(.melt-dialog-overlay) {
    z-index: 50;
  }
  
  :global(.melt-dialog-content) {
    z-index: 51;
  }
  
  /* Custom scrollbar for suggestions */
  .suggestions-scroll::-webkit-scrollbar {
    width: 6px;
  }
  
  .suggestions-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  .suggestions-scroll::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  .suggestions-scroll::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>
