<script lang="ts">
</script>
  // Basic Label component
  export let for_: string = '';
  export let class_: string = '';
</script>

<label for={for_} className="${1}">
  <slot />
</label>

