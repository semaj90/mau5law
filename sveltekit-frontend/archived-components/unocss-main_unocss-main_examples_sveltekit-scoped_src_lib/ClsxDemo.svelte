<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import Button from './Button.svelte';

  let underline = $state(false);
  let bold = $state(false);
  let italic = $state(false);
  let red = $state(false);
</script>

<p class={['p-3', { underline, 'font-bold': bold }, italic && 'italic']} class:c-red={red}>
  Demo text using clsx classes and <code>`class:`</code> directive
</p>

<button class="nes-btn" onclick={() => (underline = !underline)}>toggle underline</button>
<button class="nes-btn" onclick={() => (bold = !bold)}>toggle bold</button>
<button class="nes-btn" onclick={() => (italic = !italic)}>toggle italic</button>
<button class="nes-btn" onclick={() => (red = !red)}>toggle red</button>


