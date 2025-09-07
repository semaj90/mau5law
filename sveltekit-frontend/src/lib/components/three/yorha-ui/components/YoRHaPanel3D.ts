/**
 * YoRHa 3D Panel Component
 * Container/card component with advanced styling and YoRHa aesthetic
 */

import * as THREE from 'three';
import { YoRHa3DComponent, type YoRHaStyle, YORHA_COLORS } from '../YoRHaUI3D';

export interface YoRHaPanel3DOptions extends YoRHaStyle {
  title?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'quantum' | 'consciousness' | 'reality' | 'glass' | 'ghost' | 'danger' | 'accent' | 'outlined' | 'filled' | 'terminal' | 'alert' | 'confirm' | 'fullscreen';
  headerHeight?: number;
  showCloseButton?: boolean;
  resizable?: boolean;
  minimizable?: boolean;
  scrollable?: boolean;
}

export class YoRHaPanel3D extends YoRHa3DComponent {
  private titleMesh?: THREE.Mesh;
  private headerMesh?: THREE.Mesh;
  private closeButtonMesh?: THREE.Mesh;
  private contentContainer: THREE.Group;
  private scrollContainer?: THREE.Group;
  private options: YoRHaPanel3DOptions;
  private isMinimized = false;
  private scrollOffset = 0;

  constructor(options: YoRHaPanel3DOptions = {}) {
    const style = YoRHaPanel3D.getVariantStyle(options.variant || 'default');
    
    super({
      ...style,
      ...options,
      // Panel-specific defaults
      width: options.width || 4,
      height: options.height || 3,
      depth: options.depth || 0.1,
      backgroundColor: options.backgroundColor || YORHA_COLORS.primary.beige,
      borderColor: options.borderColor || YORHA_COLORS.primary.black,
      borderWidth: options.borderWidth || 0.02,
      shadow: {
        enabled: true,
        color: YORHA_COLORS.primary.black,
        blur: 0.5,
        intensity: 0.3,
        offsetY: -0.1,
        ...options.shadow
      },
      // Interactive states
      hover: {
        shadow: {
          enabled: options.hover?.shadow?.enabled !== undefined ? options.hover.shadow.enabled : true,
          intensity: 0.4,
          offsetY: -0.15,
          ...options.hover?.shadow
        },
        ...options.hover
      }
    });
    
    this.options = options;
    
    // Create content container
    this.contentContainer = new THREE.Group();
    this.add(this.contentContainer);
    
    // Create header if title is provided
    if (options.title) {
      this.createHeader();
    }
    
    // Create scroll container if scrollable
    if (options.scrollable) {
      this.createScrollContainer();
    }
    
    // Add resize handles if resizable
    if (options.resizable) {
      this.createResizeHandles();
    }
  }

  protected createGeometry(): void {
    const width = this.style.width || 4;
    const height = this.style.height || 3;
    const depth = this.style.depth || 0.1;
    const radius = this.style.borderRadius || 0.05;

    if (radius > 0) {
      this.geometry = this.createRoundedBoxGeometry(width, height, depth, radius);
    } else {
      this.geometry = new THREE.BoxGeometry(width, height, depth);
    }
  }

  private createRoundedBoxGeometry(width: number, height: number, depth: number, radius: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: radius * 0.05,
      bevelThickness: depth * 0.1
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createHeader(): void {
    if (!this.options.title) return;

    const headerHeight = this.options.headerHeight || 0.4;
    const width = this.style.width || 4;
    
    // Create header background
    const headerGeometry = new THREE.PlaneGeometry(width - 0.1, headerHeight);
    const headerMaterial = new THREE.MeshStandardMaterial({
      color: YORHA_COLORS.primary.grey,
      transparent: true,
      opacity: 0.9
    });
    
    this.headerMesh = new THREE.Mesh(headerGeometry, headerMaterial);
    this.headerMesh.position.set(0, (this.style.height || 3) / 2 - headerHeight / 2 - 0.05, (this.style.depth || 0.1) / 2 + 0.001);
    this.add(this.headerMesh);
    
    // Create title text
    const titleGeometry = new THREE.PlaneGeometry(width - 0.6, 0.2);
    const titleMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.primary.white,
      transparent: true
    });
    
    this.titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    this.titleMesh.position.set(-0.2, (this.style.height || 3) / 2 - headerHeight / 2 - 0.05, (this.style.depth || 0.1) / 2 + 0.002);
    this.add(this.titleMesh);
    
    // Create close button if enabled
    if (this.options.showCloseButton) {
      this.createCloseButton();
    }
  }

  private createCloseButton(): void {
    const buttonSize = 0.15;
    const width = this.style.width || 4;
    const headerHeight = this.options.headerHeight || 0.4;
    
    // Close button geometry (X shape)
    const buttonGeometry = new THREE.PlaneGeometry(buttonSize, buttonSize);
    const buttonMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.status.error,
      transparent: true
    });
    
    this.closeButtonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    this.closeButtonMesh.position.set(
      width / 2 - 0.2,
      (this.style.height || 3) / 2 - headerHeight / 2 - 0.05,
      (this.style.depth || 0.1) / 2 + 0.002
    );
    
    // Add hover effects
    this.closeButtonMesh.userData = {
      interactive: true,
      onClick: () => this.onCloseClick(),
      onHover: () => {
        if (this.closeButtonMesh?.material instanceof THREE.MeshBasicMaterial) {
          this.closeButtonMesh.material.color.setHex(0xff4444);
        }
      },
      onLeave: () => {
        if (this.closeButtonMesh?.material instanceof THREE.MeshBasicMaterial) {
          this.closeButtonMesh.material.color.setHex(YORHA_COLORS.status.error);
        }
      }
    };
    
    this.add(this.closeButtonMesh);
  }

  private createScrollContainer(): void {
    this.scrollContainer = new THREE.Group();
    
    // Create scrollable content area
    const contentHeight = (this.style.height || 3) - (this.options.headerHeight || 0.4) - 0.2;
    const scrollGeometry = new THREE.PlaneGeometry(
      (this.style.width || 4) - 0.2,
      contentHeight
    );
    const scrollMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0
    });
    
    const scrollPlane = new THREE.Mesh(scrollGeometry, scrollMaterial);
    scrollPlane.position.set(0, -0.2, (this.style.depth || 0.1) / 2 + 0.001);
    
    this.scrollContainer.add(scrollPlane);
    this.contentContainer.add(this.scrollContainer);
    
    // Add scroll indicators
    this.createScrollIndicators();
  }

  private createScrollIndicators(): void {
    // Scroll bar on the right edge
    const scrollBarGeometry = new THREE.PlaneGeometry(0.05, (this.style.height || 3) - 0.4);
    const scrollBarMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.primary.grey,
      transparent: true,
      opacity: 0.5
    });
    
    const scrollBar = new THREE.Mesh(scrollBarGeometry, scrollBarMaterial);
    scrollBar.position.set(
      (this.style.width || 4) / 2 - 0.1,
      -0.2,
      (this.style.depth || 0.1) / 2 + 0.001
    );
    
    this.add(scrollBar);
  }

  private createResizeHandles(): void {
    // Create corner resize handles
    const handleSize = 0.1;
    const handleGeometry = new THREE.PlaneGeometry(handleSize, handleSize);
    const handleMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.accent.gold,
      transparent: true,
      opacity: 0.7
    });
    
    // Bottom-right corner handle
    const resizeHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    resizeHandle.position.set(
      (this.style.width || 4) / 2 - handleSize / 2,
      -(this.style.height || 3) / 2 + handleSize / 2,
      (this.style.depth || 0.1) / 2 + 0.001
    );
    
    resizeHandle.userData = {
      interactive: true,
      onDrag: (deltaX: number, deltaY: number) => this.onResize(deltaX, deltaY)
    };
    
    this.add(resizeHandle);
  }

  private static getVariantStyle(variant: string): Partial<YoRHaStyle> {
    const variantStyles = {
      default: {
        backgroundColor: YORHA_COLORS.primary.beige,
        borderColor: YORHA_COLORS.primary.black,
        borderWidth: 0.02
      },
      outlined: {
        backgroundColor: 0x000000,
        opacity: 0.1,
        borderColor: YORHA_COLORS.primary.beige,
        borderWidth: 0.04
      },
      filled: {
        backgroundColor: YORHA_COLORS.primary.grey,
        borderColor: YORHA_COLORS.primary.black,
        borderWidth: 0.01
      },
      glass: {
        backgroundColor: YORHA_COLORS.primary.white,
        opacity: 0.2,
        borderColor: YORHA_COLORS.accent.gold,
        borderWidth: 0.02,
        glow: {
          enabled: true,
          color: YORHA_COLORS.accent.amber,
          intensity: 0.2
        }
      },
      terminal: {
        backgroundColor: YORHA_COLORS.primary.black,
        borderColor: YORHA_COLORS.accent.gold,
        borderWidth: 0.03,
        textColor: YORHA_COLORS.accent.gold,
        animation: {
          type: 'scan' as const,
          speed: 2,
          intensity: 0.3
        }
      }
    };
    
    return variantStyles[variant as keyof typeof variantStyles] || variantStyles.default;
  }

  // Public methods
  public setTitle(title: string): void {
    this.options.title = title;
    
    if (this.titleMesh) {
      // Update title text (placeholder for actual text rendering)
      // In real implementation, this would update the text geometry
    }
  }

  public addContent(object: THREE.Object3D): void {
    if (this.scrollContainer) {
      this.scrollContainer.add(object);
    } else {
      this.contentContainer.add(object);
    }
  }

  public removeContent(object: THREE.Object3D): void {
    if (this.scrollContainer) {
      this.scrollContainer.remove(object);
    } else {
      this.contentContainer.remove(object);
    }
  }

  public scroll(delta: number): void {
    if (!this.scrollContainer) return;
    
    this.scrollOffset += delta;
    // Clamp scroll offset to reasonable bounds
    const maxScroll = 2; // Maximum scroll distance
    this.scrollOffset = Math.max(-maxScroll, Math.min(maxScroll, this.scrollOffset));
    
    this.scrollContainer.position.y = this.scrollOffset;
  }

  public minimize(): void {
    if (this.isMinimized) return;
    
    this.isMinimized = true;
    const headerHeight = this.options.headerHeight || 0.4;
    
    // Animate to minimized state
    this.addCustomAnimation('minimize', (deltaTime) => {
      const targetHeight = headerHeight;
      const currentHeight = this.style.height || 3;
      
      if (currentHeight > targetHeight) {
        this.setStyle({ height: Math.max(targetHeight, currentHeight - deltaTime * 5) });
        this.contentContainer.visible = false;
      } else {
        this.customAnimations.delete('minimize');
      }
    });
  }

  public restore(): void {
    if (!this.isMinimized) return;
    
    this.isMinimized = false;
    const originalHeight = this.options.height || 3;
    
    // Animate to restored state
    this.addCustomAnimation('restore', (deltaTime) => {
      const currentHeight = this.style.height || 0.4;
      
      if (currentHeight < originalHeight) {
        this.setStyle({ height: Math.min(originalHeight, currentHeight + deltaTime * 5) });
      } else {
        this.contentContainer.visible = true;
        this.customAnimations.delete('restore');
      }
    });
  }

  private onCloseClick(): void {
    // Add close animation
    this.addCustomAnimation('closeAnimation', (deltaTime) => {
      const material = Array.isArray(this.mesh.material) ? this.mesh.material[0] : this.mesh.material;
      const currentOpacity = (material as any).opacity || 1;
      const newOpacity = currentOpacity - deltaTime * 3;
      
      if (newOpacity <= 0) {
        this.emitEvent('close');
        this.customAnimations.delete('closeAnimation');
      } else {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.opacity = newOpacity;
        }
      }
    });
  }

  private onResize(deltaX: number, deltaY: number): void {
    const newWidth = Math.max(2, (this.style.width || 4) + deltaX);
    const newHeight = Math.max(1, (this.style.height || 3) + deltaY);
    
    this.setStyle({ width: newWidth, height: newHeight });
    this.emitEvent('resize', { width: newWidth, height: newHeight });
  }

  public override dispose(): void {
    super.dispose();
    
    if (this.titleMesh) {
      this.titleMesh.geometry.dispose();
      if (Array.isArray(this.titleMesh.material)) {
        this.titleMesh.material.forEach(mat => mat.dispose());
      } else {
        this.titleMesh.material.dispose();
      }
    }
    
    if (this.headerMesh) {
      this.headerMesh.geometry.dispose();
      if (Array.isArray(this.headerMesh.material)) {
        this.headerMesh.material.forEach(mat => mat.dispose());
      } else {
        this.headerMesh.material.dispose();
      }
    }
    
    if (this.closeButtonMesh) {
      this.closeButtonMesh.geometry.dispose();
      if (Array.isArray(this.closeButtonMesh.material)) {
        this.closeButtonMesh.material.forEach(mat => mat.dispose());
      } else {
        this.closeButtonMesh.material.dispose();
      }
    }
  }
}