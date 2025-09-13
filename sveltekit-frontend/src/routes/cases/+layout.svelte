<script lang="ts">
  import EnhancedLayout from '$lib/components/layout/EnhancedLayout.svelte';
  import type { LayoutData } from "./$types";
  import type { Snippet } from 'svelte';

  interface Props {
    data?: LayoutData;
    children?: Snippet;
  }

  let { data, children }: Props = $props();
</script>

<EnhancedLayout
  title="Legal Cases Management"
  variant="legal"
  showNavigation={true}
  showSidebar={true}
  user={data?.user}
>
  {#if children}
    {@render children()}
  {/if}
</EnhancedLayout>
