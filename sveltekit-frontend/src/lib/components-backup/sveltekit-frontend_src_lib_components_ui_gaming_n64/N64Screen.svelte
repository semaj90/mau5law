<script lang="ts">
  interface Props {
    content?: string;
  }

  let { content = 'Screen content' }: Props = $props();
</script>

<style>
  .screen { width:320px; height:240px; background:#000; color:#0f0; padding:8px; font-family:monospace }
</style>

<div class="screen">{content}</div>

