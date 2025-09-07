/**
 * Svelte action: tooltip
 *
 * Usage in a Svelte component:
 * <button use:tooltip={{ text: 'Save', delay: 300 }}>Save</button>
 *
 * The action creates a lightweight, accessible tooltip element that appears
 * near the cursor and is cleaned up automatically.
 */

export type TooltipParams = {
  text?: string;
  delay?: number; // milliseconds before showing tooltip
};

export function tooltip(node: HTMLElement, params: TooltipParams = {}) {
  if (typeof window === 'undefined') {
    // no-op on server
    return { update: () => {}, destroy: () => {} };
  }

  let { text = '', delay = 0 } = params;
  let tooltipEl: HTMLDivElement | null = null;
  let showTimer: number | null = null;

  const createTooltip = (content: string) => {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.zIndex = '9999';
    tooltipEl.style.background = 'rgba(0,0,0,0.85)';
    tooltipEl.style.color = 'white';
    tooltipEl.style.padding = '6px 8px';
    tooltipEl.style.borderRadius = '4px';
    tooltipEl.style.fontSize = '12px';
    tooltipEl.style.lineHeight = '1';
    tooltipEl.style.transition = 'opacity 120ms ease, transform 120ms ease';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(6px)';
    tooltipEl.style.whiteSpace = 'nowrap';
    tooltipEl.textContent = content;
    document.body.appendChild(tooltipEl);
  };

  const updateTooltipContent = (content: string) => {
    if (tooltipEl) {
      tooltipEl.textContent = content;
    }
  };

  const removeTooltip = () => {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    if (!tooltipEl) return;
    tooltipEl.remove();
    tooltipEl = null;
    node.removeAttribute('aria-describedby');
  };

  const positionTooltip = (clientX: number, clientY: number) => {
    if (!tooltipEl) return;
    const padding = 8;
    const rect = tooltipEl.getBoundingClientRect();
    let left = clientX + 12;
    let top = clientY + 12;

    // Keep on screen horizontally
    if (left + rect.width + padding > window.innerWidth) {
      left = Math.max(padding, clientX - rect.width - 12);
    }

    // Keep on screen vertically
    if (top + rect.height + padding > window.innerHeight) {
      top = Math.max(padding, clientY - rect.height - 12);
    }

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  };

  const handleMouseEnter = (e: MouseEvent) => {
    if (!text) return;
    if (showTimer) window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => {
      createTooltip(text);
      if (tooltipEl) {
        tooltipEl.style.opacity = '1';
        tooltipEl.style.transform = 'translateY(0)';
        // link tooltip for accessibility
        const id = `svelte-tooltip-${Math.random().toString(36).slice(2, 9)}`;
        tooltipEl.id = id;
        node.setAttribute('aria-describedby', id);
        positionTooltip(e.clientX, e.clientY);
      }
      showTimer = null;
    }, delay);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (tooltipEl) {
      positionTooltip(e.clientX, e.clientY);
    }
  };

  const handleMouseLeave = () => {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.transform = 'translateY(6px)';
      // remove after transition
      const to = window.setTimeout(() => {
        removeTooltip();
        window.clearTimeout(to);
      }, 150);
    }
  };

  node.addEventListener('mouseenter', handleMouseEnter);
  node.addEventListener('mousemove', handleMouseMove);
  node.addEventListener('mouseleave', handleMouseLeave);
  node.addEventListener('focus', handleMouseEnter);
  node.addEventListener('blur', handleMouseLeave);

  return {
    update(newParams: TooltipParams) {
      text = newParams?.text ?? text;
      delay = newParams?.delay ?? delay;
      updateTooltipContent(text);
    },
    destroy() {
      removeTooltip();
      node.removeEventListener('mouseenter', handleMouseEnter);
      node.removeEventListener('mousemove', handleMouseMove);
      node.removeEventListener('mouseleave', handleMouseLeave);
      node.removeEventListener('focus', handleMouseEnter);
      node.removeEventListener('blur', handleMouseLeave);
    },
  };
}
