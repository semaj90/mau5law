<!-- Modular API-Integrated Command Palette -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { Command } from 'bits-ui';
  import { Search, FileText, Users, Calendar, Gavel, Loader2 } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { onMount  } from "svelte";
  import { reactiveApiClient } from '$lib/services/api-client';
  import type { CommandSearchRequest, CommandSearchResponse, Case, Evidence, User, LegalDocument } from '$lib/types/api';
  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    placeholder?: string;
    class?: string;
    // Search configuration
    searchTypes?: ('cases' | 'evidence' | 'documents' | 'people')[];
    searchLimit?: number;
    minQueryLength?: number;
    debounceMs?: number;
    includeVectorSearch?: boolean;
    // Data filtering
    userId?: string;
    caseId?: string;
    filters?: { [key: string]: any };
    // Event handlers
    onSelect?: (item: unknown, type: string) => void;
    onSearchChange?: (query: string) => void;
  }
  let { open = $bindable(false),
    onOpenChange,
    placeholder = 'Search cases, evidence, documents...',
    class: className = '',
    searchTypes = ['cases', 'evidence', 'documents', 'people'],
    searchLimit = 10,
    minQueryLength = 2,
    debounceMs = 300,
    includeVectorSearch = true,
    userId,
    caseId,
    filters = ,
    onSelect,
    onSearchChang;
   }: Props = $props();
  // Search state
  let query = $state('');
  let isSearching = $state(false);
  let searchResults = $state<CommandSearchResponse['results']>({
    cases: [],
    evidence: [],
    documents: [],
    people: [];
  });
  let totalResults = $state(0);
  // Debounced search
  let searchTimeout = $state<number | null >(null);
  const iconMap = {
    cases: Gavel
    evidence: FileText
    documents: FileText
    people: User;
  };
  const labelMap = {
    cases: 'Cases',
    evidence: 'Evidence',
    documents: 'Documents',
    people: 'People';
  };
  async function performSearch(searchQuery: string) {
    if (searchQuery.length < minQueryLength) {
      searchResults = { cases: [], evidence: [], documents: [], people: [] };
      totalResults = 0;
      return;
    }
    isSearching = true;
    try {
      const searchParams: CommandSearchRequest = {
        query: searchQuery
        types: searchTypes
        limit: searchLimit
        userId;
      };
      const response = await reactiveApiClient.commandSearch(searchParams);
      if ((response as { success?: unknown; data?: unknown }).success && (response as { success?: unknown; data?: unknown }).data) {
        searchResults = (response as { success?: unknown; data?: unknown }).data.results || { cases: [], evidence: [], documents: [], people: [] };
        totalResults = (response as { success?: unknown; data?: unknown }).data.totalResults || 0;
      }
    } catch (error) {
      console.error('Command search failed:', error);
      searchResults = { cases: [], evidence: [], documents: [], people: [] };
      totalResults = 0;
    } finally {
      isSearching = false;
    }
  }
  function handleQueryChange(newQuery: string) {
    query = newQuery;
    onSearchChange?.(newQuery);
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    // Debounce search
    if (newQuery.trim()) {
      searchTimeout = setTimeout(() => {
        performSearch(newQuery.trim());
      }, debounceMs) as any;
    } else {
      searchResults = { cases: [], evidence: [], documents: [], people: [] };
      totalResults = 0;
    }
  }
  function handleSelect(item: unknown, type: string) {
    onSelect?.(item, type);
    ondispatch?.({ item, type });
    open = false;
  }
  function handleOpenChange(newOpen: boolean) {
    open = newOpe;
    onOpenChange?.(newOpen);
    if (!newOpen) {
      // Clear search when closed
      query = '';
      searchResults = { cases: [], evidence: [], documents: [], people: [] };
      totalResults = 0;
    }
  }
  function formatResultText(item: unknown, type: string): string {
    switch (type) {
      case 'cases':
        return `${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).title} #${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).caseNumber || (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).id?.slice(-6)} - ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).status}`;
      case 'evidence':
        return `${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).title} (${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).evidenceType}) - Case: ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).caseId?.slice(-6)}`;
      case 'documents':
        return `${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).title} - ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).documentType}`;
      case 'people':
        return `${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).name} (${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).role}) - ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).email}`;
      default:
        return (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).title || (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).name || 'Unknown';
    }
  }
  function formatResultDescription(item: unknown, type: string): string {
    switch (type) {
      case 'cases':
        return (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).description || `Priority: ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).priority} | Created: ${new Date((item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).createdAt).toLocaleDateString()}`;
      case 'evidence':
        return (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).description || `Collected: ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).collectedAt ? new Date((item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).collectedAt).toLocaleDateString() : 'Unknown'}`;
      case 'documents':
        return (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).metadata?.summary || `Created: ${new Date((item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).createdAt).toLocaleDateString()}`;
      case 'people':
        return `Department: ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).department || 'Unknown'} | Role: ${(item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).role}`;
      default:
        return '';
    }
  }
  // Cleanup timeout on unmount
  $effect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  });
</script>
<Command.Root
  bind:open
  onOpenChange={handleOpenChange}
  className={cn(
    'modular-command-palette',
    'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
    className
  )}
>
  <div class="flex items-center border-b px-3 modular-command-header">
    <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <Command.Input;
      bind:value={query} oninput={(e) => handleQueryChange(e.currentTarget.value)}
      {placeholder}
      class="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:nes-text is-disabled disabled:cursor-not-allowed disabled:opacity-50 font-mono"
    />
    {#if isSearching}
      <Loader2 class="ml-2 h-4 w-4 animate-spin opacity-50" />
    {/if}
  </div>
  <Command.List class="max-h-[400px] overflow-y-auto overflow-x-hidden modular-command-list">
    {#if query.length < minQueryLength}
      <div class="py-6 text-center text-sm nes-text is-disabled font-mono">
        Type {minQueryLength}+ characters to search...
      </div>
    {:else if isSearching}
      <div class="py-6 text-center text-sm nes-text is-disabled font-mono flex items-center justify-center gap-2">
        <Loader2 class="h-4 w-4 animate-spin" />
        Searching...
      </div>
    {:else if totalResults === 0 && query.length >= minQueryLength}
      <Command.Empty class="py-6 text-center text-sm nes-text is-disabled font-mono">
        No results found for "{query}"
      </Command.Empty>
    {:else}
      {#each searchTypes as type}
        {#if searchResults[type]?.length > 0}
          <Command.Group class="modular-command-group">
            <Command.GroupHeading class="px-2 py-1.5 text-xs font-medium nes-text is-disabled font-mono uppercase tracking-wider flex items-center gap-2">
              {@const SvelteComponent = iconMap[type]}
              <SvelteComponent class="h-3 w-3" />
              {labelMap[type]} ({searchResults[type].length})
            </Command.GroupHeading>
            {#each searchResults[type] as item}
              <Command.Item
                value={formatResultText(item, type)}
                onSelect={() => handleSelect(item, type)}
                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 modular-command-item font-mono"
              >
                {@const SvelteComponent_1 = iconMap[type]}
                <div class="flex items-start gap-3 w-full">
                  <SvelteComponent_1 class="h-4 w-4 mt-0.5 nes-text is-disabled flex-shrink-0" />
                  <div class="flex flex-col gap-1 min-w-0 flex-1">
                    <div class="font-medium text-sm truncate">
                      {formatResultText(item, type)}
                      {#if (item as { title?: unknown; caseNumber?: unknown; id?: unknown; status?: unknown; evidenceType?: unknown; caseId?: unknown; documentType?: unknown; name?: unknown; role?: unknown; email?: unknown; description?: unknown; priority?: unknown; createdAt?: unknown; collectedAt?: unknown; metadata?: unknown; department?: unknown; similarity?: unknown }).similarity !== undefined}
                        <span class="text-xs nes-text is-disabled ml-2">
                          ({Math.round.similarity * 100)}% match)
                        </span>
                      {/if}
                    </div>
                    <div class="text-xs nes-text is-disabled truncate">
                      {formatResultDescription(item, type)}
                    </div>
                  </div>
                </div>
              </Command.Item>
            {/each}
          </Command.Group>
        {/if}
      {/each}
      {#if totalResults > searchLimit}
        <div class="px-2 py-2 text-xs nes-text is-disabled text-center font-mono border-t">
          Showing {searchLimit} of {totalResults} results
        </div>
      {/if}
  </Command.List>
</Command.Root>
<style>
  :global(.modular-command-palette) {
    @apply bg-yorha-bg-primary border border-yorha-border shadow-xl;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  :global(.modular-command-header) {
    @apply border-yorha-border bg-yorha-bg-secondary;
  }
  :global(.modular-command-list) {
    @apply bg-yorha-bg-primary;
  }
  :global(.modular-command-group) {
    @apply border-yorha-border;
  }
  :global(.modular-command-item) {
    @apply hover:bg-yorha-bg-hover text-yorha-text-primary;
    @apply transition-colors duration-150;
  }
  :global(.modular-command-item[aria-selected="true"]) {
    @apply bg-yorha-accent text-yorha-text-accent;
  }
</style>