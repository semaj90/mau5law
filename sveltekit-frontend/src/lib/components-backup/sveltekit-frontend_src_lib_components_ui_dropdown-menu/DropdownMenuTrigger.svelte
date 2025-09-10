<script lang="ts">
</script>
  interface Props {
    trigger: any
  }
  let {
    trigger
  } = $props();



  </script>

<button use:trigger >
  <slot></slot>
</button>

