<script lang="ts">
  import 'nes.css/css/nes.min.css';

  import { Dialog } from 'bits-ui';
  // Props are defined as $props() rune, no import needed

  interface Props {
    trigger: unknown;
  }
  let { children,
    trigger
  }: Props = $props();
</script>

<button>
  {@render children?.()}
</button>

