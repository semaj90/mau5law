/**
 * YoRHa 3D Modal Component
 * Dialog/popup component with advanced styling and YoRHa aesthetic
 */

import * as THREE from 'three';
import { YoRHa3DComponent, type YoRHaStyle, YORHA_COLORS } from '../YoRHaUI3D';

export interface YoRHaModal3DOptions extends Omit<YoRHaStyle, 'variant'> {
  title?: string;
  variant?: 'default' | 'alert' | 'confirm' | 'fullscreen' | 'terminal';
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  backdrop?: 'blur' | 'dark' | 'transparent' | 'none';
  closable?: boolean;
  persistent?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  headerHeight?: number;
  footerHeight?: number;
}

export class YoRHaModal3D extends YoRHa3DComponent {
  private backdrop?: THREE.Mesh;
  private titleMesh?: THREE.Mesh;
  private headerMesh?: THREE.Mesh;
  private footerMesh?: THREE.Mesh;
  private closeButtonMesh?: THREE.Mesh;
  private contentContainer: THREE.Group;
  private glitchEffect?: THREE.Group;
  private options: YoRHaModal3DOptions;
  private isOpen = false;
  private animationProgress = 0;

  constructor(options: YoRHaModal3DOptions = {}) {
    const style = YoRHaModal3D.getVariantStyle(
      options.variant || 'default',
      options.size || 'medium'
    );
    
    super({
      ...style,
      ...options,
      // Modal-specific defaults
      width: options.width || YoRHaModal3D.getSizeWidth(options.size || 'medium'),
      height: options.height || YoRHaModal3D.getSizeHeight(options.size || 'medium'),
      depth: options.depth || 0.2,
      backgroundColor: options.backgroundColor || YORHA_COLORS.primary.beige,
      borderColor: options.borderColor || YORHA_COLORS.primary.black,
      borderWidth: options.borderWidth || 0.03,
      shadow: {
        enabled: true,
        color: YORHA_COLORS.primary.black,
        blur: 1.0,
        intensity: 0.8,
        offsetY: -0.3,
        ...options.shadow
      },
      // Initial state (hidden)
      opacity: 0,
      transform: {
        scale: new THREE.Vector3(0.8, 0.8, 0.8)
      }
    });
    
    this.options = options;
    
    // Create backdrop
    this.createBackdrop();
    
    // Create content container
    this.contentContainer = new THREE.Group();
    this.add(this.contentContainer);
    
    // Create header if enabled
    if (options.showHeader !== false) {
      this.createHeader();
    }
    
    // Create footer if enabled
    if (options.showFooter) {
      this.createFooter();
    }
    
    // Create glitch effect for terminal variant
    if (options.variant === 'terminal') {
      this.createGlitchEffect();
    }
    
    // Initially hidden
    this.visible = false;
  }

  protected createGeometry(): void {
    const width = this.style.width || 4;
    const height = this.style.height || 3;
    const depth = this.style.depth || 0.2;
    const radius = this.style.borderRadius || 0.1;

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
      bevelSegments: 4,
      bevelSize: radius * 0.1,
      bevelThickness: depth * 0.1
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createBackdrop(): void {
    if (this.options.backdrop === 'none') return;
    
    // Create large backdrop plane
    const backdropGeometry = new THREE.PlaneGeometry(20, 15);
    let backdropMaterial: THREE.Material;
    
    switch (this.options.backdrop) {
      case 'blur':
        backdropMaterial = new THREE.MeshBasicMaterial({
          color: YORHA_COLORS.primary.white,
          transparent: true,
          opacity: 0.2
        });
        break;
      case 'dark':
        backdropMaterial = new THREE.MeshBasicMaterial({
          color: YORHA_COLORS.primary.black,
          transparent: true,
          opacity: 0.7
        });
        break;
      case 'transparent':
        backdropMaterial = new THREE.MeshBasicMaterial({
          color: YORHA_COLORS.primary.black,
          transparent: true,
          opacity: 0.3
        });
        break;
      default:
        backdropMaterial = new THREE.MeshBasicMaterial({
          color: YORHA_COLORS.primary.black,
          transparent: true,
          opacity: 0.5
        });
    }
    
    this.backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    this.backdrop.position.z = -0.5;
    
    // Add click handler for backdrop
    if (!this.options.persistent) {
      this.backdrop.userData = {
        interactive: true,
        onClick: () => this.close()
      };
    }
    
    this.add(this.backdrop);
  }

  private createHeader(): void {
    const headerHeight = this.options.headerHeight || 0.6;
    const width = this.style.width || 4;
    
    // Create header background
    const headerGeometry = new THREE.PlaneGeometry(width - 0.1, headerHeight);
    const headerMaterial = new THREE.MeshStandardMaterial({
      color: this.options.variant === 'terminal' 
        ? YORHA_COLORS.primary.black 
        : YORHA_COLORS.primary.grey,
      transparent: true,
      opacity: 0.9
    });
    
    this.headerMesh = new THREE.Mesh(headerGeometry, headerMaterial);
    this.headerMesh.position.set(
      0,
      (this.style.height || 3) / 2 - headerHeight / 2 - 0.05,
      (this.style.depth || 0.2) / 2 + 0.001
    );
    this.add(this.headerMesh);
    
    // Create title text
    if (this.options.title) {
      this.createTitleText();
    }
    
    // Create close button
    if (this.options.closable !== false) {
      this.createCloseButton();
    }
  }

  private createTitleText(): void {
    if (!this.options.title) return;
    
    const titleGeometry = new THREE.PlaneGeometry(
      (this.style.width || 4) - 1,
      0.3
    );
    const titleMaterial = new THREE.MeshBasicMaterial({
      color: this.options.variant === 'terminal' 
        ? YORHA_COLORS.accent.gold 
        : YORHA_COLORS.primary.white,
      transparent: true
    });
    
    this.titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    this.titleMesh.position.set(
      -0.3,
      (this.style.height || 3) / 2 - (this.options.headerHeight || 0.6) / 2 - 0.05,
      (this.style.depth || 0.2) / 2 + 0.002
    );
    
    this.add(this.titleMesh);
  }

  private createCloseButton(): void {
    const buttonSize = 0.2;
    const width = this.style.width || 4;
    const headerHeight = this.options.headerHeight || 0.6;
    
    // Close button (X shape)
    const buttonGroup = new THREE.Group();
    
    // Create X shape with two crossed lines
    const lineGeometry = new THREE.PlaneGeometry(buttonSize * 0.8, 0.03);
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.status.error,
      transparent: true
    });
    
    const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
    line1.rotation.z = Math.PI / 4;
    
    const line2 = new THREE.Mesh(lineGeometry, lineMaterial.clone());
    line2.rotation.z = -Math.PI / 4;
    
    buttonGroup.add(line1);
    buttonGroup.add(line2);
    
    buttonGroup.position.set(
      width / 2 - 0.3,
      (this.style.height || 3) / 2 - headerHeight / 2 - 0.05,
      (this.style.depth || 0.2) / 2 + 0.002
    );
    
    // Add hover effects
    buttonGroup.userData = {
      interactive: true,
      onClick: () => this.close(),
      onHover: () => {
        buttonGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.color.setHex(0xff4444);
          }
        });
      },
      onLeave: () => {
        buttonGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.color.setHex(YORHA_COLORS.status.error);
          }
        });
      }
    };
    
    this.closeButtonMesh = buttonGroup as any;
    this.add(buttonGroup);
  }

  private createFooter(): void {
    const footerHeight = this.options.footerHeight || 0.5;
    const width = this.style.width || 4;
    
    // Create footer background
    const footerGeometry = new THREE.PlaneGeometry(width - 0.1, footerHeight);
    const footerMaterial = new THREE.MeshStandardMaterial({
      color: YORHA_COLORS.primary.grey,
      transparent: true,
      opacity: 0.8
    });
    
    this.footerMesh = new THREE.Mesh(footerGeometry, footerMaterial);
    this.footerMesh.position.set(
      0,
      -(this.style.height || 3) / 2 + footerHeight / 2 + 0.05,
      (this.style.depth || 0.2) / 2 + 0.001
    );
    this.add(this.footerMesh);
  }

  private createGlitchEffect(): void {
    this.glitchEffect = new THREE.Group();
    
    // Create scan lines
    for (let i = 0; i < 10; i++) {
      const lineGeometry = new THREE.PlaneGeometry(
        (this.style.width || 4) + 0.2,
        0.01
      );
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: YORHA_COLORS.accent.gold,
        transparent: true,
        opacity: 0.1
      });
      
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.y = ((this.style.height || 3) / 10) * i - (this.style.height || 3) / 2;
      line.position.z = (this.style.depth || 0.2) / 2 + 0.003;
      
      this.glitchEffect.add(line);
    }
    
    this.add(this.glitchEffect);
    
    // Add glitch animation
    this.addCustomAnimation('glitch', (deltaTime) => {
      if (!this.glitchEffect) return;
      
      this.glitchEffect.children.forEach((line, index) => {
        const time = Date.now() * 0.001;
        const offset = Math.sin(time * 2 + index) * 0.02;
        line.position.x = offset;
        
        if (line instanceof THREE.Mesh && line.material instanceof THREE.MeshBasicMaterial) {
          line.material.opacity = 0.05 + Math.random() * 0.1;
        }
      });
    });
  }

  private static getVariantStyle(variant: string, size: string): Partial<YoRHaStyle> {
    const variantStyles = {
      default: {
        backgroundColor: YORHA_COLORS.primary.beige,
        borderColor: YORHA_COLORS.primary.black,
        borderRadius: 0.1
      },
      alert: {
        backgroundColor: YORHA_COLORS.status.warning,
        borderColor: YORHA_COLORS.status.error,
        borderWidth: 0.04,
        glow: {
          enabled: true,
          color: YORHA_COLORS.status.error,
          intensity: 0.4
        }
      },
      confirm: {
        backgroundColor: YORHA_COLORS.primary.white,
        borderColor: YORHA_COLORS.accent.gold,
        borderWidth: 0.03,
        glow: {
          enabled: true,
          color: YORHA_COLORS.accent.gold,
          intensity: 0.3
        }
      },
      fullscreen: {
        backgroundColor: YORHA_COLORS.primary.black,
        borderColor: YORHA_COLORS.accent.gold,
        borderWidth: 0.05,
        opacity: 0.95
      },
      terminal: {
        backgroundColor: YORHA_COLORS.primary.black,
        borderColor: YORHA_COLORS.accent.gold,
        borderWidth: 0.04,
        textColor: YORHA_COLORS.accent.gold,
        glow: {
          enabled: true,
          color: YORHA_COLORS.accent.gold,
          intensity: 0.5
        },
        animation: {
          type: 'scan' as const,
          duration: 1000,
          loop: true
        }
      }
    };
    
    return variantStyles[variant as keyof typeof variantStyles] || variantStyles.default;
  }

  private static getSizeWidth(size: string): number {
    const sizes = {
      small: 3,
      medium: 5,
      large: 7,
      fullscreen: 12
    };
    return sizes[size as keyof typeof sizes] || sizes.medium;
  }

  private static getSizeHeight(size: string): number {
    const sizes = {
      small: 2,
      medium: 3.5,
      large: 5,
      fullscreen: 8
    };
    return sizes[size as keyof typeof sizes] || sizes.medium;
  }

  // Public methods
  public open(): void {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.visible = true;
    
    // Animate opening
    this.addCustomAnimation('modalOpen', (deltaTime) => {
      this.animationProgress += deltaTime * 4; // 4x speed
      
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.customAnimations.delete('modalOpen');
      }
      
      // Smooth easing
      const eased = this.easeOutBack(this.animationProgress);
      
      // Scale animation
      const scale = 0.8 + (0.2 * eased);
      this.scale.setScalar(scale);
      
      // Opacity animation
      const opacity = eased;
      if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
        this.mesh.material.opacity = opacity;
      }
      
      // Backdrop fade in
      if (this.backdrop?.material instanceof THREE.MeshBasicMaterial) {
        this.backdrop.material.opacity = (this.options.backdrop === 'dark' ? 0.7 : 0.5) * eased;
      }
    });
    
    this.emitEvent('open');
  }

  public close(): void {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.animationProgress = 0;
    
    // Animate closing
    this.addCustomAnimation('modalClose', (deltaTime) => {
      this.animationProgress += deltaTime * 6; // 6x speed for faster close
      
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.visible = false;
        this.customAnimations.delete('modalClose');
        this.emitEvent('closed');
        return;
      }
      
      // Reverse easing
      const eased = 1 - this.easeInBack(this.animationProgress);
      
      // Scale animation
      const scale = 0.8 + (0.2 * eased);
      this.scale.setScalar(scale);
      
      // Opacity animation
      const opacity = eased;
      if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
        this.mesh.material.opacity = opacity;
      }
      
      // Backdrop fade out
      if (this.backdrop?.material instanceof THREE.MeshBasicMaterial) {
        this.backdrop.material.opacity = (this.options.backdrop === 'dark' ? 0.7 : 0.5) * eased;
      }
    });
    
    this.emitEvent('close');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setTitle(title: string): void {
    this.options.title = title;
    
    if (this.titleMesh) {
      // Update title text (placeholder for actual text rendering)
      // In real implementation, this would update the text geometry
    }
  }

  public addContent(object: THREE.Object3D): void {
    this.contentContainer.add(object);
  }

  public removeContent(object: THREE.Object3D): void {
    this.contentContainer.remove(object);
  }

  public setVariant(variant: YoRHaModal3DOptions['variant']): void {
    if (!variant) return;
    
    this.options.variant = variant;
    const newStyle = YoRHaModal3D.getVariantStyle(variant, this.options.size || 'medium');
    this.setStyle(newStyle);
    
    // Recreate glitch effect if switching to/from terminal
    if (variant === 'terminal' && !this.glitchEffect) {
      this.createGlitchEffect();
    } else if (variant !== 'terminal' && this.glitchEffect) {
      this.remove(this.glitchEffect);
      this.glitchEffect = undefined;
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    
    return c3 * t * t * t - c1 * t * t;
  }

  public override dispose(): void {
    super.dispose();
    
    [this.backdrop, this.titleMesh, this.headerMesh, this.footerMesh].forEach(mesh => {
      if (mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    
    if (this.closeButtonMesh) {
      this.closeButtonMesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    if (this.glitchEffect) {
      this.glitchEffect.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}

// Class already exported above