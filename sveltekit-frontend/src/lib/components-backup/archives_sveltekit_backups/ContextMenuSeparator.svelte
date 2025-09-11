<script lang="ts">
  interface Props {
    class_?: string;
  }

  let { class_ = '' }: Props = $props();
</script>

<div className="${1}"></div>

