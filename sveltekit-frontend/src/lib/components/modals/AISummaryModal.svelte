<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
  export let onclose: ((event?: unknown) => void) | undefined;

  import { aiService } from '$lib/services/aiService';
  import * as Dialog from '$lib/components/ui/dialog';
  import Button from '$lib/components/ui/button';
  import { Sparkles, Copy, X, AlertCircle, Check } from 'lucide-svelte';

  // Destructure expected stores / helpers from aiService (adjust if aiService exports differently)
  const { summary, isLoading, error, model, lastSummarizedContent, reset } = aiService as any;

  let copied = false;

  // reactive derived open state
  $: isOpen = $isLoading || $summary != null || $error != null;

  async function copyToClipboard() {
    if ($summary) {
      try {
        await navigator.clipboard.writeText($summary);
        copied = true;
        setTimeout(() => (copied = false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  }

  function closeModal() {
    // call reset if provided, otherwise fallback to aiService.reset()
    if (typeof reset === 'function') reset();
    onclose?.();
  }
</script>

<Dialog.Root {isOpen} on:close={closeModal}>
  <Dialog.Content size="lg">
    <Dialog.Header>
      <Dialog.Title>AI Summary</Dialog.Title>
      <Dialog.Description>AI-generated summary of your content</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      {#if $isLoading}
        <!-- Loading State -->
        <div class="space-y-4">
          <span>Analyzing content...</span>
        </div>
      {:else if $error}
        <!-- Error State -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <AlertCircle />
            <span>AI Error</span>
          </div>
          <p>{$error}</p>
        </div>
      {:else if $summary}
        <!-- Summary Content -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Button class="bits-btn" on:click={copyToClipboard} variant="ghost" size="sm" aria-label="Copy summary to clipboard">
                <Copy class="w-4 h-4" />
                <span>Copy</span>
              </Button>
              {#if copied}
                <span class="inline-flex items-center gap-1"><Check class="w-4 h-4" />Copied!</span>
              {/if}
            </div>
          </div>

          <div class="prose">
            {@html $summary}
          </div>

          {#if $lastSummarizedContent}
            <div>
              <strong>Source:</strong> {$lastSummarizedContent}
            </div>
          {/if}
        </div>
      {:else}
        <div>No summary available.</div>
      {/if}
    </div>

    <Dialog.Footer>
      <Dialog.Close asChild>
        <Button class="bits-btn" on:click={closeModal} variant="secondary" aria-label="Close summary modal">
          <X />
          <span>Close</span>
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