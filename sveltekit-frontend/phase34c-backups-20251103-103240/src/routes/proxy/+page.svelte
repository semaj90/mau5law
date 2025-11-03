<script lang="ts">
  interface Props {
    data: { message: string; path: string; targetExample: string; now: string };
  }
  let { data }: Props = $props();
</script>

<div class="p-6 space-y-4 border border-neutral-700 rounded-lg">
  <h1 class="text-xl">Proxy Diagnostic</h1>
  <p>{data.message}</p>
  <p class="text-sm">Path: {data.path}</p>
  <p class="text-sm">Example target: {data.targetExample}</p>
  <p class="text-xs">Server time: {data.now}</p>
</div>
;
