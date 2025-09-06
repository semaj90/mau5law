/**
 * YoRHa 3D UI Component Library
 * Index file for easy importing of all components
 */

// Base system
export {
  YoRHa3DComponent,
  YORHA_COLORS,
  type YoRHaStyle,
  type YoRHaPadding,
  type YoRHaMargin,
  type YoRHaShadow,
  type YoRHaGlow,
  type YoRHaGradient,
  type YoRHaAnimation,
  type YoRHaTransform
} from './YoRHaUI3D';

// Anti-Aliasing Enhanced System
export {
  YoRHaAntiAliased3D,
  type YoRHaAAStyle,
  type AntiAliasingConfig,
  type ShaderEnhancements,
  AntiAliasingUtils
} from './YoRHaAntiAliasing3D';

// Import for local use in utility functions
import { YoRHaButton3D } from './components/YoRHaButton3D';
import { YoRHaPanel3D } from './components/YoRHaPanel3D';
import { YoRHaInput3D } from './components/YoRHaInput3D';
import { YoRHaModal3D } from './components/YoRHaModal3D';
import { YoRHaLayout3D, YoRHaLayoutPresets } from './YoRHaLayout3D';
import { createYoRHaUIDemo } from './YoRHaUIExample';

// Core UI Components
export { YoRHaButton3D, type YoRHaButton3DOptions } from './components/YoRHaButton3D';
export { YoRHaPanel3D, type YoRHaPanel3DOptions } from './components/YoRHaPanel3D';
export { YoRHaInput3D, type YoRHaInput3DOptions } from './components/YoRHaInput3D';
export { YoRHaModal3D, type YoRHaModal3DOptions } from './components/YoRHaModal3D';

// Layout System
export {
  YoRHaLayout3D,
  YoRHaLayoutPresets,
  type YoRHaLayoutOptions,
  type YoRHaChildLayout,
  type YoRHaPosition3D,
  type YoRHaPadding3D
} from './YoRHaLayout3D';

// Complete Example
export { YoRHaUIExample, createYoRHaUIDemo } from './YoRHaUIExample';

// Utility functions for common use cases
export const YoRHaUtils = {
  /**
   * Create a button with YoRHa styling
   */
  createButton: (text: string, variant: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' = 'primary') => {
    return new YoRHaButton3D({ text, variant });
  },

  /**
   * Create a panel with title
   */
  createPanel: (title: string, width = 4, height = 3) => {
    return new YoRHaPanel3D({ title, width, height });
  },

  /**
   * Create an input field
   */
  createInput: (placeholder: string, type: 'text' | 'password' | 'email' = 'text') => {
    return new YoRHaInput3D({ placeholder, type, variant: 'outlined' });
  },

  /**
   * Create a modal dialog
   */
  createModal: (title: string, variant: 'default' | 'alert' | 'confirm' | 'terminal' = 'default') => {
    return new YoRHaModal3D({ title, variant, closable: true, showHeader: true });
  },

  /**
   * Create a flex layout container
   */
  createFlexContainer: (direction: 'row' | 'column' = 'column', gap = 0.2) => {
    return new YoRHaLayout3D({
      type: 'flex',
      direction,
      gap,
      justify: 'start',
      align: 'center'
    });
  },

  /**
   * Create a grid layout container
   */
  createGridContainer: (columns: number, rows?: number, gap = 0.2) => {
    return new YoRHaLayout3D({
      type: 'grid',
      gridColumns: columns,
      gridRows: rows,
      gap
    });
  }
};

// Constants for easy access to color schemes (use YORHA_COLORS directly for type safety)
export const YoRHaThemes = {
  DEFAULT: {
    background: 0xd4c5a9,  // YORHA_COLORS.primary.beige
    text: 0x0a0a0a,        // YORHA_COLORS.primary.black
    border: 0x8b8680,      // YORHA_COLORS.primary.grey
    accent: 0xd4af37       // YORHA_COLORS.accent.gold
  },

  TERMINAL: {
    background: 0x0a0a0a,  // YORHA_COLORS.primary.black
    text: 0xd4af37,        // YORHA_COLORS.accent.gold
    border: 0xd4af37,      // YORHA_COLORS.accent.gold
    accent: 0xffc649       // YORHA_COLORS.accent.amber
  },

  ALERT: {
    background: 0xff6b6b,  // YORHA_COLORS.status.error
    text: 0xfaf6ed,        // YORHA_COLORS.primary.white
    border: 0x8b0000,
    accent: 0xffa500       // YORHA_COLORS.status.warning
  },

  SUCCESS: {
    background: 0x90ee90,  // YORHA_COLORS.status.success
    text: 0x0a0a0a,        // YORHA_COLORS.primary.black
    border: 0x228b22,
    accent: 0xfaf6ed       // YORHA_COLORS.primary.white
  }
};

// Quick setup function for common scenarios
export const YoRHaQuickSetup = {
  /**
   * Create a login form with username, password, and submit button
   */
  createLoginForm: () => {
    const container = YoRHaLayoutPresets.createForm();

    const usernameInput = new YoRHaInput3D({
      placeholder: 'Username',
      icon: 'user',
      iconPosition: 'left',
      width: 5
    });

    const passwordInput = new YoRHaInput3D({
      placeholder: 'Password',
      type: 'password',
      icon: 'lock',
      iconPosition: 'left',
      width: 5
    });

    const submitButton = new YoRHaButton3D({
      text: 'Login',
      variant: 'primary',
      size: 'large'
    });

    container.addChild(usernameInput, { alignSelf: 'stretch' });
    container.addChild(passwordInput, { alignSelf: 'stretch' });
    container.addChild(submitButton, { alignSelf: 'center' });

    return { container, usernameInput, passwordInput, submitButton };
  },

  /**
   * Create a confirmation dialog with yes/no buttons
   */
  createConfirmDialog: (title: string, message: string) => {
    const modal = new YoRHaModal3D({
      title,
      variant: 'confirm',
      size: 'small',
      closable: true
    });

    const layout = YoRHaLayoutPresets.createDialog();

    const messagePanel = new YoRHaPanel3D({
      variant: 'glass',
      width: 4,
      height: 1
    });

    const yesButton = new YoRHaButton3D({
      text: 'Yes',
      variant: 'primary'
    });

    const noButton = new YoRHaButton3D({
      text: 'No',
      variant: 'secondary'
    });

    const buttonLayout = YoRHaLayoutPresets.createFlexRow(0.3);
    buttonLayout.addChild(yesButton);
    buttonLayout.addChild(noButton);

    layout.addChild(messagePanel);
    layout.addChild(buttonLayout);

    modal.addContent(layout);

    return { modal, yesButton, noButton };
  },

  /**
   * Create a settings panel with common options
   */
  createSettingsPanel: () => {
    const panel = new YoRHaPanel3D({
      title: 'Settings',
      variant: 'default',
      width: 6,
      height: 5,
      scrollable: true
    });

    const layout = YoRHaLayoutPresets.createForm();

    const volumeInput = new YoRHaInput3D({
      placeholder: 'Volume Level',
      type: 'number',
      width: 4
    });

    const themeInput = new YoRHaInput3D({
      placeholder: 'Theme',
      width: 4
    });

    const saveButton = new YoRHaButton3D({
      text: 'Save Settings',
      variant: 'primary'
    });

    layout.addChild(volumeInput, { alignSelf: 'stretch' });
    layout.addChild(themeInput, { alignSelf: 'stretch' });
    layout.addChild(saveButton, { alignSelf: 'center' });

    panel.addContent(layout);

    return { panel, volumeInput, themeInput, saveButton };
  },

  /**
   * Create a toolbar with common actions
   */
  createToolbar: (actions: Array<{ text: string; icon?: string; variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' }>) => {
    const toolbar = YoRHaLayoutPresets.createToolbar();
    const buttons: YoRHaButton3D[] = [];

    actions.forEach(action => {
      const button = new YoRHaButton3D({
        text: action.text,
        icon: action.icon,
        variant: action.variant || 'secondary',
        size: 'small'
      });

      toolbar.addChild(button);
      buttons.push(button);
    });

    return { toolbar, buttons };
  }
};

// Version information
export const YORHA_UI_VERSION = '1.0.0';
;
/**
 * Main initialization function for the YoRHa UI system
 */
export function initYoRHaUI(container: HTMLElement) {
  return createYoRHaUIDemo(container);
}

// Re-export Three.js for convenience (if needed)
export * as THREE from 'three';
export * from './api/YoRHaAPIClient';
export * from './webgpu/YoRHaWebGPUMath';