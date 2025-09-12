<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
  

  interface Props {
    onclose?: (event?: unknown) => void;
  }


  import { aiService } from '$lib/services/aiService';
  import * as Dialog from '$lib/components/ui/dialog';
  import Button from "$lib/components/ui/button";
  // Badge replaced with span - not available in enhanced-bits
  import { Sparkles, Copy, X, AlertCircle, Check } from 'lucide-svelte';
  let copied = $state(false);

  // Use the Svelte store reactively
  let summary = $derived($aiService.summary);
  let isLoading = $derived($aiService.isLoading);
  let error = $derived($aiService.error);
  let model = $derived($aiService.model);
  let lastSummarizedContent = $derived($aiService.lastSummarizedContent);
  let isOpen = $derived(isLoading || summary !== null || error !== null);

  async function copyToClipboard() {
    if (summary) {
      try {
        await navigator.clipboard.writeText(summary);
        copied = true;
        setTimeout(() => copied = false, 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
  }}}
  function closeModal() {
    aiService.reset();
    onclose?.();
  }
</script>

<Dialog.Root open={isOpen} close={closeModal}>
  <Dialog.Content size="lg">
  <Dialog.Header>
    <Dialog.Title>AI Summary</Dialog.Title>
    <Dialog.Description>AI-generated summary of your content</Dialog.Description>
  </Dialog.Header>

  <div class="space-y-4">
    {#if isLoading}
      <!-- Loading State -->
      <div class="space-y-4">
        <div class="space-y-4">
          <div class="space-y-4"></div>
          <span class="space-y-4">Analyzing content...</span>
        </div>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="space-y-4">
        <div class="space-y-4">
          <AlertCircle class="space-y-4" />
          <span class="space-y-4">AI Error</span>
        </div>
        <p class="space-y-4">{error}</p>
      </div>
    {:else if summary}
      <!-- Summary Content -->
      <div class="space-y-4">
        <div class="space-y-4">
          <Button class="bits-btn" onclick={() => copyToClipboard()} variant="ghost" size="sm" aria-label="Copy summary to clipboard">
            <Copy class="w-4 h-4" />
            <span>Copy</span>
          </Button>
          {#if copied}
            <span class="inline-flex items-center gap-1"><Check class="w-4 h-4" />Copied!</span>
          {/if}
        </div>
        <div class="space-y-4">
          {summary}
        </div>
        {#if lastSummarizedContent}
          <div class="space-y-4">
            <span class="space-y-4">Source:</span> {lastSummarizedContent}
          </div>
        {/if}
      </div>
    {:else}
      <div class="space-y-4">No summary available.</div>
    {/if}
  </div>

  <Dialog.Footer>
    <Dialog.Close asChild>
      <Button class="bits-btn" onclick={() => closeModal()} variant="secondary" aria-label="Close summary modal">
        <X class="space-y-4" />
        <span class="space-y-4">Close</span>
      </Button>
    </Dialog.Close>
  </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  /* @unocss-include */
  .prose {
    max-width: none;
}
</style>

