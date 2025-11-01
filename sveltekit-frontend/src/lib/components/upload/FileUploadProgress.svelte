<script lang="ts">
  import { Badge } from '$lib/components/ui/Badge.svelte';
  import { default as Progress } from '$lib/components/ui/Progress.svelte';
  interface Props {
    progress?: number;
    fileName?: string;
    label?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'yorha' | 'legal' | 'evidence';
    status?: 'uploading' | 'completed' | 'error' | 'paused';
    showPercentage?: boolean;
  }
  let {
    progress = 0,
    fileName = '',
    label = 'Uploading file',
    variant = 'default',
    status = 'uploading',
    showPercentage = true,
  }: Props = $props();
  // Simplified derived values - no need for $derived.by()
  let progressVariant = $derived(
    status === 'completed'
      ? 'success'
      : status === 'error'
        ? 'error'
        : status === 'paused'
          ? 'warning'
          : variant === 'yorha'
            ? 'yorha'
            : variant === 'legal'
              ? 'legal'
              : 'info'
  );
  let badgeVariant = $derived(
    status === 'completed' ? 'success' : status === 'error' ? 'destructive' : status === 'paused' ? 'warning' : 'info'
  );
  let statusText = $derived(
    status === 'completed' ? 'Completed' : status === 'error' ? 'Failed' : status === 'paused' ? 'Paused' : 'Uploading'
  );
</script>
<div class="w-full nes-container" data-variant={variant}>
  <!-- File info header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <div class="i-lucide-file w-5 h-5 nes-text is-disabled" aria-hidden="true"></div>
      <div>
        <p class="font-medium text-sm">{fileName || 'Unknown file'}</p>
        <p class="text-xs nes-text is-disabled">{label}</p>
      </div>
    </div>
    <!-- Status Badge -->
    <Badge variant={badgeVariant} size="sm">
      {statusText}
    </Badge>
  </div>
  <!-- Progress Bar -->
  <Progress value={progress} variant={progressVariant} {showPercentage} size="default" class="mb-2" />
  <!-- Additional Info -->
  {#if status === 'error'}
    <p class="text-xs text-red-600 mt-2">Upload failed. Please try again.</p>
  {:else if status === 'completed'}
    <p class="text-xs text-green-600 mt-2">Upload completed successfully!</p>
  {:else if status === 'paused'}
    <p class="text-xs text-yellow-600 mt-2">Upload paused. Click to resume.</p>
  {/if}
</div>
