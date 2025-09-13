<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    class?: string;
  }
  let { class: className = '' }: Props = $props();
</script>

<div class="-mx-1 my-1 h-px bg-muted {className}"></div>

