<script lang="ts">
  // Separate runtime import from type-only imports to avoid TS namespace/type conflicts
  import { LegalAILogic } from '$lib/core/logic/legal-ai-logic';
  import type { LegalDocument } from '$lib/core/logic/legal-ai-logic';

  // Local lightweight EvidenceItem type to avoid "Cannot use namespace ... as a type"
  // Keeps the minimal shape used by this component and allows extra fields.
  type EvidenceItemType = {
    id?: string;
    title?: string;
    confidence?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical' | string;
    [key: string]: any;
  };

  // Import your existing components
  import Button from '$lib/components/ui/bitsbutton.svelte';
  import GlyphEngineRenderer from './GlyphEngineRenderer.svelte';
  import * as Card from '$lib/components/ui/card';

  // Import hybrid theme as a global stylesheet to fix unused selector warnings
  // Use $lib alias so Vite/SvelteKit resolves the shared stylesheet reliably
  import '$lib/styles/hybrid-theme.css';

  // Safer constructor extraction with runtime fallback & warning
  const CardComponent: any = (Card as any).Root ?? (Card as any).default;
  if (!CardComponent)
    console.warn('Card component not found in $lib/components/ui/card. Check for a Root or default export.');

  const ButtonComponent: any = (Button && (Button as any).default) ?? Button;
  if (!ButtonComponent) console.warn('Button component not found at $lib/components/ui/bitsbutton.svelte');

  // Shared type for data prop
  type IntelligentRendererData = {
    documents?: LegalDocument[];
    evidence?: EvidenceItemType[];
    textContent?: string;
    interactiveElements?: number;
    realTimeUpdates?: boolean;
  };

  // Props using Svelte 5 syntax
  let {
    data = {
      documents: [],
      evidence: [],
      textContent: '',
      interactiveElements: 0,
      realTimeUpdates: false,
    },
    priority = 'medium',
    type = 'default',
    title = 'Legal AI Analysis',
  }: {
    data?: IntelligentRendererData;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    type?: 'evidence-card' | 'document-viewer' | 'chat-interface' | 'default';
    title?: string;
  } = $props();

  // Reactive intelligent rendering decision using Svelte 5
  let useGlyphEngine = $derived(
    Boolean(
      LegalAILogic &&
        typeof (LegalAILogic as any).requiresGlyphEngine === 'function' &&
        (LegalAILogic as any).requiresGlyphEngine(data)
    )
  );

  // Process data with pure logic using Svelte 5
  let processedData = $derived.by(() => {
    try {
      if (data?.evidence && LegalAILogic && typeof (LegalAILogic as any).categorizeEvidence === 'function') {
        return { ...data, evidence: (LegalAILogic as any).categorizeEvidence(data.evidence) ?? data.evidence };
      }
      if (
        data?.documents &&
        data.documents.length > 0 &&
        LegalAILogic &&
        typeof (LegalAILogic as any).processDocument === 'function'
      ) {
        const doc = (LegalAILogic as any).processDocument(data.documents[0]) ?? data.documents[0];
        return { ...data, documents: [doc] };
      }
    } catch (e) {
      // noop - fall back to raw data
    }
    return data;
  });

  // Accept either native DOM Events (e.g. click) or CustomEvent dispatched from components.
  function handleInteraction(event: (Event & { detail?: any }) | CustomEvent) {
    const detail = (event as any)?.detail ?? { type: (event as any)?.type ?? 'unknown' };
    // Pure event handling logic (safe logging)
    console.log('User interaction:', detail);
  }
</script>

<!--
  Intelligent Decision: Use regular DOM (90% of cases) or canvas (10% for heavy processes)
-->
{#if useGlyphEngine}
  <!-- Gaming LOD: Use canvas for glyph-heavy processes -->
  <div class="glyph-engine-container gaming-transition" role="application">
    <GlyphEngineRenderer {data} {type} {title} {priority} on:interact={handleInteraction} />
  </div>
{:else}
  <!-- Regular Enhanced-Bits + NES.css UI (90% of app) -->
  <svelte:component
    this={CardComponent}
    class={`enhanced-bits-nier-bits-card legal-case-priority-${priority} gaming-transition gaming-hover nes-container`}
  >
    <!-- Replaced CardHeader/CardTitle with semantic wrappers to avoid missing named exports -->
    <div class="card-header">
      <h3 class="card-title nes-text text-yorha-white">
        {title}
      </h3>
    </div>
    <div class="card-content space-y-4">
      {#if type === 'evidence-card' && processedData?.evidence}
        <!-- Regular DOM evidence display -->
        <div class="grid gap-2">
          {#each processedData.evidence as item}
            <div class="enhanced-bits-nier-bits-evidence-item p-3 border-l-4 border-n64-blue">
              <div class="flex justify-between items-center">
                <span class="nes-text text-sm">{(item as any).title}</span>
                <span class={`nes-badge is-${(item as any).priority ?? 'medium'}`}
                  >{(item as any).confidence ?? 0}%</span
                >
              </div>
            </div>
          {/each}
        </div>
      {:else if type === 'document-viewer' && processedData?.documents}
        <!-- Regular DOM document display -->
        <div class="space-y-3">
          {#each processedData.documents as doc}
            <div class="enhanced-bits-nier-bits-card p-4">
              <h3 class="nes-text font-bold mb-2">{(doc as any).title}</h3>
              <p class="text-yorha-white text-sm">{String((doc as any).content ?? '').slice(0, 200)}...</p>
              <div class="mt-2 flex justify-between">
                <span class="nes-text text-xs">Confidence: {(doc as any).confidence ?? 0}%</span>

                <svelte:component
                  this={ButtonComponent}
                  class="enhanced-bits-button is-small"
                  on:click={handleInteraction}
                >
                  Analyze
                </svelte:component>
              </div>
            </div>
          {/each}
        </div>
      {:else if type === 'chat-interface'}
        <!-- Regular DOM chat (unless real-time heavy processing) -->
        <div class="enhanced-bits-nier-bits-card p-4 bg-yorha-black">
          <div class="nes-text text-yorha-white">💬 Legal AI Assistant</div>
          {#if data?.textContent}
            <p class="mt-2 text-sm text-yorha-white">{data.textContent}</p>
          {/if}
        </div>
      {:else}
        <!-- Default regular DOM display: Render a summary of available data -->
        <div class="enhanced-bits-nier-bits-card p-4">
          <div class="nes-text text-center text-yorha-white">
            {#if processedData?.textContent}
              <p class="text-sm text-left">{processedData.textContent}</p>
            {:else if (processedData?.documents?.length ?? 0) > 0}
              <p>Contains {processedData.documents.length} document(s).</p>
            {:else if (processedData?.evidence?.length ?? 0) > 0}
              <p>Contains {processedData.evidence.length} evidence item(s).</p>
            {:else}
              <span>📁 No specific data to display.</span>
            {/if}
          </div>
        </div>
      {/if}
      <!-- Always show action buttons in regular DOM -->
      <div class="flex gap-2 mt-4">
        <svelte:component
          this={ButtonComponent}
          class="enhanced-bits-button nes-btn is-primary gaming-transition"
          on:click={handleInteraction}
        >
          Process
        </svelte:component>

        <svelte:component
          this={ButtonComponent}
          class="enhanced-bits-button nes-btn gaming-transition"
          variant="ghost"
          on:click={handleInteraction}
        >
          Details
        </svelte:component>
      </div>
    </div>
  </svelte:component>
{/if}

<!-- ...existing code... -->
<style>
  /* ...existing styles... */
  /* Minimal helper classes to align with previous Card subcomponents (if needed) */
  .card-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600,
  }
  .card-content {
    padding: 1rem;
  }

  /* Modifier class for inner evidence items to avoid nested card styling conflicts */
  .enhanced-bits-nier-bits-evidence-item {
    background: rgba(30, 34, 54, 0.85);
    border-radius: 0.5rem;
    margin-bottom: 0.25rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 0.75rem 1rem;
    border-left-width: 4px;
    border-left-style: solid;
  }
</style>
