<script lang="ts">
</script>
  interface Props {
    menu: any
  }
  let {
    menu
  } = $props();



  </script>

<div 
  use:menu 
  class="space-y-4"
  
>
  <slot></slot>
</div>

