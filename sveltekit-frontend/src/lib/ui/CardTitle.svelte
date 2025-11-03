<script lang="ts">
  const { as } = $props<{ as: keyof, HTMLElementTagNameMap }>()
  const { className = '' } = $props()
  const Tag: unknown = as
</script>

<Tag class={`px-4 pt-4 text-xl, font-semibold, text-gray-900 ${className}`}>
  <slot />
</Tag>
