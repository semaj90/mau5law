<!-- Recommendation Container - Bits-UI Integration Under Nav-Bar -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import * as Collapsible from 'bits-ui/collapsible';
  import * as Card from 'bits-ui/card';
  import * as Badge from 'bits-ui/badge';
  import RetroRecommendationModal from './modals/RetroRecommendationModal.svelte';

  interface Props {
    consoleStyle?: 'nes' | 'snes' | 'n64' | 'ps1' | 'ps2' | 'yorha';
    position?: 'under-nav' | 'floating' | 'sidebar';
    showContainer?: boolean;
    autoHide?: boolean;
    recommendations?: Array<{
      id: string;
      type: 'detective' | 'legal' | 'evidence' | 'ai';
      title: string;
      description: string;
      confidence: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
      action?: () => void;
    }>;
  }

  let {
    consoleStyle = 'n64',
    position = 'under-nav',
    showContainer = $bindable(true),
    autoHide = true,
    recommendations = []
  }: Props = $props();

  // State management
  let isOpen = $state(false);
  let showModal = $state(false);
  let selectedRecommendations = $state([]);
  let containerRef: HTMLDivElement;
  let hideTimer: number;

  // Recommendation categories with icons
  const categoryIcons = {
    detective: '🕵️',
    legal: '⚖️',
    evidence: '📋',
    ai: '🤖'
  };

  const priorityColors = {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#EF4444',
    critical: '#DC2626'
  };

  // Group recommendations by type
  let groupedRecommendations = $derived(() => {
    const groups = recommendations.reduce((acc, rec) => {
      if (!acc[rec.type]) acc[rec.type] = [];
      acc[rec.type].push(rec);
      return acc;
    }, {} as Record<string, typeof recommendations>);

    // Sort by priority within each group
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    });

    return groups;
  });

  // Critical recommendations count
  let criticalCount = $derived(
    recommendations.filter(r => r.priority === 'critical').length
  );

  let highCount = $derived(
    recommendations.filter(r => r.priority === 'high').length
  );

  function openModal(type?: string) {
    selectedRecommendations = type 
      ? groupedRecommendations[type] || []
      : recommendations;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    selectedRecommendations = [];
  }

  function toggleContainer() {
    isOpen = !isOpen;
    if (hideTimer) clearTimeout(hideTimer);
  }

  function handleMouseEnter() {
    if (hideTimer) clearTimeout(hideTimer);
    if (autoHide && !isOpen) {
      isOpen = true;
    }
  }

  function handleMouseLeave() {
    if (autoHide && isOpen) {
      hideTimer = setTimeout(() => {
        isOpen = false;
      }, 2000);
    }
  }

  // Auto-show for critical recommendations
  $effect(() => {
    if (criticalCount > 0 && showContainer) {
      isOpen = true;
      if (hideTimer) clearTimeout(hideTimer);
    }
  });

  onDestroy(() => {
    if (hideTimer) clearTimeout(hideTimer);
  });
</script>

{#if showContainer && recommendations.length > 0}
  <div 
    bind:this={containerRef}
    class="recommendation-container {position} {consoleStyle}"
    class:has-critical={criticalCount > 0}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    <Collapsible.Root bind:open={isOpen} class="w-full">
      <!-- Trigger/Header -->
      <Collapsible.Trigger asChild let:builder>
        <button 
          use:builder.action 
          {...builder}
          class="container-trigger"
          onclick={toggleContainer}
        >
          <div class="trigger-content">
            <div class="trigger-left">
              <span class="trigger-icon">🎯</span>
              <span class="trigger-title">AI Recommendations</span>
              {#if criticalCount > 0}
                <Badge.Root class="critical-badge" variant="destructive">
                  {criticalCount}
                </Badge.Root>
              {/if}
              {#if highCount > 0}
                <Badge.Root class="high-badge" variant="secondary">
                  {highCount}
                </Badge.Root>
              {/if}
            </div>
            <div class="trigger-right">
              <span class="trigger-count">{recommendations.length}</span>
              <span class="trigger-arrow" class:rotated={isOpen}>▼</span>
            </div>
          </div>
        </button>
      </Collapsible.Trigger>

      <!-- Collapsible Content -->
      <Collapsible.Content class="collapsible-content">
        <div 
          class="recommendations-grid"
          transition:fly={{ y: -20, duration: 300, easing: quintOut }}
        >
          {#each Object.entries(groupedRecommendations) as [type, recs]}
            <Card.Root class="recommendation-card {type}">
              <Card.Header class="card-header">
                <div class="card-title">
                  <span class="type-icon">{categoryIcons[type]}</span>
                  <span class="type-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <Badge.Root variant="outline" class="count-badge">
                    {recs.length}
                  </Badge.Root>
                </div>
              </Card.Header>
              
              <Card.Content class="card-content">
                <div class="recommendations-preview">
                  {#each recs.slice(0, 3) as rec}
                    <div class="rec-preview-item">
                      <div 
                        class="priority-dot {rec.priority}"
                        style:background-color={priorityColors[rec.priority]}
                      ></div>
                      <span class="rec-preview-text">{rec.title}</span>
                      <span class="rec-confidence">{(rec.confidence * 100).toFixed(0)}%</span>
                    </div>
                  {/each}
                  
                  {#if recs.length > 3}
                    <div class="more-indicator">
                      +{recs.length - 3} more...
                    </div>
                  {/if}
                </div>
                
                <div class="card-actions">
                  <button 
                    class="view-all-btn"
                    onclick={() => openModal(type)}
                  >
                    View All
                  </button>
                  {#if recs[0]}
                    <button 
                      class="quick-action-btn {recs[0].priority}"
                      onclick={() => recs[0].action?.()}
                    >
                      Quick Action
                    </button>
                  {/if}
                </div>
              </Card.Content>
            </Card.Root>
          {/each}

          <!-- View All Recommendations -->
          <Card.Root class="view-all-card">
            <Card.Content class="view-all-content">
              <button 
                class="view-all-recommendations"
                onclick={() => openModal()}
              >
                <span class="view-all-icon">📋</span>
                <span class="view-all-text">View All Recommendations</span>
                <span class="view-all-count">({recommendations.length})</span>
              </button>
            </Card.Content>
          </Card.Root>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  </div>
{/if}

<!-- Retro Modal -->
<RetroRecommendationModal
  bind:show={showModal}
  {consoleStyle}
  recommendations={selectedRecommendations}
  title="System Recommendations"
  onClose={closeModal}
  sound={true}
/>

<style>
  .recommendation-container {
    position: fixed;
    top: 60px; /* Adjust based on your nav-bar height */
    left: 50%;
    transform: translateX(-50%);
    width: min(95vw, 1200px);
    z-index: 100;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  }

  .recommendation-container.floating {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    transform: none;
  }

  .recommendation-container.sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    width: 300px;
    height: calc(100vh - 60px);
    transform: none;
    border-radius: 0 12px 0 0;
  }

  .recommendation-container.has-critical {
    border-color: #EF4444;
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { 
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3); 
    }
    50% { 
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6); 
    }
  }

  /* Console-specific styling */
  .recommendation-container.nes {
    border-radius: 0;
    border-width: 4px;
    border-style: outset;
    image-rendering: pixelated;
  }

  .recommendation-container.snes {
    border-radius: 16px;
    border-style: ridge;
  }

  .recommendation-container.n64 {
    background: linear-gradient(135deg, rgba(30, 58, 138, 0.9), rgba(55, 48, 163, 0.9));
    border-color: #60A5FA;
  }

  .recommendation-container.ps1 {
    border-radius: 8px;
    border-style: groove;
    background: rgba(31, 41, 55, 0.9);
  }

  .recommendation-container.ps2 {
    border-radius: 20px;
    background: radial-gradient(circle, rgba(30, 64, 175, 0.9), rgba(30, 58, 138, 0.9));
  }

  .recommendation-container.yorha {
    border-radius: 0;
    border-color: #D4AF37;
    background: linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(45, 45, 45, 0.95));
  }

  .container-trigger {
    width: 100%;
    padding: 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .container-trigger:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .trigger-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
  }

  .trigger-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .trigger-icon {
    font-size: 1.5rem;
  }

  .trigger-title {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .trigger-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .trigger-count {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .trigger-arrow {
    transition: transform 0.2s;
    font-size: 0.8rem;
  }

  .trigger-arrow.rotated {
    transform: rotate(180deg);
  }

  .critical-badge {
    background: #EF4444;
    animation: pulse 1.5s infinite;
  }

  .high-badge {
    background: #F59E0B;
  }

  .collapsible-content {
    overflow: hidden;
  }

  .recommendations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    padding: 1rem;
  }

  .recommendation-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .recommendation-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  .recommendation-card.detective {
    border-left: 4px solid #8B5CF6;
  }

  .recommendation-card.legal {
    border-left: 4px solid #10B981;
  }

  .recommendation-card.evidence {
    border-left: 4px solid #F59E0B;
  }

  .recommendation-card.ai {
    border-left: 4px solid #3B82F6;
  }

  .card-header {
    padding: 1rem 1rem 0.5rem 1rem;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-weight: 600;
  }

  .type-icon {
    font-size: 1.2rem;
  }

  .card-content {
    padding: 0.5rem 1rem 1rem 1rem;
  }

  .recommendations-preview {
    margin-bottom: 1rem;
  }

  .rec-preview-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }

  .priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .rec-preview-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rec-confidence {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .more-indicator {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    font-style: italic;
    padding: 0.25rem 0;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
  }

  .view-all-btn, .quick-action-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .view-all-btn {
    background: rgba(59, 130, 246, 0.8);
    color: white;
  }

  .view-all-btn:hover {
    background: rgba(59, 130, 246, 1);
  }

  .quick-action-btn {
    background: rgba(16, 185, 129, 0.8);
    color: white;
  }

  .quick-action-btn:hover {
    background: rgba(16, 185, 129, 1);
  }

  .quick-action-btn.critical {
    background: rgba(239, 68, 68, 0.8);
  }

  .quick-action-btn.critical:hover {
    background: rgba(239, 68, 68, 1);
  }

  .quick-action-btn.high {
    background: rgba(245, 158, 11, 0.8);
  }

  .quick-action-btn.high:hover {
    background: rgba(245, 158, 11, 1);
  }

  .view-all-card {
    background: rgba(255, 255, 255, 0.03);
    border: 2px dashed rgba(255, 255, 255, 0.2);
  }

  .view-all-content {
    padding: 1rem;
  }

  .view-all-recommendations {
    width: 100%;
    padding: 1rem;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .view-all-recommendations:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .view-all-icon {
    font-size: 1.2rem;
  }

  .view-all-count {
    opacity: 0.7;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .recommendation-container.under-nav {
      top: 50px;
      width: 95vw;
    }
    
    .recommendations-grid {
      grid-template-columns: 1fr;
    }
  }
</style>