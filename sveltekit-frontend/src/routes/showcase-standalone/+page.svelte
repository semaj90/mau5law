<!--
=================================================================
  FIXED: NieR & Harvard-Themed Svelte Components Showcase
  Integrated with enhanced UI components and vector search
=================================================================
-->
<script lang="ts">
import type { Case } from '$lib/types';
  // Using bits-ui + NES.css + UnoCSS; removed melt-ui & unused imports
  import 'nes.css/css/nes.min.css';
  import 'uno.css';
  // removed invalid/unused lucide-svelte imports
  import { notifications } from '$lib/stores/unified';
  // Import our enhanced UI components
  import Button from '$lib/components/ui/enhanced-bits/Button.svelte'; // Changed import path
  import Input from '$lib/components/ui/Input.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  // State for demonstrations
  let modalOpen = $state<boolean>(false);
  let searchQuery = $state<string>('');
  // --- Added typed shape for vector search results ---
  type VectorResult = {
    metadata?: {
      title?: string;
      type?: string;
      [k: string]: any;
    } | null;
    content?: string | null;
    score?: number | null;
    [k: string]: any;
  };
  // typed array to avoid any[] inference
  let vectorResults = $state<VectorResult[]>([]);
  let isSearching = $state<boolean>(false);
  // Demo data
  let layoutData = $state({
    user: { name: 'James', email: 'james@example.com' },
    stats: { totalCases: 12, openCases: 5, closedCases: 7, evidenceCount: 142 },
    recentActivity: [
      { action: 'Uploaded Evidence', details: 'witness_statement_01.pdf', time: '2m ago' },
      { action: 'Updated Case', details: 'State v. Anderson', time: '1h ago' },
      { action: 'Generated Report', details: 'Initial Analysis', time: '3h ago' },
    ],
  });
  // Vector search integration (updated parsing to typed results)
  async function performVectorSearch(): Promise<any> {
    if (!searchQuery.trim()) return;
    isSearching = true;
    try {
      const response = await fetch('/api/vector/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          options: { limit: 5, threshold: 0.7 },
        }),
      });
      const data = await response.json();
      // cast the incoming results to our typed shape safely
      const results = (data as { results?: VectorResult[] })?.results ?? [];
      vectorResults = results;
      // notifications store doesn't expose: 'add' in its TS type — cast to any
      (notifications as any).add?.({
        type: 'success',
        title: 'Search Complete',
        message: `Found ${vectorResults.length} results`,
      });
    } catch (error) {
      console.error('Vector search failed:', error);
      (notifications as any).add?.({
        type: 'error',
        title: 'Search Failed',
        message: 'Vector search service unavailable',
      });
    } finally {
      isSearching = false;
    }
  }

  // --- safe helpers for preview and score formatting ---
  function getPreview(content: any): string | null {
    if (typeof content === 'string' && content.length > 0) {
      return content.length > 100 ? `${content.slice(0, 100)}...` : content;
    }
    return null;
  }

  function getScorePercent(score: any): string {
    const n = typeof score === 'number' && Number.isFinite(score) ? score : 0;
    return (n * 100).toFixed(1);
  }
</script>

<div class="p-8 font-sans bg-nier-surface text-nier-white min-h-screen">
  <h1 class="text-3xl font-bold mb-4 border-b-2 border-crimson nier-text-glow">Enhanced Legal AI Showcase</h1>
  <!-- Vector Search Demo -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-4 text-gold">Vector Search Integration</h2>
    <div class="nier-nier-bits-card nier-nier-bits-card-interactive p-6">
      <div class="flex gap-4 mb-4">
        <Input bind:value={searchQuery} placeholder="Search cases, evidence, legal documents..." class="flex-1" />
        <div class="bits-btn">
          <Button
            onclick={performVectorSearch}
            disabled={!searchQuery.trim() || isSearching}
            variant="primary"
            size="sm"
          >
            {#if isSearching}
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Searching...
            {:else}
              <!-- replaced <Search /> icon with emoji to avoid lucide import issues -->
              <span class="mr-2">🔍</span>
              Search
            {/if}
          </Button>
        </div>
      </div>
      {#if vectorResults.length > 0}
        <div class="mt-4">
          <h4 class="text-lg font-semibold text-gold mb-2">Search Results:</h4>
          <div class="space-y-2">
            {#each Array.isArray(vectorResults) ? vectorResults : [] as result}
              <div class="p-3 bg-nier-surface-light rounded border border-nier-border">
                <div class="flex justify-between items-start">
                  <div>
                    <h5 class="font-semibold text-nier-white">
                      {result.metadata?.title ?? 'Untitled'}
                    </h5>
                    <p class="text-sm text-nier-text-muted">
                      {#if getPreview(result.content)}
                        {getPreview(result.content)}
                      {:else}
                        No preview available
                      {/if}
                    </p>
                    <span class="text-xs text-nier-accent">
                      Score: {getScorePercent(result.score)}%
                    </span>
                  </div>
                  <span class={"badge " + (result.metadata?.type ? `status-${result.metadata.type}` : 'status-default')}>
                    {result.metadata?.type ?? 'document'}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>
  <!-- Enhanced UI Components Demo -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-4 text-gold">Enhanced UI Components</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Button variants -->
      <div class="nes-container">
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4 text-crimson">Button Variants</h3>
          <div class="space-y-3">
            <div class="bits-btn">
              <Button variant="default" onclick={() => {}} size="default">Primary Action</Button> // Changed Btn to Button
            </div>
            <div class="bits-btn">
              <Button variant="secondary" onclick={() => {}} size="default">Secondary Action</Button> // Changed Btn to Button
            </div>
            <div class="bits-btn">
              <Button variant="ghost" onclick={() => {}} size="default">Ghost Button</Button> // Changed Btn to Button
            </div>
            <div class="bits-btn">
              <Button variant="error" onclick={() => {}} size="default">Delete Action</Button> // Changed Btn to Button
            </div>
          </div>
        </div>
      </div>
      <!-- Modal demo -->
      <div class="nes-container">
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4 text-crimson">Modal Component</h3>
          <div class="bits-btn">
            <Button onclick={() => (modalOpen = true)} variant="default" size="default"> // Changed Btn to Button
              Open Modal
            </Button>
          </div>
          <Modal bind:open={modalOpen} title="System Alert">
            <div class="mt-4">
              <p class="text-nier-light-gray mb-4">
                This modal uses the enhanced Modal component with Svelte 5 runes. The modal integrates with bits-ui and
                follows Svelte 5 best practices.
              </p>
              <div class="flex gap-2 justify-end">
                <div class="bits-btn">
                  <Button variant="ghost" onclick={() => (modalOpen = false)} size="default"> // Changed Btn to Button
                    Cancel
                  </Button>
                </div>
                <div class="bits-btn">
                  <Button onclick={() => (modalOpen = false)} variant="default" size="default"> // Changed Btn to Button
                    Acknowledge
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        </div>
      </div>
      <!-- Input components -->
      <div class="nes-container">
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4 text-crimson">Input Components</h3>
          <div class="space-y-3">
            <Input label="Case Title" placeholder="Enter case title..." />
            <Input label="Evidence ID" type="search" placeholder="Search evidence..." />
            <Input label="Error Example" error="This field is required" placeholder="Input with error..." />
          </div>
        </div>
      </div>
    </div>
  </section>
  <!-- Application Layout Demo -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-4 text-gold">Application Layout</h2>
    <div class="h-[600px] border border-nier-border rounded-lg overflow-hidden">
      {@render LayoutDemo()}
    </div>
  </section>
  <!-- Integration Status -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-4 text-gold">Integration Status</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {@render StatusCard({
        title: 'Svelte 5 Runes',
        status: 'active',
        description: 'Using $state and $props',
      })}
      {@render StatusCard({
        title: 'Bits UI',
        status: 'active',
        description: 'Headless components integrated',
      })}
      {@render StatusCard({
        title: 'Vector Search',
        status: 'active',
        description: 'Qdrant + PostgreSQL ready',
      })}
      {@render StatusCard({
        title: 'UnoCSS',
        status: 'active',
        description: 'Utility classes configured',
      })}
    </div>
  </section>
</div>
{#snippet StatusCard({ title, status, description }: { title: string; status: string; description?: string })}
  <!-- changed: use data-variant (not unknown HTML prop: "variant") -->
  <div data-variant="interactive" class="nes-container">
    <div class="p-4 text-center">
      <div
        class={ "w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center " + (status === 'active'
          ? 'bg-green-500/20'
          : 'bg-red-500/20') }
      >
        {#if status === 'active'}
          <!-- replaced ShieldCheck component with emoji fallback -->
          <span class="text-green-400">🛡️</span>
        {:else}
          <!-- replaced FileQuestion component with emoji fallback -->
          <span class="text-red-400">❓</span>
        {/if}
      </div>
      <h3 class="font-semibold text-nier-white">{title}</h3>
      <p class="text-sm text-nier-text-muted mt-1">{description}</p>
      <span
        class={ "inline-block mt-2 px-2 py-1 text-xs rounded: " + (status === 'active'
          ? 'bg-green-500/20 text-green-400'
          : 'bg-red-500/20 text-red-400') }
      >
        {status.toUpperCase()}
      </span>
    </div>
  </div>
{/snippet}
{#snippet LayoutDemo()}
  <div class="flex h-full bg-nier-bg">
    <!-- Sidebar -->
    <aside class="w-64 bg-nier-surface border-r border-nier-border p-4">
      <div class="mb-6">
        <h2 class="text-xl font-bold text-nier-accent">⚖️ DEEDS</h2>
      </div>
      <nav class="space-y-2">
        {#each [{ iconEmoji: '📊', label: 'Dashboard' }, { iconEmoji: '📄', label: 'Cases' }, { iconEmoji: '⚖️', label: 'Evidence' }, { iconEmoji: '👥', label: 'Users' }] as item}
          <a href="/showcase" class="flex items-center gap-3 p-2 rounded hover:bg-nier-surface-light text-nier-text">
            <!-- render emoji icon instead of dynamic Svelte component -->
            <span class="w-5 h-5">{item.iconEmoji}</span>
            {item.label}
          </a>
        {/each}
      </nav>
    </aside>
    <!-- Main content -->
    <main class="flex-1 p-6">
      <h1 class="text-2xl font-bold text-nier-white mb-4">
        Welcome back, {layoutData.user.name}
      </h1>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {#each [{ title: 'Total Cases', value: layoutData.stats.totalCases, iconEmoji: '📄' }, { title: 'Open Cases', value: layoutData.stats.openCases, iconEmoji: '📄' }, { title: 'Closed Cases', value: layoutData.stats.closedCases, iconEmoji: '📄' }, { title: 'Evidence Items', value: layoutData.stats.evidenceCount, iconEmoji: '⚖️' }] as stat}
          <div class="nes-container">
            <div class="p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-nier-text-muted">{stat.title}</h4>
                <!-- render emoji safely -->
                <span class="w-5 h-5 text-nier-accent">{stat.iconEmoji}</span>
              </div>
              <p class="text-2xl font-bold text-nier-white">{stat.value}</p>
            </div>
          </div>
        {/each}
      </div>
      <div class="nes-container">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-nier-white mb-4">Recent Activity</h3>
          <div class="space-y-3">
            {#each Array.isArray(layoutData.recentActivity) ? layoutData.recentActivity : [] as activity}
              <div class="flex items-center gap-3 p-3 bg-nier-surface-light rounded">
                <div class="w-2 h-2 bg-nier-accent rounded-full"></div>
                <div>
                  <p class="font-medium text-nier-white">{activity.action}</p>
                  <!-- fixed typo: access details correctly -->
                  <p class="text-sm text-nier-text-muted">{(activity as { details?: string }).details}</p>
                </div>
                <span class="ml-auto text-xs text-nier-text-muted">{activity.time}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </main>
  </div>
{/snippet}

<style>
/* Enhanced Nier theme styles */
  :global(:root) {
    --nier-bg: #0a0a0a;
    --nier-surface: #1a1a1a;
    --nier-surface-light: #2a2a2a;
    --nier-border: #404040;
    --nier-text: #e5e5e5;
    --nier-text-muted: #9ca3af;
    --nier-accent: #f59e0b;
    --nier-accent-light: #fbbf24;
  }
  .nier-text-glow {
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
  }
  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 0.25rem;
  }
  .status-case {
    background-color: rgb(59 130 246 / 0.2);
    color: rgb(96 165 250);
  }
  .status-evidence {
    background-color: rgb(168 85 247 / 0.2);
    color: rgb(196 181 253);
  }
  .status-criminal {
    background-color: rgb(239 68 68 / 0.2);
    color: rgb(248 113 113);
  }
  .status-document {
    background-color: rgb(107 114 128 / 0.2);
    color: rgb(156 163 175);
  }
  .status-default {
    background-color: rgb(107 114 128 / 0.2);
    color: rgb(156 163 175);
  }
</style>