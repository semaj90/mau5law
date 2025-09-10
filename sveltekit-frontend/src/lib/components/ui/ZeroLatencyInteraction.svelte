<script lang="ts">
</script>
  import { onMount, onDestroy } from 'svelte';
  import { chrRomService, getCachedPattern } from '$lib/services/chr-rom-precomputation-service';
  import { nesGPUBridge } from '$lib/gpu/nes-gpu-memory-bridge';

  interface Props {
    targetElementSelector?: string;
    interactionType?: 'hover' | 'click' | 'focus';
    patternPrefix?: string;
    fallbackApiEndpoint?: string;
    enableDebugMode?: boolean;
  }

  let {
    targetElementSelector = '[data-legal-id]',
    interactionType = 'hover',
    patternPrefix = 'summary',
    fallbackApiEndpoint = '/api/legal/summary',
    enableDebugMode = false
  }: Props = $props();

  // State
  let isInitialized = false;
  let currentTooltip: HTMLElement | null = null;
  let interactionStats = {
    totalInteractions: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    zeroLatencyHits: 0
  };

  // Interactive elements tracking
  let trackedElements = new Set<HTMLElement>();
  let mousePosition = { x: 0, y: 0 };

  onMount(() => {
    initializeZeroLatencySystem();
  });

  onDestroy(() => {
    cleanupSystem();
  });

  /**
   * Initialize the zero-latency interaction system
   */
  async function initializeZeroLatencySystem() {
    console.log('⚡ Initializing Zero-Latency UI Interaction System...');

    // Find all target elements and set up interaction handlers
    const targetElements = document.querySelectorAll(targetElementSelector);
    
    targetElements.forEach((element) => {
      setupElementInteractions(element as HTMLElement);
    });

    // Set up global mouse tracking for tooltip positioning
    document.addEventListener('mousemove', trackMousePosition);

    // Set up mutation observer to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.matches && element.matches(targetElementSelector)) {
              setupElementInteractions(element);
            }
            // Also check children
            const childElements = element.querySelectorAll?.(targetElementSelector);
            childElements?.forEach(child => setupElementInteractions(child as HTMLElement));
          }
        });
      });
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    isInitialized = true;
    console.log(`✅ Zero-latency system initialized for ${targetElements.length} elements`);
  }

  /**
   * Set up interaction handlers for a specific element
   */
  function setupElementInteractions(element: HTMLElement) {
    if (trackedElements.has(element)) return;

    const elementId = getElementId(element);
    if (!elementId) return;

    // Add to tracking set
    trackedElements.add(element);

    // Set up event handlers based on interaction type
    switch (interactionType) {
      case 'hover':
        element.addEventListener('mouseenter', (e) => handleZeroLatencyInteraction(e, elementId));
        element.addEventListener('mouseleave', hideTooltip);
        break;
      
      case 'click':
        element.addEventListener('click', (e) => handleZeroLatencyInteraction(e, elementId));
        break;
      
      case 'focus':
        element.addEventListener('focus', (e) => handleZeroLatencyInteraction(e, elementId));
        element.addEventListener('blur', hideTooltip);
        break;
    }

    // Add visual indicator that element has zero-latency capability
    element.classList.add('zero-latency-enabled');
    element.setAttribute('data-chr-rom-ready', 'true');
  }

  /**
   * Handle zero-latency interaction with CHR-ROM pattern lookup
   */
  async function handleZeroLatencyInteraction(event: Event, elementId: string) {
    const startTime = performance.now();
    const target = event.target as HTMLElement;
    
    interactionStats.totalInteractions++;

    try {
      // Step 1: Immediate CHR-ROM cache lookup (0ms response time)
      const patternId = `${patternPrefix}_${elementId}`;
      const chrRomPattern = nesGPUBridge.getCHRROMPattern(patternId);

      if (chrRomPattern) {
        // 🎯 ZERO LATENCY HIT! Display immediately from CHR-ROM
        const responseTime = performance.now() - startTime;
        interactionStats.cacheHits++;
        interactionStats.zeroLatencyHits++;
        
        showInstantTooltip(chrRomPattern.renderableHTML, target, responseTime);
        
        if (enableDebugMode) {
          console.log(`⚡ ZERO LATENCY: ${patternId} displayed in ${responseTime.toFixed(3)}ms from CHR-ROM bank ${chrRomPattern.bankId}`);
        }
        
        return;
      }

      // Step 2: Check pre-computation service cache
      const cachedPattern = await getCachedPattern(patternId);
      
      if (cachedPattern) {
        // Fast cache hit from pre-computation service
        const responseTime = performance.now() - startTime;
        interactionStats.cacheHits++;
        
        showInstantTooltip(cachedPattern.renderableHTML, target, responseTime);
        
        // Store in CHR-ROM for future zero-latency access
        await storeInCHRROM(patternId, cachedPattern);
        
        if (enableDebugMode) {
          console.log(`🚀 FAST CACHE: ${patternId} displayed in ${responseTime.toFixed(2)}ms from pre-computation cache`);
        }
        
        return;
      }

      // Step 3: Cache miss - fall back to API call
      await handleCacheMiss(elementId, target, startTime);

    } catch (error) {
      console.warn('Zero-latency interaction failed:', error);
      await handleCacheMiss(elementId, target, startTime);
    }
  }

  /**
   * Handle cache miss with API fallback
   */
  async function handleCacheMiss(elementId: string, target: HTMLElement, startTime: number) {
    interactionStats.cacheMisses++;
    
    try {
      // Show loading indicator
      showLoadingTooltip(target);
      
      // Make API call
      const apiResponse = await fetch(`${fallbackApiEndpoint}/${elementId}`);
      const data = await apiResponse.json();
      
      const responseTime = performance.now() - startTime;
      
      // Generate HTML from API response
      const html = generateTooltipHTML(data);
      
      // Display result
      showInstantTooltip(html, target, responseTime);
      
      // Cache for future use in both pre-computation service and CHR-ROM
      await cacheApiResult(elementId, data, html);
      
      if (enableDebugMode) {
        console.log(`🔄 API FALLBACK: ${elementId} displayed in ${responseTime.toFixed(2)}ms via ${fallbackApiEndpoint}`);
      }
      
    } catch (error) {
      console.error('API fallback failed:', error);
      showErrorTooltip(target);
    }
  }

  /**
   * Show instant tooltip with CHR-ROM pattern
   */
  function showInstantTooltip(html: string, target: HTMLElement, responseTime: number) {
    hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'chr-rom-tooltip zero-latency-tooltip';
    tooltip.innerHTML = html;
    
    // Add performance indicator
    if (enableDebugMode) {
      const perfIndicator = document.createElement('div');
      perfIndicator.className = 'perf-indicator';
      perfIndicator.innerHTML = `⚡ ${responseTime < 1 ? '0ms' : responseTime.toFixed(1) + 'ms'}`;
      tooltip.appendChild(perfIndicator);
    }
    
    // Position tooltip
    positionTooltip(tooltip, target);
    
    // Add to DOM with zero-latency animation
    document.body.appendChild(tooltip);
    
    // Trigger instant appearance
    requestAnimationFrame(() => {
      tooltip.classList.add('visible');
    });
    
    currentTooltip = tooltip;
    
    // Update statistics
    updateStats(responseTime);
  }

  /**
   * Show loading tooltip for API calls
   */
  function showLoadingTooltip(target: HTMLElement) {
    hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'chr-rom-tooltip loading-tooltip';
    tooltip.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <span>Loading...</span>
      </div>
    `;
    
    positionTooltip(tooltip, target);
    document.body.appendChild(tooltip);
    
    requestAnimationFrame(() => {
      tooltip.classList.add('visible');
    });
    
    currentTooltip = tooltip;
  }

  /**
   * Show error tooltip
   */
  function showErrorTooltip(target: HTMLElement) {
    const html = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span>Failed to load content</span>
      </div>
    `;
    
    showInstantTooltip(html, target, 0);
  }

  /**
   * Hide current tooltip
   */
  function hideTooltip() {
    if (currentTooltip) {
      currentTooltip.classList.remove('visible');
      setTimeout(() => {
        if (currentTooltip) {
          currentTooltip.remove();
          currentTooltip = null;
        }
      }, 200);
    }
  }

  /**
   * Position tooltip relative to target element
   */
  function positionTooltip(tooltip: HTMLElement, target: HTMLElement) {
    const targetRect = target.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position above the target by default
    let top = targetRect.top + scrollY - 10;
    let left = targetRect.left + scrollX + (targetRect.width / 2);
    
    // Adjust if tooltip would go off screen
    const tooltipRect = tooltip.getBoundingClientRect();
    
    if (left - (tooltipRect.width / 2) < 10) {
      left = 10 + (tooltipRect.width / 2);
    }
    
    if (left + (tooltipRect.width / 2) > window.innerWidth - 10) {
      left = window.innerWidth - 10 - (tooltipRect.width / 2);
    }
    
    if (top - tooltipRect.height < 10) {
      // Position below instead
      top = targetRect.bottom + scrollY + 10;
    }
    
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left - (tooltipRect.width / 2)}px`;
    tooltip.style.zIndex = '10000';
  }

  /**
   * Track mouse position for tooltip positioning
   */
  function trackMousePosition(event: MouseEvent) {
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;
  }

  /**
   * Get element ID from data attributes
   */
  function getElementId(element: HTMLElement): string | null {
    return element.getAttribute('data-legal-id') ||
           element.getAttribute('data-case-id') ||
           element.getAttribute('data-document-id') ||
           element.id ||
           null;
  }

  /**
   * Store pattern in CHR-ROM for future zero-latency access
   */
  async function storeInCHRROM(patternId: string, pattern: any) {
    try {
      const chrRomPattern = {
        renderableHTML: pattern.renderableHTML,
        type: pattern.type || 'summary_card',
        priority: 4, // High priority for recently accessed patterns
        compressedData: new TextEncoder().encode(pattern.renderableHTML),
        bankId: 1 // Store in fast access bank
      };
      
      await nesGPUBridge.storeCHRROMPattern(patternId, chrRomPattern);
    } catch (error) {
      console.warn('Failed to store pattern in CHR-ROM:', error);
    }
  }

  /**
   * Cache API result for future use
   */
  async function cacheApiResult(elementId: string, data: any, html: string) {
    try {
      // Store in CHR-ROM
      const chrRomPattern = {
        renderableHTML: html,
        type: 'summary_card',
        priority: 3,
        compressedData: new TextEncoder().encode(html),
        bankId: 2
      };
      
      await nesGPUBridge.storeCHRROMPattern(`${patternPrefix}_${elementId}`, chrRomPattern);
      
      // Also store in pre-computation service for cross-session caching
      // This would integrate with the CHR-ROM service
      
    } catch (error) {
      console.warn('Failed to cache API result:', error);
    }
  }

  /**
   * Generate tooltip HTML from API data
   */
  function generateTooltipHTML(data: any): string {
    return `
      <div class="chr-rom-summary-card api-generated">
        <h4>Summary</h4>
        <p>${data.summary || data.content || 'No summary available'}</p>
        <div class="metadata">
          ${data.entities ? `<span class="entity-count">${data.entities.length} entities</span>` : ''}
          ${data.confidence ? `<span class="confidence">${(data.confidence * 100).toFixed(0)}% confidence</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Update interaction statistics
   */
  function updateStats(responseTime: number) {
    interactionStats.averageResponseTime = (
      (interactionStats.averageResponseTime * (interactionStats.totalInteractions - 1) + responseTime) /
      interactionStats.totalInteractions
    );
  }

  /**
   * Clean up system resources
   */
  function cleanupSystem() {
    document.removeEventListener('mousemove', trackMousePosition);
    hideTooltip();
    
    trackedElements.forEach(element => {
      element.classList.remove('zero-latency-enabled');
      element.removeAttribute('data-chr-rom-ready');
    });
    
    trackedElements.clear();
  }

  /**
   * Get current performance statistics
   */
  export function getPerformanceStats() {
    return {
      ...interactionStats,
      cacheHitRate: interactionStats.totalInteractions > 0 ? 
        (interactionStats.cacheHits / interactionStats.totalInteractions) * 100 : 0,
      zeroLatencyRate: interactionStats.totalInteractions > 0 ?
        (interactionStats.zeroLatencyHits / interactionStats.totalInteractions) * 100 : 0
    };
  }
</script>

<!-- Debug Panel -->
{#if enableDebugMode}
  <div class="zero-latency-debug-panel">
    <h4>⚡ Zero-Latency Stats</h4>
    <div class="debug-stats">
      <div class="stat">
        <span class="label">Total Interactions:</span>
        <span class="value">{interactionStats.totalInteractions}</span>
      </div>
      <div class="stat">
        <span class="label">Cache Hits:</span>
        <span class="value cache-hits">{interactionStats.cacheHits}</span>
      </div>
      <div class="stat">
        <span class="label">Zero-Latency Hits:</span>
        <span class="value zero-latency">{interactionStats.zeroLatencyHits}</span>
      </div>
      <div class="stat">
        <span class="label">Average Response:</span>
        <span class="value">{interactionStats.averageResponseTime.toFixed(2)}ms</span>
      </div>
      <div class="stat">
        <span class="label">Hit Rate:</span>
        <span class="value">
          {interactionStats.totalInteractions > 0 ? 
            ((interactionStats.cacheHits / interactionStats.totalInteractions) * 100).toFixed(1) : 0}%
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Zero-latency interaction styles */
  :global(.zero-latency-enabled) {
    position: relative;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  :global(.zero-latency-enabled::after) {
    content: '⚡';
    position: absolute;
    top: -2px;
    right: -2px;
    font-size: 10px;
    opacity: 0;
    color: #ffd700;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  :global(.zero-latency-enabled:hover::after) {
    opacity: 0.7;
  }

  :global(.zero-latency-enabled:hover) {
    background: rgba(255, 215, 0, 0.05);
    box-shadow: 0 0 4px rgba(255, 215, 0, 0.3);
  }

  /* CHR-ROM Tooltip Styles */
  :global(.chr-rom-tooltip) {
    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 12px;
    max-width: 300px;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 215, 0, 0.2);
    color: #e0e0e0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    opacity: 0;
    transform: translateY(-5px) scale(0.95);
    transition: all 0.15s cubic-bezier(0.2, 0, 0.2, 1);
    z-index: 10000;
  }

  :global(.chr-rom-tooltip.visible) {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  :global(.chr-rom-tooltip.zero-latency-tooltip) {
    border-color: #00ff41;
    box-shadow: 
      0 4px 20px rgba(0, 255, 65, 0.3),
      inset 0 1px 0 rgba(0, 255, 65, 0.2);
  }

  :global(.chr-rom-tooltip h4) {
    margin: 0 0 8px 0;
    color: #ffd700;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  :global(.chr-rom-tooltip p) {
    margin: 0 0 8px 0;
    color: #e0e0e0;
  }

  :global(.chr-rom-tooltip .metadata) {
    display: flex;
    gap: 8px;
    font-size: 10px;
    color: #b0b0b0;
  }

  :global(.chr-rom-tooltip .metadata span) {
    background: rgba(255, 215, 0, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }

  :global(.chr-rom-tooltip .perf-indicator) {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #00ff41;
    color: #000;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #000;
    box-shadow: 0 2px 8px rgba(0, 255, 65, 0.4);
  }

  :global(.chr-rom-tooltip .loading-content) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.chr-rom-tooltip .loading-spinner) {
    width: 12px;
    height: 12px;
    border: 2px solid #333;
    border-top: 2px solid #ffd700;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  :global(.chr-rom-tooltip .error-content) {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ff0041;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Debug Panel */
  .zero-latency-debug-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid #ffd700;
    border-radius: 6px;
    padding: 12px;
    color: #e0e0e0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    z-index: 9999;
    backdrop-filter: blur(10px);
  }

  .zero-latency-debug-panel h4 {
    margin: 0 0 8px 0;
    color: #ffd700;
    font-size: 12px;
    text-align: center;
  }

  .debug-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .stat .label {
    color: #b0b0b0;
  }

  .stat .value {
    font-weight: 600;
    color: #e0e0e0;
  }

  .stat .value.cache-hits {
    color: #00ff41;
  }

  .stat .value.zero-latency {
    color: #ffd700;
    font-weight: 700;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .zero-latency-debug-panel {
      top: 10px;
      right: 10px;
      left: 10px;
      font-size: 9px;
    }

    :global(.chr-rom-tooltip) {
      max-width: 250px;
      font-size: 11px;
    }
  }
</style>
