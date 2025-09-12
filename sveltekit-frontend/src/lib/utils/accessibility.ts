
/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 * Ensures proper focus management, keyboard navigation, and screen reader support
 */

// Focus management
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  private static originalActiveElement: HTMLElement | null = null;

  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store the currently active element
    this.originalActiveElement = document.activeElement as HTMLElement;
    this.focusStack.push(container);

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }
  const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);

    // Return cleanup function
    return () => {
      container.removeEventListener("keydown", handleTabKey);
      this.focusStack.pop();

      // Restore focus to the previous element or the stored original element
      const previousContainer = this.focusStack[this.focusStack.length - 1];
      if (previousContainer) {
        const focusableInPrevious =
          this.getFocusableElements(previousContainer);
        focusableInPrevious[0]?.focus();
      } else if (this.originalActiveElement) {
        this.originalActiveElement.focus();
        this.originalActiveElement = null;
      }
    };
  }
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      (el) => {
        const element = el as HTMLElement;
        return (
          element.offsetWidth > 0 &&
          element.offsetHeight > 0 &&
          !element.hidden &&
          window.getComputedStyle(element).visibility !== "hidden"
        );
      }
    ) as HTMLElement[];
  }
  static setFocus(selector: string): void {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
      }
    } catch (error: any) {
      console.warn(`Failed to set focus on element: ${selector}`, error);
    }
  }
  static announceToScreenReader(
    message: string,
    priority: "polite" | "assertive" = "polite"
  ) {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.style.width = "1px";
    announcement.style.height = "1px";
    announcement.style.overflow = "hidden";

    document.body.appendChild(announcement);
    announcement.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Loading state announcement utilities
  static announceLoadingState(
    isLoading: boolean,
    loadingText: string = "Loading, please wait...",
    completedText: string = "Loading complete"
  ) {
    if (isLoading) {
      this.announceToScreenReader(loadingText, "polite");
    } else {
      this.announceToScreenReader(completedText, "polite");
    }
  }

  static announceFileUpload(stage: 'starting' | 'progress' | 'complete' | 'error', context?: string) {
    const messages = {
      starting: `File upload starting${context ? ` for ${context}` : ''}`,
      progress: `File upload in progress${context ? ` for ${context}` : ''}`,
      complete: `File upload completed successfully${context ? ` for ${context}` : ''}`,
      error: `File upload failed${context ? ` for ${context}` : ''}`
    };
    
    const priority = stage === 'error' ? 'assertive' : 'polite';
    this.announceToScreenReader(messages[stage], priority);
  }

  static announceProcessingState(
    stage: 'analyzing' | 'processing' | 'generating' | 'complete' | 'error',
    context?: string
  ) {
    const messages = {
      analyzing: `Analyzing${context ? ` ${context}` : ''}, please wait...`,
      processing: `Processing${context ? ` ${context}` : ''}, please wait...`,
      generating: `Generating${context ? ` ${context}` : ''}, please wait...`,
      complete: `Processing completed${context ? ` for ${context}` : ''}`,
      error: `Processing failed${context ? ` for ${context}` : ''}`
    };
    
    const priority = stage === 'error' ? 'assertive' : 'polite';
    this.announceToScreenReader(messages[stage], priority);
  }
}
// Keyboard navigation utilities
export class KeyboardNavigation {
  static handleArrowKeys(
    elements: HTMLElement[],
    currentIndex: number,
    key: string,
    orientation: "horizontal" | "vertical" = "horizontal"
  ): number {
    let newIndex = currentIndex;

    switch (key) {
      case "ArrowRight":
        if (orientation === "horizontal") {
          newIndex = (currentIndex + 1) % elements.length;
        }
        break;
      case "ArrowLeft":
        if (orientation === "horizontal") {
          newIndex =
            currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
        }
        break;
      case "ArrowDown":
        if (orientation === "vertical") {
          newIndex = (currentIndex + 1) % elements.length;
        }
        break;
      case "ArrowUp":
        if (orientation === "vertical") {
          newIndex =
            currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
        }
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = elements.length - 1;
        break;
    }
    if (newIndex !== currentIndex && elements[newIndex]) {
      elements[newIndex].focus();
    }
    return newIndex;
  }
  static createRovingTabIndex(container: HTMLElement, selector: string) {
    const elements = Array.from(
      container.querySelectorAll(selector)
    ) as HTMLElement[];
    let currentIndex = 0;

    // Set initial tabindex
    elements.forEach((el, index) => {
      el.setAttribute("tabindex", index === 0 ? "0" : "-1");
    });

  const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const index = elements.indexOf(target);

      if (index === -1) return;

      let handled = false;
  const newIndex = this.handleArrowKeys(elements, index, e.key);

      if (newIndex !== index) {
        handled = true;
        // Update tabindex
        elements[index].setAttribute("tabindex", "-1");
        elements[newIndex].setAttribute("tabindex", "0");
        currentIndex = newIndex;
      }
      if (handled) {
        e.preventDefault();
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }
}
// Color contrast utilities
export class ColorContrast {
  static getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }
  static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
  static meetsWCAG(
    color1: string,
    color2: string,
    level: "AA" | "AAA" = "AA"
  ): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return level === "AA" ? ratio >= 4.5 : ratio >= 7;
  }
  static suggestAccessibleColor(
    baseColor: string,
    backgroundColor: string,
    level: "AA" | "AAA" = "AA"
  ): string {
    if (this.meetsWCAG(baseColor, backgroundColor, level)) {
      return baseColor;
    }
    const rgb = this.hexToRgb(baseColor);
    if (!rgb) return baseColor;

    // Try darkening first
    for (let i = 0.1; i <= 1; i += 0.1) {
      const darkerColor = this.rgbToHex(
        Math.round(rgb.r * (1 - i)),
        Math.round(rgb.g * (1 - i)),
        Math.round(rgb.b * (1 - i))
      );
      if (this.meetsWCAG(darkerColor, backgroundColor, level)) {
        return darkerColor;
      }
    }
    // Try lightening
    for (let i = 0.1; i <= 1; i += 0.1) {
      const lighterColor = this.rgbToHex(
        Math.min(255, Math.round(rgb.r + (255 - rgb.r) * i)),
        Math.min(255, Math.round(rgb.g + (255 - rgb.g) * i)),
        Math.min(255, Math.round(rgb.b + (255 - rgb.b) * i))
      );
      if (this.meetsWCAG(lighterColor, backgroundColor, level)) {
        return lighterColor;
      }
    }
    return baseColor;
  }
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}
// ARIA utilities
export class AriaUtils {
  static generateId(prefix = "aria"): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
  static linkElements(
    trigger: HTMLElement,
    target: HTMLElement,
    relationship: string
  ) {
    const id = target.id || this.generateId();
    target.id = id;

    switch (relationship) {
      case "describedby":
        const describedBy = trigger.getAttribute("aria-describedby");
        trigger.setAttribute(
          "aria-describedby",
          describedBy ? `${describedBy} ${id}` : id
        );
        break;
      case "labelledby":
        const labelledBy = trigger.getAttribute("aria-labelledby");
        trigger.setAttribute(
          "aria-labelledby",
          labelledBy ? `${labelledBy} ${id}` : id
        );
        break;
      case "controls":
        trigger.setAttribute("aria-controls", id);
        break;
      case "owns":
        const owns = trigger.getAttribute("aria-owns");
        trigger.setAttribute("aria-owns", owns ? `${owns} ${id}` : id);
        break;
    }
  }
  static announceStateChange(element: HTMLElement, message: string) {
    const announcement = document.createElement("span");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.textContent = message;

    element.appendChild(announcement);

    setTimeout(() => {
      element.removeChild(announcement);
    }, 1000);
  }
}
// Reduced motion utilities
export class MotionUtils {
  static prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  static createResponsiveAnimation(
    element: HTMLElement,
    animation: Keyframe[] | PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions
  ): Animation | null {
    if (this.prefersReducedMotion()) {
      // Apply only the final state without animation
      const finalKeyframe = Array.isArray(animation)
        ? animation[animation.length - 1]
        : animation;
      Object.assign(element.style, finalKeyframe);
      return null;
    }
    return element.animate(animation, options);
  }
  static createReducedMotionCSS(): string {
    return `
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
}}
    `;
  }
}
// Error handling and validation
export class AccessibilityValidator {
  static validateForm(form: HTMLFormElement): string[] {
    const errors: string[] = [];

    // Check for labels
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      const element = input as HTMLElement;
      const hasLabel = this.hasLabel(element);
      const hasAriaLabel =
        element.hasAttribute("aria-label") ||
        element.hasAttribute("aria-labelledby");

      if (!hasLabel && !hasAriaLabel) {
        errors.push(
          `Input ${element.id || (element as any).name || "unknown"} is missing a label`
        );
      }
    });

    // Check for required field indicators
    const requiredInputs = form.querySelectorAll("[required]");
    requiredInputs.forEach((input) => {
      const element = input as HTMLElement;
      const hasAriaRequired = element.getAttribute("aria-required") === "true";
      const hasVisualIndicator = form
        .querySelector(`[for="${element.id}"]`)
        ?.textContent?.includes("*");

      if (!hasAriaRequired && !hasVisualIndicator) {
        errors.push(
          `Required field ${element.id || (element as any).name || "unknown"} is missing proper indication`
        );
      }
    });

    return errors;
  }
  static hasLabel(element: HTMLElement): boolean {
    return !!(
      (element.id && document.querySelector(`label[for="${element.id}"]`)) ||
      element.closest("label")
    );
  }
  static validateHeadingStructure(
    container: HTMLElement = document.body
  ): string[] {
    const errors: string[] = [];
    const headings = Array.from(
      container.querySelectorAll("h1, h2, h3, h4, h5, h6")
    );

    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (index === 0 && level !== 1) {
        errors.push("Page should start with an h1 heading");
      } else if (level > previousLevel + 1) {
        errors.push(
          `Heading level skipped: ${heading.tagName} follows h${previousLevel}`
        );
      }
      previousLevel = level;
    });

    return errors;
  }
  static validateColorContrast(
    container: HTMLElement = document.body
  ): string[] {
    const errors: string[] = [];
    const elements = container.querySelectorAll("*");

    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      if (
        color &&
        backgroundColor &&
        color !== "rgba(0, 0, 0, 0)" &&
        backgroundColor !== "rgba(0, 0, 0, 0)"
      ) {
        if (!ColorContrast.meetsWCAG(color, backgroundColor)) {
          errors.push(
            `Poor color contrast in element: ${element.tagName}${element.id ? "#" + element.id : ""}${element.className ? "." + element.className.split(" ").join(".") : ""}`
          );
        }
      }
    });

    return errors;
  }
}
// Auto-apply reduced motion styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = MotionUtils.createReducedMotionCSS();
  document.head.appendChild(style);
}
