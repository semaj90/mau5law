/**
 * 🎮 Retro Console Color Palettes for Legal AI
 * Authentic color palettes from classic gaming consoles
 */

export interface ConsolePalette {
  name: string;
  era: string;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    foreground: string;
    accent: string[];
  };
  gradients: {
    main: string;
    modal: string;
    card: string;
  };
  constraints: {
    maxColors: number;
    bitDepth: number;
    memoryKB: number;
  };
}

// NES (Nintendo Entertainment System) - 1985
export const NES_PALETTE: ConsolePalette = {
  name: 'NES Classic',
  era: '8-bit',
  colors: {
    primary: '#E52521',      // Nintendo Red
    secondary: '#0084FF',    // Classic Blue
    tertiary: '#4CAF50',     // Green
    success: '#5CB85C',      // Light Green
    warning: '#FFC107',      // Yellow
    error: '#DC3545',        // Red
    background: '#000000',   // Black
    foreground: '#FCFCFC',   // White
    accent: [
      '#7C7C7C',  // Gray
      '#0000FC',  // Blue
      '#BC0000',  // Dark Red
      '#BC00BC',  // Purple
      '#00BC00',  // Green
      '#00BCBC',  // Cyan
      '#BCBC00',  // Yellow
      '#BCBCBC',  // Light Gray
    ]
  },
  gradients: {
    main: 'linear-gradient(0deg, #000000, #1C1C1C, #383838)',
    modal: 'linear-gradient(135deg, #000000, #0000FC, #000000)',
    card: 'linear-gradient(45deg, #1C1C1C, #383838)'
  },
  constraints: {
    maxColors: 54,
    bitDepth: 2,
    memoryKB: 2
  }
};

// SNES (Super Nintendo) - 1990
export const SNES_PALETTE: ConsolePalette = {
  name: 'SNES Mode 7',
  era: '16-bit',
  colors: {
    primary: '#B266FF',      // Purple
    secondary: '#00C8FF',    // Cyan
    tertiary: '#FFD700',     // Gold
    success: '#00FF00',      // Bright Green
    warning: '#FFAA00',      // Orange
    error: '#FF0066',        // Hot Pink
    background: '#1A0033',   // Deep Purple
    foreground: '#F8F8F8',   // Off White
    accent: [
      '#FF6B9D',  // Pink
      '#C44569',  // Rose
      '#524A7B',  // Dark Purple
      '#2D3561',  // Navy
      '#0E7490',  // Teal
      '#FFC857',  // Amber
      '#119DA4',  // Ocean
      '#6A0572',  // Violet
    ]
  },
  gradients: {
    main: 'linear-gradient(180deg, #1A0033, #524A7B, #B266FF)',
    modal: 'linear-gradient(135deg, #1A0033 0%, #524A7B 50%, #B266FF 100%)',
    card: 'radial-gradient(circle, #524A7B, #1A0033)'
  },
  constraints: {
    maxColors: 32768,
    bitDepth: 15,
    memoryKB: 128
  }
};

// PS1 (PlayStation) - 1994
export const PS1_PALETTE: ConsolePalette = {
  name: 'PlayStation Classic',
  era: '32-bit',
  colors: {
    primary: '#003791',      // PlayStation Blue
    secondary: '#FF3131',    // PSX Red
    tertiary: '#00BF63',     // PSX Green
    success: '#00D452',      // Success Green
    warning: '#FFB800',      // Warning Gold
    error: '#FF1744',        // Error Red
    background: '#0A0E27',   // Dark Blue
    foreground: '#E7F6F2',   // Light Cyan
    accent: [
      '#2196F3',  // Light Blue
      '#00BCD4',  // Cyan
      '#009688',  // Teal
      '#4CAF50',  // Green
      '#8BC34A',  // Light Green
      '#CDDC39',  // Lime
      '#FFC107',  // Amber
      '#FF5722',  // Deep Orange
    ]
  },
  gradients: {
    main: 'linear-gradient(90deg, #0A0E27, #003791, #2196F3)',
    modal: 'linear-gradient(135deg, #003791 0%, #2196F3 50%, #00BCD4 100%)',
    card: 'linear-gradient(180deg, #0A0E27, #003791)'
  },
  constraints: {
    maxColors: 16777216,
    bitDepth: 24,
    memoryKB: 2048
  }
};

// N64 (Nintendo 64) - 1996
export const N64_PALETTE: ConsolePalette = {
  name: 'N64 Ultra',
  era: '64-bit',
  colors: {
    primary: '#00AA00',      // N64 Green
    secondary: '#0055FF',    // N64 Blue
    tertiary: '#FF5555',     // N64 Red
    success: '#00FF00',      // Bright Green
    warning: '#FFFF00',      // Yellow
    error: '#FF0000',        // Pure Red
    background: '#1E1E1E',   // Dark Gray
    foreground: '#F0F0F0',   // Light Gray
    accent: [
      '#AA00FF',  // Purple
      '#FF00AA',  // Magenta
      '#00AAFF',  // Sky Blue
      '#FFAA00',  // Orange
      '#AA5500',  // Brown
      '#5500AA',  // Indigo
      '#00AA55',  // Sea Green
      '#FF55AA',  // Pink
    ]
  },
  gradients: {
    main: 'linear-gradient(45deg, #1E1E1E, #00AA00, #0055FF, #FF5555)',
    modal: 'conic-gradient(from 180deg, #00AA00, #0055FF, #FF5555, #AA00FF, #00AA00)',
    card: 'linear-gradient(135deg, #1E1E1E, #00AA00, #1E1E1E)'
  },
  constraints: {
    maxColors: 32768,
    bitDepth: 15,
    memoryKB: 4096
  }
};

// PS2 (PlayStation 2) - 2000
export const PS2_PALETTE: ConsolePalette = {
  name: 'PS2 Emotion',
  era: '128-bit',
  colors: {
    primary: '#1B3A6B',      // PS2 Navy
    secondary: '#3A7BC8',    // PS2 Blue
    tertiary: '#67B3CC',     // PS2 Cyan
    success: '#4ECDC4',      // Teal
    warning: '#F7B731',      // Gold
    error: '#FC5C65',        // Coral
    background: '#0C1929',   // Midnight Blue
    foreground: '#DFE6ED',   // Silver
    accent: [
      '#A55EEA',  // Purple
      '#8854D0',  // Deep Purple
      '#3867D6',  // Royal Blue
      '#2D98DA',  // Sky Blue
      '#0FB9B1',  // Turquoise
      '#20BF6B',  // Emerald
      '#FED330',  // Yellow
      '#FC5C65',  // Red
    ]
  },
  gradients: {
    main: 'linear-gradient(120deg, #0C1929, #1B3A6B, #3A7BC8, #67B3CC)',
    modal: 'linear-gradient(45deg, #1B3A6B 0%, #3A7BC8 25%, #67B3CC 50%, #4ECDC4 75%, #A55EEA 100%)',
    card: 'radial-gradient(ellipse at top, #3A7BC8, #1B3A6B, #0C1929)'
  },
  constraints: {
    maxColors: 16777216,
    bitDepth: 32,
    memoryKB: 32768
  }
};

// Console palette collection
export const CONSOLE_PALETTES = {
  nes: NES_PALETTE,
  snes: SNES_PALETTE,
  ps1: PS1_PALETTE,
  n64: N64_PALETTE,
  ps2: PS2_PALETTE
} as const;

// Helper function to apply console palette to CSS variables
export function applyConsolePalette(consoleName: keyof typeof CONSOLE_PALETTES): void {
  const palette = CONSOLE_PALETTES[consoleName];
  const root = document.documentElement;

  // Apply main colors
  root.style.setProperty('--console-primary', palette.colors.primary);
  root.style.setProperty('--console-secondary', palette.colors.secondary);
  root.style.setProperty('--console-tertiary', palette.colors.tertiary);
  root.style.setProperty('--console-success', palette.colors.success);
  root.style.setProperty('--console-warning', palette.colors.warning);
  root.style.setProperty('--console-error', palette.colors.error);
  root.style.setProperty('--console-bg', palette.colors.background);
  root.style.setProperty('--console-fg', palette.colors.foreground);

  // Apply gradients
  root.style.setProperty('--console-gradient-main', palette.gradients.main);
  root.style.setProperty('--console-gradient-modal', palette.gradients.modal);
  root.style.setProperty('--console-gradient-card', palette.gradients.card);

  // Apply accent colors
  palette.colors.accent.forEach((color, index) => {
    root.style.setProperty(`--console-accent-${index}`, color);
  });

  // Store current palette in localStorage
  localStorage.setItem('console-palette', consoleName);
}

// Get color with bit depth constraint simulation
export function getConstrainedColor(color: string, bitDepth: number): string {
  if (bitDepth >= 24) return color; // No constraint for 24-bit or higher

  // Parse hex color
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Calculate color reduction based on bit depth
  const levels = Math.pow(2, bitDepth / 3); // Approximate levels per channel
  const step = 255 / (levels - 1);

  // Quantize colors
  const qr = Math.round(Math.round(r / step) * step);
  const qg = Math.round(Math.round(g / step) * step);
  const qb = Math.round(Math.round(b / step) * step);

  // Return quantized color
  return `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
}

// Generate palette-aware gradient with memory constraints
export function generateConstrainedGradient(
  colors: string[],
  memoryKB: number,
  angle = 45
): string {
  // Reduce colors based on memory constraints
  const maxStops = Math.min(colors.length, Math.floor(memoryKB / 8));
  const selectedColors = colors.slice(0, maxStops);

  return `linear-gradient(${angle}deg, ${selectedColors.join(', ')})`;
}

// Export utility for current palette
export function getCurrentPalette(): ConsolePalette {
  const stored = localStorage.getItem('console-palette') as keyof typeof CONSOLE_PALETTES;
  return CONSOLE_PALETTES[stored] || CONSOLE_PALETTES.nes;
}