<script lang="ts">
  // Svelte 5 runes are auto-imported
  /**
   * Intelligent Renderer: Decides between regular DOM and canvas
   * 90% regular Enhanced-Bits + NES.css, 10% gaming LOD for glyph-heavy processes
   */
  import { onMount } from 'svelte';
  import { LegalAILogic, type EvidenceItem, type LegalDocument } from '$lib/core/logic/legal-ai-logic';
  // Import your existing components
  import * as Card from '$lib/components/ui/card';
  import Button from '$lib/components/ui/Button.svelte';
  // Gaming LOD components (create when needed)
  import GlyphEngineRenderer from './GlyphEngineRenderer.svelte';
  // Props - single source of truth
  interface Props {
    data: {
      documents?: LegalDocument[];
      evidence?: EvidenceItem[];
      textContent?: string;
      interactiveElements?: number;
      realTimeUpdates?: boolean;
    };
    type: 'evidence-card' | 'document-viewer' | 'chat-interface' | 'case-timeline';
    title?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
  }
  let { data, type, title = '', priority = 'medium' }: Props = $props();
  // Intelligent rendering decision
  let useGlyphEngine = $derived(LegalAILogic.requiresGlyphEngine(data));
  // Process data with pure logic
  let processedData = $derived((() => {
    if ((data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).evidence) {
      return LegalAILogic.categorizeEvidence.evidence);
    }
    if ((data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).documents && (data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).documents.length > 0) {
      return LegalAILogic.processDocument.documents[0]);
    }
    return data;
  })();
  function handleInteraction(event: CustomEvent) {
    // Pure event handling logic
    console.log('User interaction:', event.detail);
  }
</script>
<!--
  Intelligent Decision: Use regular DOM (90% of cases) or canvas (10% for heavy processes)
-->
{#if useGlyphEngine}
  <!-- Gaming LOD: Use canvas for glyph-heavy processes -->
  <div class="glyph-engine-container gaming-transition" role="application">
    <GlyphEngineRenderer
      {data}
      {type}
      {title}
      {priority}
      onInteract={handleInteraction}
    />
  </div>
{:else}
  <!-- Regular Enhanced-Bits + NES.css UI (90% of app) -->
  <Card class="enhanced-bits-nier-bits-card legal-case-priority-{priority} gaming-transition gaming-hover nes-container">
    <CardHeader class="nes-container">
      <CardTitle class="nes-text text-yorha-white nes-container">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 nes-container">
      {#if type === 'evidence-card' && (data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).evidence}
        <!-- Regular DOM evidence display -->
        <div class="grid gap-2">
          {#each (data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).evidence as item}
            <div class="enhanced-bits-nier-bits-card p-3 border-l-4 border-n64-blue">
              <div class="flex justify-between items-center">
                <span class="nes-text text-sm">{(item as { title?: unknown; priority?: unknown; confidence?: unknown }).title}</span>
                <span class="nes-badge is-{(item as { title?: unknown; priority?: unknown; confidence?: unknown }).priority}">{(item as { title?: unknown; priority?: unknown; confidence?: unknown }).confidence}%</span>
              </div>
            </div>
          {/each}
        </div>
      {:else if type === 'document-viewer' && (data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).documents}
        <!-- Regular DOM document display -->
        <div class="space-y-3">
          {#each (data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).documents as doc}
            <div class="enhanced-bits-nier-bits-card p-4">
              <h3 class="nes-text font-bold mb-2">{doc.title}</h3>
              <p class="text-yorha-white text-sm">{doc.content.slice(0, 200)}...</p>
              <div class="mt-2 flex justify-between">
                <span class="nes-text text-xs">Confidence: {doc.confidence}%</span>
                <Button class="enhanced-bits-button is-small" onclick={handleInteraction}>
Analyze
              </div>
            </div>
          {/each}
        </div>
      {:else if type === 'chat-interface'}
        <!-- Regular DOM chat (unless real-time heavy processing) -->
        <div class="enhanced-bits-nier-bits-card p-4 bg-yorha-black">
          <div class="nes-text text-yorha-white">
            💬 Legal AI Assistant
          </div>
          {#if (data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).textContent}
            <p class="mt-2 text-sm text-yorha-white">{(data as { evidence?: unknown; documents?: unknown; textContent?: unknown }).textContent}</p>
          {/if}
        </div>
      {:else}
        <!-- Default regular DOM display -->
        <div class="enhanced-bits-nier-bits-card p-4">
          <div class="nes-text text-center text-yorha-white">
            📁 Legal Data Display
          </div>
        </div>
      {/if}
      <!-- Always show action buttons in regular DOM -->
      <div class="flex gap-2 mt-4">
        <Button
          class="enhanced-bits-button nes-btn is-primary gaming-transition"
          onclick={handleInteraction}
        >
Process
        <Button
          class="enhanced-bits-button nes-btn gaming-transition"
          variant="ghost"
          onclick={handleInteraction}
        >
Details
      </div>
    </CardContent>
  </Card>
{/if}
<style>
  /* Import hybrid theme */
  @import '$lib/styles/hybrid-theme.css';
</style>