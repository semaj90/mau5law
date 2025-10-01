<script lang="ts">
  import Button from '../components/ui/wrappers/bits/Button.svelte';
  export let onclick: ((e: MouseEvent) => void) | undefined;
  export let disabled: boolean = false;
  export let label: string = '';
</script>

<Button {onclick} {disabled}>{label}</Button>
