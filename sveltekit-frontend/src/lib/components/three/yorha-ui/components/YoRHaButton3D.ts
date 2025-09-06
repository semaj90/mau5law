/**
 * YoRHa 3D Button Component
 * Low-poly button with advanced styling and YoRHa aesthetic
 */

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { YoRHa3DComponent, type YoRHaStyle, YORHA_COLORS } from '../YoRHaUI3D';
import { resolveVariantStyle } from '../theme/yorha-theme-adapter';

export interface YoRHaButton3DOptions extends Omit<YoRHaStyle, 'variant'> {
  text?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  rounded?: boolean;
  loading?: boolean;
  icon?: string; // Icon identifier
  iconPosition?: 'left' | 'right' | 'top' | 'bottom';
}

export class YoRHaButton3D extends YoRHa3DComponent {
  private textMesh?: THREE.Mesh;
  private iconMesh?: THREE.Mesh;
  private loadingSpinner?: THREE.Group;
  private options: YoRHaButton3DOptions;

  constructor(options: YoRHaButton3DOptions = {}) {
    const style = YoRHaButton3D.getVariantStyle(options.variant || 'primary', options.size || 'medium');

    super({
      ...style,
      ...options,
      // Button-specific defaults
      height: options.height || 0.6,
      depth: options.depth || 0.15,
      borderRadius: options.rounded ? 0.3 : (options.borderRadius || 0.05),
      shadow: {
        enabled: true,
        color: YORHA_COLORS.primary.black,
        blur: 0.3,
        intensity: 0.4,
        offsetY: -0.05,
        ...options.shadow
      },
      // Interactive states
      hover: {
        transform: {
          position: new THREE.Vector3(0, 0.02, 0),
          ...options.hover?.transform
        },
        shadow: {
          enabled: true,
          offsetY: -0.08,
          intensity: 0.6,
          ...options.hover?.shadow
        },
        ...options.hover
      },
      active: {
        transform: {
          position: new THREE.Vector3(0, -0.01, 0),
          ...options.active?.transform
        },
        ...options.active
      },
      disabled: {
        backgroundColor: YORHA_COLORS.interaction.disabled,
        opacity: 0.6,
        ...options.disabled
      }
    });

    this.options = options;

    // Add text if provided
    if (options.text) {
      this.createText();
    }

    // Add icon if provided
    if (options.icon) {
      this.createIcon();
    }

    // Add loading state if enabled
    if (options.loading) {
      this.createLoadingSpinner();
    }
  }

  protected createGeometry(): void {
    const width = this.style.width || 2;
    const height = this.style.height || 0.6;
    const depth = this.style.depth || 0.15;
    const radius = this.style.borderRadius || 0.05;

    if (radius > 0) {
      // Create rounded rectangle geometry
      this.geometry = this.createRoundedBoxGeometry(width, height, depth, radius);
    } else {
      // Create simple box geometry
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

  private createText(): void {
    if (!this.options.text) return;

    // Create text using TextGeometry (requires font loader)
    const loader = new FontLoader();

    // For now, use a placeholder - in real implementation, load actual font
    const textGeometry = new THREE.PlaneGeometry(1.5, 0.3);
    const textMaterial = new THREE.MeshBasicMaterial({
      color: this.style.textColor || YORHA_COLORS.primary.black,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    this.textMesh.position.z = (this.style.depth || 0.15) / 2 + 0.01;

    this.add(this.textMesh);
  }

  private createIcon(): void {
    if (!this.options.icon) return;

    // Create simple geometric icon based on identifier
    const iconGeometry = this.getIconGeometry(this.options.icon);
    const iconMaterial = new THREE.MeshStandardMaterial({
      color: this.style.textColor || YORHA_COLORS.primary.black,
    });

    this.iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    this.iconMesh.position.z = (this.style.depth || 0.15) / 2 + 0.01;

    // Position icon based on iconPosition
    this.positionIcon();

    this.add(this.iconMesh);
  }

  private getIconGeometry(icon: string): THREE.BufferGeometry {
    const size = 0.2;

    switch (icon) {
      case 'play':
        // Triangle for play button
        const playShape = new THREE.Shape();
        playShape.moveTo(0, size);
        playShape.lineTo(-size * 0.8, -size * 0.5);
        playShape.lineTo(-size * 0.8, size * 0.5);
        playShape.lineTo(0, size);
        return new THREE.ShapeGeometry(playShape);

      case 'pause':
        // Two rectangles for pause
        return new THREE.PlaneGeometry(size * 0.3, size);

      case 'stop':
        // Square for stop
        return new THREE.PlaneGeometry(size, size);

      case 'arrow-right':
        // Arrow pointing right
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(-size, 0);
        arrowShape.lineTo(size, 0);
        arrowShape.moveTo(size * 0.5, -size * 0.5);
        arrowShape.lineTo(size, 0);
        arrowShape.lineTo(size * 0.5, size * 0.5);
        return new THREE.ShapeGeometry(arrowShape);

      case 'plus':
        // Plus sign
        const plusGroup = new THREE.Group();
        const horizontal = new THREE.PlaneGeometry(size, size * 0.2);
        const vertical = new THREE.PlaneGeometry(size * 0.2, size);
        // Combine geometries (simplified)
        return horizontal;

      default:
        // Default circle
        return new THREE.CircleGeometry(size, 8);
    }
  }

  private positionIcon(): void {
    if (!this.iconMesh || !this.options.iconPosition) return;

    const spacing = 0.3;

    switch (this.options.iconPosition) {
      case 'left':
        this.iconMesh.position.x = -spacing;
        if (this.textMesh) {
          this.textMesh.position.x = spacing * 0.5;
        }
        break;

      case 'right':
        this.iconMesh.position.x = spacing;
        if (this.textMesh) {
          this.textMesh.position.x = -spacing * 0.5;
        }
        break;

      case 'top':
        this.iconMesh.position.y = spacing;
        if (this.textMesh) {
          this.textMesh.position.y = -spacing * 0.5;
        }
        break;

      case 'bottom':
        this.iconMesh.position.y = -spacing;
        if (this.textMesh) {
          this.textMesh.position.y = spacing * 0.5;
        }
        break;
    }
  }

  private createLoadingSpinner(): void {
    this.loadingSpinner = new THREE.Group();

    // Create spinning ring
    const ringGeometry = new THREE.RingGeometry(0.15, 0.2, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: YORHA_COLORS.accent.gold,
      transparent: true,
      opacity: 0.8
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.z = (this.style.depth || 0.15) / 2 + 0.02;

    this.loadingSpinner.add(ring);
    this.add(this.loadingSpinner);

    // Add spinning animation
    this.addCustomAnimation('loading', (deltaTime) => {
      if (this.loadingSpinner) {
        this.loadingSpinner.rotation.z += deltaTime * 5; // 5 radians per second
      }
    });

    // Hide other content during loading
    if (this.textMesh) this.textMesh.visible = false;
    if (this.iconMesh) this.iconMesh.visible = false;
  }

  private static getVariantStyle(variant: string, size: string): Partial<YoRHaStyle> {
    const sizeStyles = {
      small: { width: 1.5, height: 0.5, fontSize: 0.12 },
      medium: { width: 2, height: 0.6, fontSize: 0.16 },
      large: { width: 3, height: 0.8, fontSize: 0.2 }
    } as const;

    const resolved = resolveVariantStyle(variant, { enableGlow: variant === 'accent' });

    return {
      ...sizeStyles[size as keyof typeof sizeStyles],
      backgroundColor: resolved.backgroundColor,
      borderColor: resolved.borderColor,
      textColor: resolved.textColor,
      hover: resolved.hover ? { backgroundColor: resolved.hover.backgroundColor, textColor: resolved.hover.textColor } : undefined,
      glow: resolved.glow,
      opacity: resolved.opacity,
      borderWidth: resolved.borderWidth || (variant === 'ghost' ? 0.03 : 0.02)
    };
  }

  // Public methods
  public setText(text: string): void {
    this.options.text = text;

    if (this.textMesh) {
      this.remove(this.textMesh);
      this.textMesh.geometry.dispose();
      if (Array.isArray(this.textMesh.material)) {
        this.textMesh.material.forEach(mat => mat.dispose());
      } else {
        this.textMesh.material.dispose();
      }
    }

    this.createText();
  }

  public setLoading(loading: boolean): void {
    this.options.loading = loading;

    if (loading && !this.loadingSpinner) {
      this.createLoadingSpinner();
    } else if (!loading && this.loadingSpinner) {
      this.remove(this.loadingSpinner);
      this.loadingSpinner = undefined;

      // Show content again
      if (this.textMesh) this.textMesh.visible = true;
      if (this.iconMesh) this.iconMesh.visible = true;
    }
  }

  public setVariant(variant: YoRHaButton3DOptions['variant']): void {
    if (!variant) return;

    this.options.variant = variant;
    const newStyle = YoRHaButton3D.getVariantStyle(variant, this.options.size || 'medium');
    this.setStyle(newStyle);
  }

  protected onClick(): void {
    if (this.isDisabled || this.options.loading) return;

    super.onClick();

    // Add click animation
    this.addCustomAnimation('clickPulse', (deltaTime) => {
      const time = Date.now() * 0.01;
      const pulse = Math.sin(time) * 0.05 + 1;
      this.mesh.scale.setScalar(pulse);
    });

    // Remove click animation after short time
    setTimeout(() => {
      this.customAnimations.delete('clickPulse');
      this.mesh.scale.setScalar(1);
    }, 200);
  }

  public override dispose(): void {
    super.dispose();

    if (this.textMesh) {
      this.textMesh.geometry.dispose();
      if (Array.isArray(this.textMesh.material)) {
        this.textMesh.material.forEach(mat => mat.dispose());
      } else {
        this.textMesh.material.dispose();
      }
    }

    if (this.iconMesh) {
      this.iconMesh.geometry.dispose();
      if (Array.isArray(this.iconMesh.material)) {
        this.iconMesh.material.forEach(mat => mat.dispose());
      } else {
        this.iconMesh.material.dispose();
      }
    }
  }
}

