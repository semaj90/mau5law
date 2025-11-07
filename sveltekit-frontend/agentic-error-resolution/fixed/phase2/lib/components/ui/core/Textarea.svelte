<script lang="ts">
  export let value: string = "";
  export let rows: number = 3;
  export let $$restProps: Record<string, any>;
</script>

<textarea bind:value rows={rows} {...$$restProps}></textarea>
