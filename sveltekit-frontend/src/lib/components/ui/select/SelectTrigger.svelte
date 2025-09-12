<script lang="ts">
  import { Select } from 'bits-ui';

  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
    [attr: string]: unknown;
  }

  let { children, class: className = '', ...rest }: Props = $props();
</script>

<Select.Trigger class="space-y-4 {className}" {...rest}>
  {@render children?.()}
  <!-- No <slot> usage to avoid slot/snippet conflict -->
</Select.Trigger>

<style>/* @unocss-include */ {}</style>
