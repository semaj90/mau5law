<script lang="ts">props.
  interface Props {
    number: number;
    [key: string]: any
  }

  let { ...props }: Props = $props();
</script>

<div class="{props.class}">{props.number}</div>
