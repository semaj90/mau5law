<!-- @migration-task Error while migrating Svelte code: `$:` is not allowed in runes mode, use `$derived` or `$effect` instead
https://svelte.dev/e/legacy_reactive_statement_invalid -->
<!-- @migration-task Error while migrating Svelte code: `$:` is not allowed in runes mode, use `$derived` or `$effect` instead -->
<!--
  NES.css Typewriter Text Streaming Component
  Cached alphabet texture streaming for enhanced AI chat
  Uses quantized cached text with Nintendo-inspired styling
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import type { Writable } from 'svelte/store';
  import { base64FP32Quantizer } from '../../text/base64-fp32-quantizer';
  import { chrRomPatternCache } from '../../cache/chr-rom-pattern-cache';
  
  // Props
  interface TypewriterProps {
    text: string;
    speed?: number; // Characters per second
    enableSound?: boolean;
    nesTheme?: 'classic' | 'modern' | 'legal';
    cacheTextures?: boolean;
    quantizeText?: boolean;
    maxWidth?: string;
    onComplete?: () => void;
  }
  
  let {
    text = '',
    speed = 50,
    enableSound = true,
    nesTheme = 'legal',
    cacheTextures = true,
    quantizeText = true,
    maxWidth = '100%',
    onComplete
  }: TypewriterProps = $props();
  
  // State management
  const currentIndex = writable(0);
  const isTyping = writable(false);
  const displayText = writable('');
  const cursor = writable(true);
  
  // Derived stores
  const visibleText = derived(
    [displayText, currentIndex],
    ([$displayText, $currentIndex]) => $displayText.slice(0, $currentIndex)
  );
  
  // Texture cache for alphabet characters
  interface AlphabetTexture {
    char: string;
    texture: ImageData | null;
    quantizedData: Float32Array;
    nesPattern: Uint8Array; // 8x8 NES-style pattern
    cached: boolean;
  }
  
  const alphabetCache = new Map<string, AlphabetTexture>();
  let textureCanvas: HTMLCanvasElement;
  let textureCtx: CanvasRenderingContext2D;
  
  // Audio context for NES-style typing sounds
  let audioContext: AudioContext | null = null;
  let typingSoundBuffer: AudioBuffer | null = null;
  
  // Animation frame ID
  let animationFrame: number;
  let typewriterInterval: number;
  
  // Component references
  let containerElement: HTMLDivElement;
  let textElement: HTMLSpanElement;
  let cursorElement: HTMLSpanElement;
  
  onMount(() => {
    initializeTextureSystem();
    initializeAudioSystem();
    startTypewriterEffect();
  });
  
  onDestroy(() => {
    cleanup();
  });
  
  function initializeTextureSystem(): void {
    if (!cacheTextures) return;
    
    // Create texture canvas for character rendering
    textureCanvas = document.createElement('canvas');
    textureCanvas.width = 128; // 16x8 characters
    textureCanvas.height = 128; // 16x8 characters  
    textureCtx = textureCanvas.getContext('2d')!;
    
    // Configure for NES-style pixel art
    textureCtx.imageSmoothingEnabled = false;
    textureCtx.font = '8px "Courier New", monospace';
    textureCtx.textAlign = 'left';
    textureCtx.textBaseline = 'top';
    
    console.log('🎮 NES texture system initialized');
    
    // Pre-cache common characters
    preloadAlphabetTextures();
  }
  
  async function preloadAlphabetTextures(): Promise<void> {
    const commonChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?-()[]{}"\' ';
    
    for (const char of commonChars) {
      await cacheCharacterTexture(char);
    }
    
    console.log(`🔤 Pre-cached ${commonChars.length} character textures`);
  }
  
  async function cacheCharacterTexture(char: string): Promise<AlphabetTexture> {
    if (alphabetCache.has(char)) {
      return alphabetCache.get(char)!;
    }
    
    try {
      // Generate NES-style 8x8 pattern for character
      const nesPattern = generateNESPattern(char);
      
      // Render character to texture
      const texture = renderCharacterTexture(char, nesPattern);
      
      // Quantize character data if enabled
      let quantizedData = new Float32Array(64); // 8x8 pixels
      if (quantizeText) {
        const charData = btoa(char);
        const quantizationResult = await base64FP32Quantizer.quantizeGemmaOutput(charData, {
          quantizationBits: 8,
          scalingMethod: 'sigmoid',
          targetLength: 64,
          cudaThreads: 64,
          cacheStrategy: 'aggressive'
        });
        quantizedData = quantizationResult.quantizedData as Float32Array;
      }
      
      // Create alphabet texture entry
      const alphabetTexture: AlphabetTexture = {
        char,
        texture,
        quantizedData,
        nesPattern,
        cached: true
      };
      
      alphabetCache.set(char, alphabetTexture);
      
      // Cache in CHR-ROM system if available
      if (cacheTextures && chrRomPatternCache) {
        await chrRomPatternCache.generateAndCachePattern(
          `char_${char.charCodeAt(0)}`,
          {
            documentType: 'citation', // Use citation type for characters
            riskLevel: 'low',
            visualStyle: 'classic',
            colorScheme: 'default',
            animated: false
          }
        );
      }
      
      return alphabetTexture;
      
    } catch (error) {
      console.error(`❌ Failed to cache texture for '${char}':`, error);
      
      // Return fallback texture
      return {
        char,
        texture: null,
        quantizedData: new Float32Array(64),
        nesPattern: new Uint8Array(64),
        cached: false
      };
    }
  }
  
  function generateNESPattern(char: string): Uint8Array {
    const pattern = new Uint8Array(64); // 8x8 pattern
    const charCode = char.charCodeAt(0);
    
    // Generate unique pattern based on character code
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const index = y * 8 + x;
        
        // Create pattern based on character shape
        if (char === ' ') {
          pattern[index] = 0; // Space is empty
        } else if (char.match(/[A-Z]/)) {
          // Uppercase letters - bold pattern
          pattern[index] = ((x + y + charCode) % 3 === 0) ? 255 : 0;
        } else if (char.match(/[a-z]/)) {
          // Lowercase letters - lighter pattern
          pattern[index] = ((x + y + charCode) % 4 === 0) ? 192 : 0;
        } else if (char.match(/[0-9]/)) {
          // Numbers - geometric pattern
          pattern[index] = ((x === y) || (x + y === 7)) ? 255 : 0;
        } else {
          // Special characters - unique patterns
          pattern[index] = ((x * y + charCode) % 7 === 0) ? 255 : 128;
        }
      }
    }
    
    return pattern;
  }
  
  function renderCharacterTexture(char: string, pattern: Uint8Array): ImageData | null {
    if (!textureCtx) return null;
    
    try {
      // Clear texture area
      textureCtx.clearRect(0, 0, 8, 8);
      
      // Set color based on NES theme
      const themeColors = {
        classic: '#FFFFFF',
        modern: '#00FF00',
        legal: '#FFD700' // Gold for legal theme
      };
      
      textureCtx.fillStyle = themeColors[nesTheme] || themeColors.legal;
      
      // Render character using pattern
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const pixelValue = pattern[y * 8 + x];
          if (pixelValue > 0) {
            textureCtx.fillRect(x, y, 1, 1);
          }
        }
      }
      
      // Get image data
      return textureCtx.getImageData(0, 0, 8, 8);
      
    } catch (error) {
      console.error('❌ Character texture rendering failed:', error);
      return null;
    }
  }
  
  function initializeAudioSystem(): void {
    if (!enableSound || typeof window === 'undefined') return;
    
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      generateTypingSoundBuffer();
      console.log('🔊 NES audio system initialized');
    } catch (error) {
      console.warn('⚠️ Audio system initialization failed:', error);
    }
  }
  
  function generateTypingSoundBuffer(): void {
    if (!audioContext) return;
    
    const sampleRate = audioContext.sampleRate;
    const duration = 0.1; // 100ms sound
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate NES-style square wave typing sound
    for (let i = 0; i < channelData.length; i++) {
      const frequency = 800; // High pitch typing sound
      const time = i / sampleRate;
      const wave = Math.sin(2 * Math.PI * frequency * time);
      const envelope = Math.exp(-time * 10); // Quick decay
      channelData[i] = wave * envelope * 0.1; // Low volume
    }
    
    typingSoundBuffer = buffer;
  }
  
  function playTypingSound(): void {
    if (!audioContext || !typingSoundBuffer || !enableSound) return;
    
    try {
      const source = audioContext.createBufferSource();
      source.buffer = typingSoundBuffer;
      
      // Add slight pitch variation
      const pitchVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      source.playbackRate.value = pitchVariation;
      
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.warn('⚠️ Typing sound playback failed:', error);
    }
  }
  
  async function startTypewriterEffect(): Promise<void> {
    if (!text) return;
    
    $isTyping = true;
    $currentIndex = 0;
    $displayText = text;
    
    // Cache all characters in the text
    const uniqueChars = [...new Set(text.split(''))];
    for (const char of uniqueChars) {
      await cacheCharacterTexture(char);
    }
    
    // Start typing animation
    const charactersPerFrame = Math.max(1, Math.floor(speed / 60)); // 60 FPS
    const frameDelay = 1000 / 60; // 16.67ms per frame
    
    typewriterInterval = setInterval(() => {
      if ($currentIndex >= text.length) {
        $isTyping = false;
        clearInterval(typewriterInterval);
        onComplete?.();
        return;
      }
      
      // Type multiple characters per frame for higher speeds
      for (let i = 0; i < charactersPerFrame && $currentIndex < text.length; i++) {
        $currentIndex++;
        
        // Play typing sound for non-space characters
        if (text[$currentIndex - 1] !== ' ') {
          playTypingSound();
        }
        
        // Apply character-specific effects
        applyCharacterEffects(text[$currentIndex - 1]);
      }
      
    }, frameDelay);
    
    // Start cursor blinking
    startCursorBlink();
  }
  
  function applyCharacterEffects(char: string): void {
    // Get cached texture for character
    const texture = alphabetCache.get(char);
    
    if (texture && texture.cached) {
      // Apply texture-based effects
      console.log(`🎨 Applied texture effect for '${char}'`);
    }
    
    // Add character-specific animations
    if (char === '!' || char === '?') {
      // Exclamation/question marks get extra emphasis
      setTimeout(() => {
        if (textElement) {
          textElement.classList.add('nes-text-emphasis');
          setTimeout(() => {
            textElement.classList.remove('nes-text-emphasis');
          }, 200);
        }
      }, 50);
    }
  }
  
  function startCursorBlink(): void {
    let blinkInterval = setInterval(() => {
      if (!$isTyping) {
        $cursor = !$cursor;
      } else {
        $cursor = true; // Always show cursor while typing
      }
    }, 500);
    
    // Clean up on component destroy
    onDestroy(() => {
      clearInterval(blinkInterval);
    });
  }
  
  function cleanup(): void {
    if (typewriterInterval) {
      clearInterval(typewriterInterval);
    }
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    
    if (audioContext) {
      audioContext.close();
    }
    
    alphabetCache.clear();
  }
  
  // Reactive updates
  $: if (text && containerElement) {
    startTypewriterEffect();
  }
</script>

<div 
  bind:this={containerElement}
  class="nes-typewriter-container"
  class:nes-classic={nesTheme === 'classic'}
  class:nes-modern={nesTheme === 'modern'}
  class:nes-legal={nesTheme === 'legal'}
  style="max-width: {maxWidth};"
>
  <span 
    bind:this={textElement}
    class="nes-typewriter-text"
    class:typing={$isTyping}
  >
    {$visibleText}
  </span>
  
  <span 
    bind:this={cursorElement}
    class="nes-typewriter-cursor"
    class:visible={$cursor}
    class:blinking={!$isTyping}
  >
    █
  </span>
</div>

<style>
  /* NES.css inspired typewriter styling */
  .nes-typewriter-container {
    font-family: 'Courier New', 'Press Start 2P', monospace;
    font-size: 16px;
    line-height: 1.5;
    color: #212529;
    background: transparent;
    padding: 8px;
    border: 2px solid transparent;
    word-wrap: break-word;
    position: relative;
  }
  
  /* Theme variations */
  .nes-classic {
    color: #FFFFFF;
    background: #000000;
    border-color: #FFFFFF;
  }
  
  .nes-modern {
    color: #00FF00;
    background: #001100;
    border-color: #00FF00;
    text-shadow: 0 0 2px #00FF00;
  }
  
  .nes-legal {
    color: #FFD700;
    background: #1a1a2e;
    border-color: #FFD700;
    text-shadow: 0 0 1px #FFD700;
  }
  
  .nes-typewriter-text {
    display: inline;
    font-weight: normal;
    letter-spacing: 0.5px;
  }
  
  .nes-typewriter-text.typing {
    /* Add subtle glow while typing */
    text-shadow: 0 0 3px currentColor;
  }
  
  /* Emphasis effect for special characters */
  .nes-typewriter-text :global(.nes-text-emphasis) {
    animation: emphasize 0.3s ease-out;
  }
  
  @keyframes emphasize {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  .nes-typewriter-cursor {
    display: inline-block;
    opacity: 0;
    margin-left: 1px;
    font-weight: bold;
    color: currentColor;
  }
  
  .nes-typewriter-cursor.visible {
    opacity: 1;
  }
  
  .nes-typewriter-cursor.blinking {
    animation: blink 1s infinite;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  /* Pixel-perfect rendering for retro look */
  .nes-classic .nes-typewriter-text,
  .nes-modern .nes-typewriter-text,
  .nes-legal .nes-typewriter-text {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
  
  /* Loading state */
  .nes-typewriter-container.loading {
    position: relative;
  }
  
  .nes-typewriter-container.loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: loading-scan 2s infinite;
  }
  
  @keyframes loading-scan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .nes-typewriter-container {
      font-size: 14px;
      padding: 6px;
    }
  }
  
  @media (max-width: 480px) {
    .nes-typewriter-container {
      font-size: 12px;
      padding: 4px;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .nes-typewriter-container {
      border-width: 3px;
    }
    
    .nes-legal {
      color: #FFFF00;
      text-shadow: 0 0 2px #000000;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .nes-typewriter-cursor {
      animation: none;
      opacity: 1;
    }
    
    .nes-typewriter-text :global(.nes-text-emphasis) {
      animation: none;
    }
  }
</style>