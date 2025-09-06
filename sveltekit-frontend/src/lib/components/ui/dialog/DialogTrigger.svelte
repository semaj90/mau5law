<script lang="ts">

  import { melt } from 'melt';
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
