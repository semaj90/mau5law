<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';props.
  interface Props {
    number: number;
    [key: string]: any
  }

  let { ...props }: Props = $props();
</script>

<div class="{props.class}">{props.number}</div>
