<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  // Props for customization
  let {
    title = '',
    description = '',
    status = 'active', // 'active', 'pending', 'completed'
    type = 'document', // 'document', 'video', 'witness', 'analysis'
    connections = 0,
    onclick = () => {},
    children,
    icon = undefined
  } = $props();
  // Visual effects state
  let isHovered = $state(false);
  let isSelected = $state(false);
  // Status colors matching Evidence Board
  let statusConfig = $derived(() => {
    switch (status) {
      case 'active':
        return { color: 'is-success', bgClass: 'bg-green-50', borderClass: 'border-green-400' };
      case 'pending':
        return { color: 'is-warning', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-400' };
      case 'completed':
        return { color: 'is-primary', bgClass: 'bg-blue-50', borderClass: 'border-blue-400' };
      default:
        return { color: 'is-dark', bgClass: 'bg-gray-50', borderClass: 'border-gray-400' };
    }
  });
  function handleClick() {
    isSelected = !isSelected;
    onclick();
  }
</script>
<!-- Evidence Card (matching Evidence Board style) -->
<div
  class="evidence-card nes-container is-rounded cursor-pointer transition-all duration-300 {statusConfig?.bgClass || 'bg-gray-50'} {statusConfig?.borderClass || 'border-gray-400'}"
  class:selected={isSelected}
  class:hovered={isHovered}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <!-- Card Header -->
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      {#if icon}
        <div class="p-1 rounded {statusConfig.bgClass}">
          {@render icon()}
        </div>
      {/if}
      <h3 class="nes-text {statusConfig.color} text-sm font-bold truncate">
        {title}
      </h3>
    </div>
    <!-- Status Badge -->
    <span class="nes-badge {statusConfig.color} text-xs">
      {status.toUpperCase()}
    </span>
  </div>
  <!-- Card Content -->
  {#if description}
    <p class="text-xs text-gray-600 mb-3 line-clamp-2">
      {description}
    </p>
  {/if}
  <!-- Custom Content -->
  {#if children}
    <div class="mb-3">
      {@render children()}
    </div>
  {/if}
  <!-- Card Footer -->
  <div class="flex items-center justify-between text-xs text-gray-500">
    <span class="flex items-center gap-1">
      <span class="w-2 h-2 rounded-full {statusConfig?.borderClass?.replace('border-', 'bg-') || 'bg-gray-400'}"></span>
      {type}
    </span>
    {#if connections > 0}
      <span class="nes-text is-primary">
        🔗 {connections} connections
      </span>
    {/if}
  </div>
  <!-- Hover/Selection Effects -->
  {#if isHovered || isSelected}
    <div class="absolute -inset-1 bg-blue-200 opacity-20 rounded-lg -z-10"></div>
  {/if}
</div>
<style>
  .evidence-card {
    position: relative;
    min-height: 120px;
    background: white;
    border-width: 3px;
    padding: 1rem;
  }
  .evidence-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
  .evidence-card.selected {
    border-width: 4px;
    box-shadow: 0 0 20px rgba(0,123,255,0.4);
  }
  .evidence-card.hovered {
    border-color: #007bff !important;
  }
  /* Connection lines effect */
  .evidence-card.selected::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -10px;
    width: 20px;
    height: 2px;
    background: #007bff;
    border-radius: 1px;
  }
  /* Truncate text with modern CSS fallbacks */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsi;
    /* Modern CSS fallback for browsers that don't support line-clamp */
    max-height: calc(1.2em * 2); /* Assuming line-height of 1.2 */
    line-height: 1.2;
    /* Container query support */
    @supports not (-webkit-line-clamp: 2) {
      max-height: 2.4em;
      overflow: hidden;
      position: relative;
    }
    /* Gradient fade for better UX */
    @supports not (-webkit-line-clamp: 2) {
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 3em;
        height: 1.2em;
        background: linear-gradient(to right, transparent, var(--background-color, white));
        pointer-events: none;
      }
    }
  }
</style>