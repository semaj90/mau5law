/**
 * YoRHa 3D UI Component Library
 * Low-poly Three.js UI components with Square Enix NieR: Automata gothic aesthetic
 * Advanced CSS-like styling capabilities for 3D interfaces
 */

import * as THREE from 'three';

// YoRHa Color Scheme (NieR: Automata inspired)
export const YORHA_COLORS = {
  // Primary gothic palette
  primary: {
    black: 0x0a0a0a,           // Deep gothic black
    white: 0xfaf6ed,           // Warm off-white
    beige: 0xd4c5a9,           // Desert sand
    grey: 0x8b8680,            // Stone grey
  },
  // Accent colors
  accent: {
    gold: 0xd4af37,            // Golden highlights
    amber: 0xffc649,           // Amber glow
    bronze: 0xcd7f32,          // Bronze metallic
    copper: 0xb87333,          // Copper warm
  },
  // Status colors
  status: {
    success: 0x90ee90,         // Light green
    warning: 0xffa500,         // Orange warning
    error: 0xff6b6b,           // Soft red error
    info: 0x87ceeb,            // Sky blue info
  },
  // UI states
  interaction: {
    hover: 0xe8dcc0,           // Warm hover
    active: 0xffd700,          // Gold active
    disabled: 0x4a4a4a,        // Disabled grey
    focus: 0xf0e68c,           // Khaki focus
  }
} as const;

// 3D CSS-like styling system
export interface YoRHaStyle {
  // Box model
  width?: number;
  height?: number;
  depth?: number;
  padding?: YoRHaPadding;
  margin?: YoRHaMargin;
  
  // Colors and materials
  backgroundColor?: number;
  borderColor?: number;
  textColor?: number;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  
  // Border properties
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'glow' | 'scan';
  
  // Shadow and lighting
  shadow?: YoRHaShadow;
  glow?: YoRHaGlow;
  
  // Gradient properties
  gradient?: YoRHaGradient;
  
  // Animation properties
  animation?: YoRHaAnimation;
  
  // Positioning
  position?: 'absolute' | 'relative' | 'fixed';
  transform?: YoRHaTransform;
  
  // Typography (for text elements)
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  
  // Interactive states
  hover?: Partial<YoRHaStyle>;
  active?: Partial<YoRHaStyle>;
  disabled?: Partial<YoRHaStyle>;

  // Component variants
  variant?: 'default' | 'primary' | 'secondary' | 'quantum' | 'consciousness' | 'reality' | 'glass' | 'ghost' | 'danger' | 'accent' | 'outlined' | 'filled' | 'terminal' | 'alert' | 'confirm' | 'fullscreen';
}

export interface YoRHaPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  all?: number;
}

export interface YoRHaMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  all?: number;
}

export interface YoRHaShadow {
  enabled: boolean;
  color?: number;
  blur?: number;
  intensity?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
}

export interface YoRHaGlow {
  enabled: boolean;
  color?: number;
  intensity?: number;
  size?: number;
  animation?: 'pulse' | 'scan' | 'static';
}

export interface YoRHaGradient {
  type: 'linear' | 'radial' | 'vertical' | 'horizontal' | 'diagonal';
  colors: number[];
  stops?: number[];
  direction?: THREE.Vector3;
}

export interface YoRHaAnimation {
  type: 'pulse' | 'rotate' | 'scale' | 'hover' | 'scan' | 'glitch';
  duration?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  loop?: boolean;
  delay?: number;
}

export interface YoRHaTransform {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

// Base YoRHa 3D UI Component
export abstract class YoRHa3DComponent extends THREE.Group {
  protected style: YoRHaStyle;
  protected geometry!: THREE.BufferGeometry;
  protected material!: THREE.Material;
  protected mesh!: THREE.Mesh;
  protected animationMixer?: THREE.AnimationMixer;
  protected boundingBox: THREE.Box3;
  protected isHovered: boolean = false;
  protected isActive: boolean = false;
  protected isDisabled: boolean = false;
  protected eventListeners: Map<string, Array<(event?: any) => void>> = new Map();
  protected customAnimations: Map<string, (deltaTime: number) => void> = new Map();

  constructor(style: YoRHaStyle = {}) {
    super();
    this.style = this.mergeDefaultStyle(style);
    this.boundingBox = new THREE.Box3();
    
    this.createGeometry();
    this.createMaterial();
    this.createMesh();
    this.applyStyle();
    this.setupInteractions();
    this.setupAnimations();
  }

  protected mergeDefaultStyle(style: YoRHaStyle): YoRHaStyle {
    return {
      width: 2,
      height: 1,
      depth: 0.1,
      backgroundColor: YORHA_COLORS.primary.beige,
      borderColor: YORHA_COLORS.primary.black,
      borderWidth: 0.02,
      borderRadius: 0.1,
      opacity: 1,
      metalness: 0.1,
      roughness: 0.8,
      padding: { all: 0.1 },
      margin: { all: 0 },
      shadow: {
        enabled: true,
        color: YORHA_COLORS.primary.black,
        blur: 0.5,
        intensity: 0.3,
        offsetY: -0.1
      },
      ...style
    };
  }

  protected abstract createGeometry(): void;

  protected createMaterial(): void {
    const materialProps: THREE.MeshStandardMaterialParameters = {
      color: this.style.backgroundColor,
      opacity: this.style.opacity,
      transparent: (this.style.opacity || 1) < 1,
      metalness: this.style.metalness,
      roughness: this.style.roughness,
    };

    // Apply gradient if specified
    if (this.style.gradient) {
      this.material = this.createGradientMaterial(materialProps);
    } else {
      this.material = new THREE.MeshStandardMaterial(materialProps);
    }
  }

  protected createGradientMaterial(baseProps: THREE.MeshStandardMaterialParameters): THREE.Material {
    const gradient = this.style.gradient!;
    
    // Create gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    let gradientObj: CanvasGradient;
    
    switch (gradient.type) {
      case 'linear':
      case 'horizontal':
        gradientObj = ctx.createLinearGradient(0, 0, 256, 0);
        break;
      case 'vertical':
        gradientObj = ctx.createLinearGradient(0, 0, 0, 256);
        break;
      case 'diagonal':
        gradientObj = ctx.createLinearGradient(0, 0, 256, 256);
        break;
      case 'radial':
        gradientObj = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        break;
      default:
        gradientObj = ctx.createLinearGradient(0, 0, 256, 0);
    }
    
    // Add color stops
    const stops = gradient.stops || gradient.colors.map((_, i) => i / (gradient.colors.length - 1));
    gradient.colors.forEach((color, index) => {
      const hexColor = `#${color.toString(16).padStart(6, '0')}`;
      gradientObj.addColorStop(stops[index] || index / (gradient.colors.length - 1), hexColor);
    });
    
    ctx.fillStyle = gradientObj;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.MeshStandardMaterial({
      ...baseProps,
      map: texture
    });
  }

  protected createMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.add(this.mesh);
    
    // Create border if specified
    if (this.style.borderWidth && this.style.borderWidth > 0) {
      this.createBorder();
    }
    
    // Create shadow if enabled
    if (this.style.shadow?.enabled) {
      this.createShadow();
    }
    
    // Create glow effect if enabled
    if (this.style.glow?.enabled) {
      this.createGlow();
    }
  }

  protected createBorder(): void {
    const borderGeometry = this.createBorderGeometry();
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: this.style.borderColor,
      opacity: this.style.opacity,
      transparent: (this.style.opacity || 1) < 1,
    });
    
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    this.add(borderMesh);
    
    // Apply border style effects
    if (this.style.borderStyle === 'glow') {
      this.createBorderGlow(borderMesh);
    } else if (this.style.borderStyle === 'scan') {
      this.createBorderScanAnimation(borderMesh);
    }
  }

  protected createBorderGeometry(): THREE.BufferGeometry {
    // Default implementation - override in subclasses
    const width = (this.style.width || 1) + (this.style.borderWidth || 0) * 2;
    const height = (this.style.height || 1) + (this.style.borderWidth || 0) * 2;
    const depth = (this.style.depth || 0.1) + (this.style.borderWidth || 0) * 2;
    
    return new THREE.BoxGeometry(width, height, depth);
  }

  protected createShadow(): void {
    if (!this.style.shadow) return;
    
    const shadowGeometry = this.geometry.clone();
    const shadowMaterial = new THREE.MeshStandardMaterial({
      color: this.style.shadow.color || YORHA_COLORS.primary.black,
      opacity: this.style.shadow.intensity || 0.3,
      transparent: true,
    });
    
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.set(
      this.style.shadow.offsetX || 0,
      this.style.shadow.offsetY || -0.1,
      this.style.shadow.offsetZ || -0.01
    );
    
    // Add blur effect (simulated with scaled geometry)
    const blur = this.style.shadow.blur || 0.5;
    shadowMesh.scale.set(1 + blur * 0.1, 1 + blur * 0.1, 1);
    
    this.add(shadowMesh);
  }

  protected createGlow(): void {
    if (!this.style.glow) return;
    
    const glowGeometry = this.geometry.clone();
    const glowSize = this.style.glow.size || 1.2;
    
    // Create multiple glow layers for better effect
    const glowLayers = 3;
    for (let i = 0; i < glowLayers; i++) {
      const layerIntensity = (this.style.glow.intensity || 0.5) * (1 - i * 0.3);
      const layerSize = glowSize + i * 0.1;
      
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: this.style.glow.color || YORHA_COLORS.accent.gold,
        opacity: layerIntensity,
        transparent: true,
        side: THREE.BackSide,
      });
      
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.scale.set(layerSize, layerSize, layerSize);
      this.add(glowMesh);
      
      // Animate glow if specified
      if (this.style.glow.animation === 'pulse') {
        this.createPulseAnimation(glowMesh, i * 0.2);
      }
    }
  }

  protected createBorderGlow(borderMesh: THREE.Mesh): void {
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: this.style.borderColor,
      opacity: 0.3,
      transparent: true,
      side: THREE.BackSide,
    });
    
    const glowMesh = new THREE.Mesh(borderMesh.geometry, glowMaterial);
    glowMesh.scale.set(1.1, 1.1, 1.1);
    this.add(glowMesh);
  }

  protected createBorderScanAnimation(borderMesh: THREE.Mesh): void {
    // Create animated scan line effect on border
    const scanMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        scanSpeed: { value: 2.0 },
        scanWidth: { value: 0.1 },
        baseColor: { value: new THREE.Color(this.style.borderColor) },
        scanColor: { value: new THREE.Color(YORHA_COLORS.accent.gold) }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float scanSpeed;
        uniform float scanWidth;
        uniform vec3 baseColor;
        uniform vec3 scanColor;
        varying vec3 vPosition;
        
        void main() {
          float scan = sin(vPosition.x * 10.0 + time * scanSpeed) * 0.5 + 0.5;
          float scanMask = smoothstep(0.0, scanWidth, scan) * smoothstep(1.0, 1.0 - scanWidth, scan);
          
          vec3 color = mix(baseColor, scanColor, scanMask);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    borderMesh.material = scanMaterial;
    
    // Add to animation system
    this.addCustomAnimation('borderScan', (deltaTime) => {
      (scanMaterial.uniforms.time as any).value += deltaTime;
    });
  }

  protected applyStyle(): void {
    // Apply transform
    if (this.style.transform) {
      if (this.style.transform.position) {
        this.position.copy(this.style.transform.position);
      }
      if (this.style.transform.rotation) {
        this.rotation.copy(this.style.transform.rotation);
      }
      if (this.style.transform.scale) {
        this.scale.copy(this.style.transform.scale);
      }
    }
    
    // Apply padding (affects internal content positioning)
    this.applyPadding();
    
    // Apply margin (affects external positioning)
    this.applyMargin();
  }

  protected applyPadding(): void {
    if (!this.style.padding) return;
    
    const padding = this.style.padding;
    const paddingValues = {
      top: padding.top ?? padding.all ?? 0,
      right: padding.right ?? padding.all ?? 0,
      bottom: padding.bottom ?? padding.all ?? 0,
      left: padding.left ?? padding.all ?? 0,
    };
    
    // Store padding for child components to use
    this.userData.padding = paddingValues;
  }

  protected applyMargin(): void {
    if (!this.style.margin) return;
    
    const margin = this.style.margin;
    const marginValues = {
      top: margin.top ?? margin.all ?? 0,
      right: margin.right ?? margin.all ?? 0,
      bottom: margin.bottom ?? margin.all ?? 0,
      left: margin.left ?? margin.all ?? 0,
    };
    
    // Apply margin to position
    this.position.x += marginValues.left - marginValues.right;
    this.position.y += marginValues.top - marginValues.bottom;
  }

  protected setupInteractions(): void {
    this.userData.isInteractive = true;
    this.userData.onHover = this.onHover.bind(this);
    this.userData.onUnhover = this.onUnhover.bind(this);
    this.userData.onClick = this.onClick.bind(this);
    this.userData.onMouseDown = this.onMouseDown.bind(this);
    this.userData.onMouseUp = this.onMouseUp.bind(this);
  }

  protected setupAnimations(): void {
    if (this.style.animation) {
      this.createAnimation(this.style.animation);
    }
  }

  protected createAnimation(animation: YoRHaAnimation): void {
    switch (animation.type) {
      case 'pulse':
        this.createPulseAnimation(this.mesh, animation.delay);
        break;
      case 'rotate':
        this.createRotateAnimation(animation);
        break;
      case 'scale':
        this.createScaleAnimation(animation);
        break;
      case 'scan':
        this.createScanAnimation(animation);
        break;
      case 'glitch':
        this.createGlitchAnimation(animation);
        break;
    }
  }

  protected createPulseAnimation(target: THREE.Object3D, delay: number = 0): void {
    const pulseAnimation = () => {
      const time = Date.now() * 0.001 + delay;
      const pulse = Math.sin(time * 2) * 0.1 + 1;
      target.scale.setScalar(pulse);
    };
    
    this.addCustomAnimation('pulse', pulseAnimation);
  }

  protected createRotateAnimation(animation: YoRHaAnimation): void {
    const rotateAnimation = (deltaTime: number) => {
      const speed = (2 * Math.PI) / (animation.duration || 2000);
      this.mesh.rotation.y += speed * deltaTime * 1000;
    };
    
    this.addCustomAnimation('rotate', rotateAnimation);
  }

  protected createScaleAnimation(animation: YoRHaAnimation): void {
    const scaleAnimation = () => {
      const time = Date.now() * 0.001;
      const scale = Math.sin(time * (2 * Math.PI) / (animation.duration || 1000)) * 0.2 + 1;
      this.mesh.scale.setScalar(scale);
    };
    
    this.addCustomAnimation('scale', scaleAnimation);
  }

  protected createScanAnimation(animation: YoRHaAnimation): void {
    // Add scan line effect
    const scanMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        scanColor: { value: new THREE.Color(YORHA_COLORS.accent.gold) },
        baseColor: { value: new THREE.Color(this.style.backgroundColor) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 scanColor;
        uniform vec3 baseColor;
        varying vec2 vUv;
        
        void main() {
          float scan = sin(vUv.y * 20.0 + time * 5.0) * 0.5 + 0.5;
          vec3 color = mix(baseColor, scanColor, scan * 0.3);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    this.mesh.material = scanMaterial;
    
    this.addCustomAnimation('scan', (deltaTime) => {
      (scanMaterial.uniforms.time as any).value += deltaTime;
    });
  }

  protected createGlitchAnimation(animation: YoRHaAnimation): void {
    let glitchTime = 0;
    
    const glitchAnimation = (deltaTime: number) => {
      glitchTime += deltaTime;
      
      if (Math.random() < 0.02) { // 2% chance per frame
        // Random position offset
        this.mesh.position.x += (Math.random() - 0.5) * 0.02;
        this.mesh.position.y += (Math.random() - 0.5) * 0.02;
        
        // Random scale jitter
        const scaleJitter = 1 + (Math.random() - 0.5) * 0.01;
        this.mesh.scale.setScalar(scaleJitter);
        
        // Reset after short time
        setTimeout(() => {
          this.mesh.position.x = 0;
          this.mesh.position.y = 0;
          this.mesh.scale.setScalar(1);
        }, 50);
      }
    };
    
    this.addCustomAnimation('glitch', glitchAnimation);
  }

  public update(deltaTime: number): void {
    // Update all custom animations
    this.customAnimations.forEach(animation => animation(deltaTime));
    
    // Update animation mixer if it exists
    if (this.animationMixer) {
      this.animationMixer.update(deltaTime);
    }
    
    // Update bounding box
    this.boundingBox.setFromObject(this);
  }

  // Interaction handlers
  protected onHover(): void {
    if (this.isDisabled) return;
    
    this.isHovered = true;
    
    if (this.style.hover) {
      this.applyStateStyle(this.style.hover);
    }
    
    // Default hover effect
    if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
      this.mesh.material.emissive.setHex(YORHA_COLORS.interaction.hover);
      this.mesh.material.emissiveIntensity = 0.1;
    }
  }

  protected onUnhover(): void {
    if (this.isDisabled) return;
    
    this.isHovered = false;
    this.resetMaterialState();
  }

  protected onClick(): void {
    if (this.isDisabled) return;
    
    // Override in subclasses
    this.emitEvent('click', { target: this });
  }

  protected onMouseDown(): void {
    if (this.isDisabled) return;
    
    this.isActive = true;
    
    if (this.style.active) {
      this.applyStateStyle(this.style.active);
    }
  }

  protected onMouseUp(): void {
    if (this.isDisabled) return;
    
    this.isActive = false;
    this.resetMaterialState();
  }

  protected applyStateStyle(stateStyle: Partial<YoRHaStyle>): void {
    // Apply temporary style changes
    if (stateStyle.backgroundColor && this.mesh.material instanceof THREE.MeshStandardMaterial) {
      this.mesh.material.color.setHex(stateStyle.backgroundColor);
    }
    
    if (stateStyle.opacity !== undefined && this.mesh.material instanceof THREE.MeshStandardMaterial) {
      this.mesh.material.opacity = stateStyle.opacity;
    }
  }

  protected resetMaterialState(): void {
    if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
      this.mesh.material.color.setHex(this.style.backgroundColor || YORHA_COLORS.primary.beige);
      this.mesh.material.opacity = this.style.opacity || 1;
      this.mesh.material.emissive.setHex(0x000000);
      this.mesh.material.emissiveIntensity = 0;
    }
  }

  // Utility methods
  public setStyle(newStyle: Partial<YoRHaStyle>): void {
    this.style = { ...this.style, ...newStyle };
    this.applyStyle();
  }

  public setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    
    if (disabled && this.style.disabled) {
      this.applyStateStyle(this.style.disabled);
    } else if (!disabled) {
      this.resetMaterialState();
    }
  }

  public getBoundingBox(): THREE.Box3 {
    return this.boundingBox.clone();
  }

  public dispose(): void {
    // Clean up resources
    this.geometry.dispose();
    
    if (Array.isArray(this.material)) {
      this.material.forEach(mat => mat.dispose());
    } else {
      this.material.dispose();
    }
    
    this.customAnimations.clear();
    this.eventListeners.clear();
    
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
    }
  }

  // Event handling methods
  public addEventListener(eventType: string, listener: (event?: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  public removeEventListener(eventType: string, listener: (event?: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  protected emitEvent(eventType: string, event?: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  // Custom animation methods
  public addCustomAnimation(name: string, animationFunction: (deltaTime: number) => void): void {
    this.customAnimations.set(name, animationFunction);
  }

  public removeCustomAnimation(name: string): void {
    this.customAnimations.delete(name);
  }

  public updateCustomAnimations(deltaTime: number): void {
    this.customAnimations.forEach(animationFunction => {
      animationFunction(deltaTime);
    });
  }

  // Initialize method for async setup
  public async initialize(): Promise<void> {
    // Base initialization - can be overridden in subclasses
    return Promise.resolve();
  }
}