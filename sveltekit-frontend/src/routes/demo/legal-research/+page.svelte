<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';

  // ✅ SVELTE 5: Props
  let { data }: { data: PageData } = $props();

  // ✅ SVELTE 5: State
  let selectedFeature = $state<string | null>(null);
  let searchQuery = $state('');
  let demoResults = $state<any[]>([]);

  // ✅ SVELTE 5: Derived
  let activeFeatures = $derived(data.features.filter(f => f.status === 'active'));

  // Demo data
  const mockLegalCases = [
    {
      id: '1',
      title: 'Smith v. Johnson - Contract Dispute',
      summary: 'Breach of contract case involving commercial real estate transaction',
      date: '2024-03-15',
      outcome: 'Settled',
      relevance: 95,
    },
    {
      id: '2',
      title: 'State v. Anderson - Criminal Defense',
      summary: 'Fourth Amendment search and seizure violation',
      date: '2024-02-20',
      outcome: 'Dismissed',
      relevance: 88,
    },
    {
      id: '3',
      title: 'Tech Corp v. Competitor Inc - IP',
      summary: 'Patent infringement regarding software algorithm',
      date: '2024-01-10',
      outcome: 'Pending',
      relevance: 82,
    },
  ];

  function selectFeature(id: string) {
    selectedFeature = selectedFeature === id ? null : id;
  }

  function performSearch(e: Event) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Simulate search results
    demoResults = mockLegalCases.filter(
      c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg">
  <!-- Header -->
  <header class="bg-gradient-to-r from-legal-primary to-legal-secondary text-white">
    <div class="container-legal py-12">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <i class="i-carbon-research text-4xl"></i>
        </div>
        <div>
          <h1 class="text-4xl font-bold">Legal Research Demo</h1>
          <p class="text-blue-100 mt-2">Explore AI-powered legal research capabilities</p>
        </div>
      </div>

      {#if data.demoMode}
        <div class="glass px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm">
          <i class="i-carbon-warning-alt"></i>
          Demo Mode - Using sample data for demonstration
        </div>
      {/if}
    </div>
  </header>

  <!-- Main Content -->
  <main class="container-legal py-8">
    <!-- Search Section -->
    <section class="mb-12">
      <div class="card-ai">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
          <i class="i-carbon-search-advanced text-legal-primary"></i>
          Semantic Legal Search
        </h2>

        <form onsubmit={performSearch} class="space-y-4">
          <div class="relative">
            <input
              type="text"
              class="input-legal pr-32"
              placeholder="Search legal cases, statutes, or precedents..."
              bind:value={searchQuery}
            />
            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 btn-primary">
              <i class="i-carbon-search mr-2"></i>
              Search
            </button>
          </div>

          <div class="flex gap-2">
            <button type="button" class="btn-outline btn-sm" onclick={() => (searchQuery = 'contract breach')}>
              Contract Law
            </button>
            <button type="button" class="btn-outline btn-sm" onclick={() => (searchQuery = 'patent infringement')}>
              IP Law
            </button>
            <button type="button" class="btn-outline btn-sm" onclick={() => (searchQuery = 'criminal defense')}>
              Criminal Law
            </button>
          </div>
        </form>

        {#if demoResults.length > 0}
          <div class="mt-6 space-y-3">
            <h3 class="font-semibold text-gray-900 dark:text-dark-text">
              Found {demoResults.length} relevant cases
            </h3>
            {#each demoResults as result}
              <div class="card-evidence">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 dark:text-dark-text">{result.title}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{result.summary}</p>
                    <div class="flex gap-2 mt-3">
                      <span class="badge-primary text-xs">{result.outcome}</span>
                      <span class="badge-outline text-xs">{result.date}</span>
                      <span class="badge-success text-xs">{result.relevance}% Relevant</span>
                    </div>
                  </div>
                  <button class="btn-ghost" aria-label="View case details">
                    <i class="i-carbon-view"></i>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <!-- Features Grid -->
    <section>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-dark-text mb-6">Research Features</h2>

      <div class="grid-legal">
        {#each activeFeatures as feature}
          <button
            class="card-legal hover-lift cursor-pointer text-left w-full"
            class:ring-2={selectedFeature === feature.id}
            class:ring-legal-primary={selectedFeature === feature.id}
            onclick={() => selectFeature(feature.id)}
            type="button"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 rounded-xl bg-legal-primary/10 flex items-center justify-center flex-shrink-0">
                <i class="i-carbon-{feature.icon} text-2xl text-legal-primary"></i>
              </div>

              <div class="flex-1">
                <h3 class="font-semibold text-lg text-gray-900 dark:text-dark-text">
                  {feature.title}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {feature.description}
                </p>

                <div class="mt-4 flex items-center gap-2">
                  <span class="status-active"></span>
                  <span class="text-xs text-gray-500 uppercase font-medium">
                    {feature.status}
                  </span>
                </div>
              </div>
            </div>

            {#if selectedFeature === feature.id}
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  This feature is available in the full version. Click "Try Demo" to explore sample functionality.
                </p>
                <button class="btn-primary mt-3" type="button">
                  <i class="i-carbon-launch mr-2"></i>
                  Try Demo
                </button>
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </section>

    <!-- Demo Stats -->
    <section class="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card-legal text-center">
        <div class="text-3xl font-bold text-legal-primary">10K+</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Legal Documents</div>
      </div>
      <div class="card-legal text-center">
        <div class="text-3xl font-bold text-legal-secondary">500+</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Case Studies</div>
      </div>
      <div class="card-legal text-center">
        <div class="text-3xl font-bold text-legal-accent">95%</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Accuracy</div>
      </div>
      <div class="card-legal text-center">
        <div class="text-3xl font-bold text-legal-success">24/7</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Availability</div>
      </div>
    </section>
  </main>
</div>

<style>
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
</style>
