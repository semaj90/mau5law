// Utility: accessibleClick
// Adds keyboard activation (Enter/Space) to non-button interactive elements.
// Usage: <div use:accessibleClick={handler} tabindex="0" role="button">...
// If you can, prefer just using <button>. This is for unavoidable structural cases.

export interface AccessibleClickOptions {
  onActivate: (event: KeyboardEvent | MouseEvent) => void;
  preventDefault?: boolean; // default true for Space key
}

export function accessibleClick(node: HTMLElement, opts: AccessibleClickOptions | ((e: MouseEvent | KeyboardEvent) => void)) {
  const options: AccessibleClickOptions = typeof opts === 'function' ? { onActivate: opts } : opts;

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (options.preventDefault !== false) e.preventDefault();
      options.onActivate(e);
    }
  }

  function handleClick(e: MouseEvent) {
    options.onActivate(e);
  }

  node.addEventListener('keydown', handleKey);
  node.addEventListener('click', handleClick);

  if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
  if (!node.getAttribute('role')) node.setAttribute('role', 'button');
  if (!node.getAttribute('aria-pressed')) node.setAttribute('aria-pressed', 'false');

  return {
    destroy() {
      node.removeEventListener('keydown', handleKey);
      node.removeEventListener('click', handleClick);
    }
  };
}
