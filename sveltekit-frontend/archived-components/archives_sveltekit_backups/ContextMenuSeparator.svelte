<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    class_?: string;
  }

  let { class_ = '' }: Props = $props();
</script>

<div className="${1}"></div>

