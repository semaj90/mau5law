<script lang="ts">
  import { Button } from '../components/ui/wrappers/bits/Button.svelte';
  const { onclick } = $props<{ onclick: ((e: MouseEvent) }>()
  const { disabled } = $props<{ disabled: boolean }>()
  const { label } = $props<{ label: string }>()
</script>

<Button {onclick} {disabled}>{label}</Button>
