<script lang="ts">
</script>
  let {
    class: className = '',
    children,
    ...restProps
  } = $props();
</script>

<div class="text-sm [&_p]:leading-relaxed {className}" {...restProps}>
  <slot></slot>
</div>

