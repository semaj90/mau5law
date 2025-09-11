<script lang="ts">

  import { Dialog } from 'bits-ui';
  // Props are defined as $props() rune, no import needed

  interface Props {
    trigger: any;
  }
  let { children,
    trigger
  }: Props = $props();
</script>

<button>
  {@render children?.()}
</button>

