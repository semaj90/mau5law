<!-- Re-export from textarea subdirectory -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import Textarea from './textarea/Textarea.svelte';
  // Re-export all props
  let { ...props  }: { ...props : any } = $props();
</script>

<Textarea {...props} />
