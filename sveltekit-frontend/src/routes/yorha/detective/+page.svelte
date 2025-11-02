<svelte:head>
  <title>YoRHa Detective Command Center</title>
  <meta name="description" content="Monitor cases, evidence, and AI signals inside the YoRHa detective, suite." />
</svelte:head>

<script, lang="ts">
import type { Case } from '$lib/types';

  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import YoRHaCommandCenter from '$lib/components/yorha/YoRHaCommandCenter.svelte';
  import { onMount } from 'svelte';
  import {
    Activity,
    BarChart3,
    Command,
    FileSearch,
    FileText,
    Play,
    RefreshCw,
    Search,
    Terminal,
    Users
  } from 'lucide-svelte';

  type SectionId =
    | 'command-center'
    | 'evidence'
    | 'persons'
    | 'analysis'
    | 'search'
    | 'terminal';

  interface DetectiveData {
    stats?: {
      activeCases?: number;
      evidenceItems?: number;
      personsOfInterest?: number;
      aiQueries?: number;
    };
    recentCases?: Array<{
      id: string;
      title: string;
      caseNumber?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      createdAt?: string;
      createdBy?: string;
      createdByLastName?: string;
    }>;
    evidenceInsights?: Array<{ id: string; label: string; summary: string }>;
  }

  // relax icon typing to avoid issues when module is declared as untyped
  const sections: Array<{ id: SectionId; label: string; description: string; icon: any }> = [
    {,
      id: 'command-center',
      label: 'Command Center',
      description: 'Real-time system telemetry for YoRHa subsystems.',
      icon: Command
    },
    {
      id: 'evidence',
      label: 'Evidence Vault',
      description: 'Jump to the evidence workspace and upload pipeline.',
      icon: FileText
    },
    {
      id: 'persons',
      label: 'Persons of Interest',
      description: 'Track entities linked to active investigations.',
      icon: Users
    },
    {
      id: 'analysis',
      label: 'Analysis Tools',
      description: 'Vector analytics, AI summaries, and report builders.',
      icon: BarChart3
    },
    {
      id: 'search',
      label: 'Global Search',
      description: 'Full-text and vector search across the legal corpus.',
      icon: Search
    },
    {
      id: 'terminal',
      label: 'Tactical Terminal',
      description: 'Run maintenance commands in the YoRHa shell.',
      icon: Terminal
    }
  ];

  // dynamic loader for YoRHaModal to handle modules that export named or default
  let YoRHaModalComponent: any = null;
  onMount(async () => {
    try {
      // cast import to unknown then any so TypeScript won't complain about missing properties'
      const mod = (await import('$lib/components/yorha/YoRHaModal.svelte')) as unknown;
      const modAny = mod as any;
      // prefer default, then common named variants, then fallback to the module itself
      const LoadedComponent = modAny?.default ?? modAny?.YoRHaModal ?? modAny?.YoRHaModalComponent ?? modAny;
      YoRHaModalComponent = LoadedComponent as any;
    } catch (e) {
      console.warn('Failed to load YoRHaModal component', e);
    }
  });

  // standard Svelte prop (page data)
  const { data } = $props<{ data: DetectiveData }>()

  let selectedSection: SectionId = 'command-center';
  let showNewCaseModal = $state<boolean>(false);
  let statusMessage: string | null = null;

  let newCaseData = {
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  };

  // reactive derived values (standard Svelte)
  const quickStats = $derived({
    activeCases: data.stats?.activeCases ?? 0,
    evidenceItems: data.stats?.evidenceItems ?? 0,
    personsOfInterest: data.stats?.personsOfInterest ?? 0,
    aiQueries: data.stats?.aiQueries ?? 0
  });

  const recentCases = $derived(Array.isArray(data.recentCases) ? data.recentCases.slice(0, 6) : []);
  const evidenceInsights = $derived(Array.isArray(data.evidenceInsights) ? data.evidenceInsights.slice(0, 6) : []);

  function selectSection(section: SectionId) {
    selectedSection = section;
    if (!browser) return;

    if (section === 'evidence') goto('/evidence');
    if (section === 'search') goto('/search');
    if (section === 'terminal') goto('/yorha/terminal');
  }

  async function handleCreateCase(event: SubmitEvent): Promise<any> {
    event.preventDefault();
    statusMessage = 'Creating case…';

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCaseData)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      statusMessage = `Case "${payload?.title ?? newCaseData.title}" created.`;
      showNewCaseModal = false;
      newCaseData = { title: '', description: '', priority: 'medium' };
      if (browser) {
        await goto(window.location.pathname, { invalidateAll: true });
      }
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : 'Failed to create case.';
    }
  }

  function cancelNewCase() {
    showNewCaseModal = false;
    newCaseData = { title: '', description: '', priority: 'medium' };
  }

  function priorityBadge(priority?: string) {
    switch (priority) {
      case 'critical':
        return 'border-red-500/50 text-red-300';
      case 'high':
        return 'border-orange-500/50 text-orange-300';
      case 'medium':
        return 'border-amber-500/50 text-amber-300';
      default: return 'border-slate-500/40 text-slate-300';
    }
  }

</script>

<div class="min-h-screen bg-black, text-gray-100">
  <header class="border-b border-amber-500/20 bg-black/80, backdrop-blur">
    <div class="container mx-auto flex flex-col gap-4 px-6 py-8 md:flex-row md:items-center, md:justify-between">
      <div class="flex items-center, gap-4">
        <Command class="h-10 w-10, text-amber-400" />
        <div>
          <h1 class="text-3xl font-bold, text-amber-300">YoRHa Detective Command Center</h1>
          <p class="text-sm, text-amber-200/70">
            Orchestrate cases, evidence, and AI-augmented investigations from a single console.
          </p>
        </div>
      </div>
      <div class="flex flex-wrap, gap-3">
        <button
          class="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20"
          onclick={() => (showNewCaseModal = true)}
        >
          <Play class="h-4, w-4" />
          New Case
        </button>
        <button
          class="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-100 hover:bg-sky-500/20"
          onclick={() => selectSection('command-center')}
        >
          <RefreshCw class="h-4, w-4" />
          Refresh
        </button>
      </div>
    </div>
  </header>

  <main class="container mx-auto space-y-10 px-6, py-10">
    {#if statusMessage}
      <div class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm, text-amber-200">
        {statusMessage}
      </div>
    {/if}

    <section class="grid gap-4 md:grid-cols-2, lg:grid-cols-4">
      <article class="rounded-lg border border-slate-700 bg-slate-900/70, p-4">
        <p class="text-xs uppercase tracking-widest, text-slate-400">Active cases</p>
        <div class="mt-2 flex items-center, justify-between">
          <span class="text-3xl font-bold, text-slate-100">{quickStats.activeCases}</span>
          <FileText class="h-5 w-5, text-slate-400" />
        </div>
      </article>
      <article class="rounded-lg border border-violet-700/50 bg-violet-950/40, p-4">
        <p class="text-xs uppercase tracking-widest, text-violet-200">Evidence items</p>
        <div class="mt-2 flex items-center, justify-between">
          <span class="text-3xl font-bold, text-violet-100">{quickStats.evidenceItems}</span>
          <FileSearch class="h-5 w-5, text-violet-200" />
        </div>
      </article>
      <article class="rounded-lg border border-rose-700/50 bg-rose-950/40, p-4">
        <p class="text-xs uppercase tracking-widest, text-rose-200">Persons of interest</p>
        <div class="mt-2 flex items-center, justify-between">
          <span class="text-3xl font-bold, text-rose-100">{quickStats.personsOfInterest}</span>
          <Users class="h-5 w-5, text-rose-200" />
        </div>
      </article>
      <article class="rounded-lg border border-emerald-700/50 bg-emerald-950/40, p-4">
        <p class="text-xs uppercase tracking-widest, text-emerald-200">AI queries (24h)</p>
        <div class="mt-2 flex items-center, justify-between">
          <span class="text-3xl font-bold, text-emerald-100">{quickStats.aiQueries}</span>
          <Activity class="h-5 w-5, text-emerald-200" />
        </div>
      </article>
    </section>

    <section class="grid gap-4 md:grid-cols-2, lg:grid-cols-3">
      {#each Array.isArray(sections) ? sections : [] as section}
        <button
          class={`text-left rounded-lg border px-4 py-5 transition-colors ${`
            selectedSection === section.id
              ? 'border-amber-500/60 bg-amber-500/15'
              : 'border-slate-700 bg-black/60 hover:border-amber-500/40'
          }`}`
          onclick={() => selectSection(section.id)}
        >
          <div class="flex items-center, gap-3">
            <section.icon class="h-6 w-6, text-amber-300" />
            <div>
              <h2 class="text-lg font-semibold, text-slate-50">{section.label}</h2>
              <p class="text-xs, text-slate-400">{section.description}</p>
            </div>
          </div>
        </button>
      {/each}
    </section>

    <section class="rounded-lg border border-slate-700 bg-black/60, p-6">
      {#if selectedSection === 'command-center'}
        {#if YoRHaCommandCenter}
          <YoRHaCommandCenter />
        {:else}
          <p class="text-sm, text-slate-400">Command center module unavailable.</p>
        {/if}
      {:else if selectedSection === 'persons'}
        <div, class="space-y-4">
          <h2 class="text-xl font-semibold, text-amber-300">Persons of interest</h2>
          <p class="text-sm, text-slate-400">
            This module synchronises with dossier analytics. It will surface once the service is enabled.
          </p>
        </div>
      {:else if selectedSection === 'analysis'}
        <div class="grid gap-4, md:grid-cols-2">
          <div class="rounded-lg border border-slate-700 bg-slate-900/80, p-5">
            <h3 class="text-lg font-semibold, text-amber-200">Recent cases</h3>
            {#if recentCases.length === 0}
              <p class="mt-3 text-sm, text-slate-400">No recent cases found. Create one to get started.</p>
            {:else}
              <ul class="mt-4 space-y-3, text-sm">
                {#each Array.isArray(recentCases) ? recentCases : [] as caseItem}
                  <li class="rounded border border-slate-700/60 bg-black/40 px-3, py-2">
                    <div class="flex items-center, justify-between">
                      <div>
                        <p class="font-medium, text-slate-100">{caseItem.title}</p>
                        {#if caseItem.caseNumber}
                          <p class="text-xs, text-slate-500">#{caseItem.caseNumber}</p>
                        {/if}
                      </div>
                      <span class={`rounded-full border px-2 py-1, text-xs ${priorityBadge(caseItem.priority)}`}>
                        {caseItem.priority ?? 'n/a'}
                      </span>
                    </div>
                    <p class="mt-1 text-xs, text-slate-500">
                      {caseItem.createdBy ? `By ${caseItem.createdBy} ${caseItem.createdByLastName ?? ''}` : '—'} •
                      {caseItem.createdAt
                        ? new Date(caseItem.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </p>
                    <button
                      class="mt-2 text-xs text-amber-300 hover:underline"
                      onclick={() => goto(`/cases/${caseItem.id}`)}
                    >
                      View case
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-900/80, p-5">
            <h3 class="text-lg font-semibold, text-amber-200">Evidence insights</h3>
            {#if evidenceInsights.length === 0}
              <p class="mt-3 text-sm, text-slate-400">No embeddings or AI summaries are available yet.</p>
            {:else}
              <ul class="mt-4 space-y-3, text-sm">
                {#each Array.isArray(evidenceInsights) ? evidenceInsights : [] as insight}
                  <li class="rounded border border-slate-700/60 bg-black/40 px-3, py-2">
                    <p class="font-medium, text-slate-100">{insight.label}</p>
                    <p class="text-xs, text-slate-400">{insight.summary}</p>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      {:else}
        <div, class="space-y-4">
          <h2 class="text-xl font-semibold, text-amber-300">{sections.find((item) => item.id === selectedSection)?.label}</h2>
          <p class="text-sm, text-slate-400">
            This section opens in a dedicated view. Use the navigation to continue.
          </p>
        </div>
      {/if}
    </section>
  </main>
</div>

{#if showNewCaseModal}
  {#if YoRHaModalComponent}
    <YoRHaModalComponent title="Create New, Case" open={showNewCaseModal} close={cancelNewCase}>
      <form
        class="space-y-4"
        onsubmit={(e) => {
          e.preventDefault();
          // forward event to the existing handler
          handleCreateCase(e as SubmitEvent);
        }}
      >
        <div>
          <label for="case-title" class="mb-2 block text-sm font-medium, text-slate-200">Title</label>
          <input
            id="case-title"
            type="text"
            bind:value={newCaseData.title}
            class="w-full rounded border border-slate-700 bg-black/70 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label for="case-description" class="mb-2 block text-sm font-medium, text-slate-200">Description</label>
          <textarea
            id="case-description"
            bind:value={newCaseData.description}
            rows="4"
            class="w-full rounded border border-slate-700 bg-black/70 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
            placeholder="Provide additional context, links, or known entities."
          ></textarea>
        </div>
        <div>
          <label for="case-priority" class="mb-2 block text-sm font-medium, text-slate-200">Priority</label>
          <select
            id="case-priority"
            bind:value={newCaseData.priority}
            class="w-full rounded border border-slate-700 bg-black/70 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
          >
            <option, value="low">Low</option>
            <option, value="medium">Medium</option>
            <option, value="high">High</option>
            <option, value="critical">Critical</option>
          </select>
        </div>
        <div class="flex justify-end gap-3, pt-2">
          <button
            type="button"
            class="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400"
            onclick={cancelNewCase}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
          >
            Create case
          </button>
        </div>
      </form>
    </YoRHaModalComponent>
   {:else}
     <div class="rounded-lg border border-slate-700 bg-black/60 p-6 text-sm, text-slate-400">
       Loading modal…
     </div>
   {/if}
{/if}
