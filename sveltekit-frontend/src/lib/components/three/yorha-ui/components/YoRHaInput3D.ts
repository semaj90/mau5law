/**
 * YoRHa 3D Input Component
 * Text input field with advanced styling and YoRHa aesthetic
 */

import * as THREE from 'three';
import { YoRHa3DComponent, type YoRHaStyle, YORHA_COLORS } from '../YoRHaUI3D';

export interface YoRHaInput3DOptions extends Omit<YoRHaStyle, 'variant'> {
  value?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'search' | 'number';
  variant?: 'default' | 'outlined' | 'filled' | 'ghost' | 'terminal';
  size?: 'small' | 'medium' | 'large';
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  readonly?: boolean;
  required?: boolean;
  error?: boolean;
  success?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  clearable?: boolean;
}

export class YoRHaInput3D extends YoRHa3DComponent {
  private textMesh?: THREE.Mesh;
  private placeholderMesh?: THREE.Mesh;
  private cursorMesh?: THREE.Mesh;
  private iconMesh?: THREE.Mesh;
  private clearButtonMesh?: THREE.Mesh;
  private borderHighlight?: THREE.Mesh;
  private options: YoRHaInput3DOptions;
  
  private currentValue = '';
  private cursorPosition = 0;
  private isFocused = false;
  private isPasswordVisible = false;
  private cursorBlinkTimer = 0;

  constructor(options: YoRHaInput3DOptions = {}) {
    const style = YoRHaInput3D.getVariantStyle(
      options.variant || 'default',
      options.size || 'medium',
      options.error,
      options.success
    );
    
    super({
      ...style,
      ...options,
      // Input-specific defaults
      width: options.width || (options.size === 'small' ? 2.5 : options.size === 'large' ? 4 : 3),
      height: options.height || (options.multiline ? (options.rows || 3) * 0.4 : 0.5),
      depth: options.depth || 0.08,
      backgroundColor: options.backgroundColor || YORHA_COLORS.primary.white,
      borderColor: options.borderColor || YORHA_COLORS.primary.grey,
      borderWidth: options.borderWidth || 0.02,
      borderRadius: options.borderRadius || 0.05,
      // Interactive states
      hover: {
        borderColor: YORHA_COLORS.accent.gold,
        glow: {
          enabled: true,
          color: YORHA_COLORS.accent.gold,
          intensity: 0.2
        },
        ...options.hover
      },
      active: {
        borderColor: YORHA_COLORS.accent.gold,
        borderWidth: 0.03,
        glow: {
          enabled: true,
          color: YORHA_COLORS.accent.gold,
          intensity: 0.4
        },
        ...options.active
      }
    });
    
    this.options = options;
    this.currentValue = options.value || '';
    
    // Create input elements
    this.createInputElements();
    
    // Add focus/blur handling
    this.setupFocusHandling();
    
    // Start cursor blinking animation
    this.startCursorBlink();
  }

  protected createGeometry(): void {
    const width = this.style.width || 3;
    const height = this.style.height || 0.5;
    const depth = this.style.depth || 0.08;
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

  private createInputElements(): void {
    // Create text content
    this.createTextMesh();
    
    // Create placeholder if no value
    if (!this.currentValue && this.options.placeholder) {
      this.createPlaceholder();
    }
    
    // Create cursor
    this.createCursor();
    
    // Create icon if provided
    if (this.options.icon) {
      this.createIcon();
    }
    
    // Create clear button if clearable and has value
    if (this.options.clearable && this.currentValue) {
      this.createClearButton();
    }
    
    // Create border highlight for focus state
    this.createBorderHighlight();
  }

  private createTextMesh(): void {
    const displayValue = this.getDisplayValue();
    if (!displayValue) return;
    
    // Create text geometry (placeholder for actual text rendering)
    const textGeometry = new THREE.PlaneGeometry(
      Math.min(displayValue.length * 0.12, (this.style.width || 3) - 0.4),
      0.2
    );
    const textMaterial = new THREE.MeshBasicMaterial({
      color: this.options.readonly 
        ? YORHA_COLORS.interaction.disabled 
        : (this.style.textColor || YORHA_COLORS.primary.black),
      transparent: true,
      side: THREE.DoubleSide
    });

    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    this.textMesh.position.set(
      this.getTextOffsetX(),
      0,
      (this.style.depth || 0.08) / 2 + 0.001
    );
    
    this.add(this.textMesh);
  }

  private createPlaceholder(): void {
    if (!this.options.placeholder || this.currentValue) return;
    
    const placeholderGeometry = new THREE.PlaneGeometry(
      Math.min(this.options.placeholder.length * 0.1, (this.style.width || 3) - 0.4),
      0.15
    );
    const placeholderMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.primary.grey,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    this.placeholderMesh = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    this.placeholderMesh.position.set(
      this.getTextOffsetX(),
      0,
      (this.style.depth || 0.08) / 2 + 0.001
    );
    
    this.add(this.placeholderMesh);
  }

  private createCursor(): void {
    const cursorGeometry = new THREE.PlaneGeometry(0.02, 0.25);
    const cursorMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.accent.gold,
      transparent: true,
      opacity: 0
    });

    this.cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.cursorMesh.position.set(
      this.getCursorPositionX(),
      0,
      (this.style.depth || 0.08) / 2 + 0.002
    );
    
    this.add(this.cursorMesh);
  }

  private createIcon(): void {
    if (!this.options.icon) return;
    
    const iconGeometry = this.getIconGeometry(this.options.icon);
    const iconMaterial = new THREE.MeshBasicMaterial({
      color: this.options.readonly 
        ? YORHA_COLORS.interaction.disabled 
        : YORHA_COLORS.primary.grey,
      transparent: true
    });

    this.iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    this.iconMesh.position.set(
      this.getIconPositionX(),
      0,
      (this.style.depth || 0.08) / 2 + 0.001
    );
    
    this.add(this.iconMesh);
  }

  private createClearButton(): void {
    if (!this.options.clearable || !this.currentValue) return;
    
    const clearGeometry = new THREE.CircleGeometry(0.08, 8);
    const clearMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.primary.grey,
      transparent: true,
      opacity: 0.7
    });

    this.clearButtonMesh = new THREE.Mesh(clearGeometry, clearMaterial);
    this.clearButtonMesh.position.set(
      (this.style.width || 3) / 2 - 0.15,
      0,
      (this.style.depth || 0.08) / 2 + 0.001
    );
    
    // Add hover effects
    this.clearButtonMesh.userData = {
      interactive: true,
      onClick: () => this.clear(),
      onHover: () => {
        if (this.clearButtonMesh?.material instanceof THREE.MeshBasicMaterial) {
          this.clearButtonMesh.material.opacity = 1;
        }
      },
      onLeave: () => {
        if (this.clearButtonMesh?.material instanceof THREE.MeshBasicMaterial) {
          this.clearButtonMesh.material.opacity = 0.7;
        }
      }
    };
    
    this.add(this.clearButtonMesh);
  }

  private createBorderHighlight(): void {
    const width = (this.style.width || 3) + 0.1;
    const height = (this.style.height || 0.5) + 0.1;
    const highlightGeometry = new THREE.RingGeometry(
      Math.max(width, height) / 2,
      Math.max(width, height) / 2 + 0.02,
      32
    );
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.accent.gold,
      transparent: true,
      opacity: 0
    });

    this.borderHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.borderHighlight.position.z = (this.style.depth || 0.08) / 2 + 0.001;
    
    this.add(this.borderHighlight);
  }

  private getIconGeometry(icon: string): THREE.BufferGeometry {
    const size = 0.15;
    
    switch (icon) {
      case 'search':
        return new THREE.CircleGeometry(size, 16);
      case 'lock':
        return new THREE.BoxGeometry(size, size * 1.2, 0.02);
      case 'email':
        return new THREE.PlaneGeometry(size * 1.4, size);
      case 'user':
        return new THREE.CircleGeometry(size, 16);
      default:
        return new THREE.CircleGeometry(size, 8);
    }
  }

  private setupFocusHandling(): void {
    // Override click handler for focus
    this.userData.onClick = () => this.focus();
    
    // Add keyboard event simulation (in real implementation, use actual keyboard events)
    this.userData.onKeyDown = (key: string) => this.handleKeyInput(key);
  }

  private startCursorBlink(): void {
    this.addCustomAnimation('cursorBlink', (deltaTime) => {
      if (!this.isFocused || !this.cursorMesh) return;
      
      this.cursorBlinkTimer += deltaTime;
      
      // Blink every 0.5 seconds
      const blinkCycle = Math.floor(this.cursorBlinkTimer * 2) % 2;
      if (this.cursorMesh.material instanceof THREE.MeshBasicMaterial) {
        this.cursorMesh.material.opacity = blinkCycle;
      }
    });
  }

  private static getVariantStyle(
    variant: string,
    size: string,
    error?: boolean,
    success?: boolean
  ): Partial<YoRHaStyle> {
    // Size-based styles
    const sizeStyles = {
      small: { fontSize: 0.12 },
      medium: { fontSize: 0.16 },
      large: { fontSize: 0.2 }
    };
    
    // Variant-based styles
    const variantStyles = {
      default: {
        backgroundColor: YORHA_COLORS.primary.white,
        borderColor: YORHA_COLORS.primary.grey,
        textColor: YORHA_COLORS.primary.black
      },
      outlined: {
        backgroundColor: 0x000000,
        opacity: 0.05,
        borderColor: YORHA_COLORS.primary.beige,
        borderWidth: 0.03,
        textColor: YORHA_COLORS.primary.beige
      },
      filled: {
        backgroundColor: YORHA_COLORS.primary.beige,
        borderColor: YORHA_COLORS.primary.grey,
        textColor: YORHA_COLORS.primary.black
      },
      ghost: {
        backgroundColor: 0x000000,
        opacity: 0.1,
        borderColor: 0x000000,
        borderWidth: 0.01,
        textColor: YORHA_COLORS.primary.black
      },
      terminal: {
        backgroundColor: YORHA_COLORS.primary.black,
        borderColor: YORHA_COLORS.accent.gold,
        textColor: YORHA_COLORS.accent.gold,
        glow: {
          enabled: true,
          color: YORHA_COLORS.accent.gold,
          intensity: 0.2
        }
      }
    };
    
    let variantStyle = variantStyles[variant as keyof typeof variantStyles] || variantStyles.default;
    
    // Apply error/success states (use any to bypass complex union types)
    if (error) {
      variantStyle = {
        ...variantStyle,
        borderColor: 0xff6b6b, // YORHA_COLORS.status.error
      } as any;
    } else if (success) {
      variantStyle = {
        ...variantStyle,
        borderColor: 0x90ee90, // YORHA_COLORS.status.success
      } as any;
    }
    
    return {
      ...sizeStyles[size as keyof typeof sizeStyles],
      ...variantStyle
    };
  }

  // Helper methods
  private getDisplayValue(): string {
    if (this.options.type === 'password' && !this.isPasswordVisible) {
      return '•'.repeat(this.currentValue.length);
    }
    return this.currentValue;
  }

  private getTextOffsetX(): number {
    let offset = -(this.style.width || 3) / 2 + 0.2;
    
    // Adjust for icon
    if (this.options.icon && this.options.iconPosition === 'left') {
      offset += 0.3;
    }
    
    return offset;
  }

  private getCursorPositionX(): number {
    const textOffset = this.getTextOffsetX();
    const charWidth = 0.12; // Approximate character width
    return textOffset + (this.cursorPosition * charWidth);
  }

  private getIconPositionX(): number {
    if (this.options.iconPosition === 'right') {
      return (this.style.width || 3) / 2 - 0.3;
    }
    return -(this.style.width || 3) / 2 + 0.2;
  }

  // Public methods
  public focus(): void {
    if (this.options.readonly) return;
    
    this.isFocused = true;
    
    // Update visual state
    this.setStyle({
      borderColor: YORHA_COLORS.accent.gold,
      borderWidth: 0.03
    });
    
    // Show border highlight
    if (this.borderHighlight?.material instanceof THREE.MeshBasicMaterial) {
      this.borderHighlight.material.opacity = 0.3;
    }
    
    // Hide placeholder
    if (this.placeholderMesh) {
      this.placeholderMesh.visible = false;
    }
    
    this.emitEvent('focus', { value: this.currentValue });
  }

  public blur(): void {
    this.isFocused = false;
    
    // Reset visual state
    this.setStyle({
      borderColor: this.options.error 
        ? YORHA_COLORS.status.error 
        : (this.options.success ? YORHA_COLORS.status.success : YORHA_COLORS.primary.grey),
      borderWidth: 0.02
    });
    
    // Hide border highlight
    if (this.borderHighlight?.material instanceof THREE.MeshBasicMaterial) {
      this.borderHighlight.material.opacity = 0;
    }
    
    // Show placeholder if no value
    if (!this.currentValue && this.placeholderMesh) {
      this.placeholderMesh.visible = true;
    }
    
    this.emitEvent('blur', { value: this.currentValue });
  }

  public setValue(value: string): void {
    if (this.options.readonly) return;
    
    const oldValue = this.currentValue;
    this.currentValue = value.substring(0, this.options.maxLength || 255);
    this.cursorPosition = this.currentValue.length;
    
    // Update visual elements
    this.updateTextMesh();
    this.updatePlaceholder();
    this.updateClearButton();
    
    this.emitEvent('input', { value: this.currentValue, oldValue });
  }

  public getValue(): string {
    return this.currentValue;
  }

  public clear(): this {
    this.setValue('');
    return this;
  }

  public setError(error: boolean): void {
    this.options.error = error;
    this.options.success = false;
    
    const newStyle = YoRHaInput3D.getVariantStyle(
      this.options.variant || 'default',
      this.options.size || 'medium',
      error,
      false
    );
    this.setStyle(newStyle);
  }

  public setSuccess(success: boolean): void {
    this.options.success = success;
    this.options.error = false;
    
    const newStyle = YoRHaInput3D.getVariantStyle(
      this.options.variant || 'default',
      this.options.size || 'medium',
      false,
      success
    );
    this.setStyle(newStyle);
  }

  public togglePasswordVisibility(): void {
    if (this.options.type !== 'password') return;
    
    this.isPasswordVisible = !this.isPasswordVisible;
    this.updateTextMesh();
  }

  private handleKeyInput(key: string): void {
    if (this.options.readonly || !this.isFocused) return;
    
    switch (key) {
      case 'Backspace':
        if (this.cursorPosition > 0) {
          this.currentValue = this.currentValue.substring(0, this.cursorPosition - 1) + 
                             this.currentValue.substring(this.cursorPosition);
          this.cursorPosition--;
          this.updateTextMesh();
          this.emitEvent('input', { value: this.currentValue });
        }
        break;
        
      case 'Delete':
        if (this.cursorPosition < this.currentValue.length) {
          this.currentValue = this.currentValue.substring(0, this.cursorPosition) + 
                             this.currentValue.substring(this.cursorPosition + 1);
          this.updateTextMesh();
          this.emitEvent('input', { value: this.currentValue });
        }
        break;
        
      case 'ArrowLeft':
        this.cursorPosition = Math.max(0, this.cursorPosition - 1);
        break;
        
      case 'ArrowRight':
        this.cursorPosition = Math.min(this.currentValue.length, this.cursorPosition + 1);
        break;
        
      case 'Enter':
        this.emitEvent('submit', { value: this.currentValue });
        break;
        
      default:
        if (key.length === 1 && this.currentValue.length < (this.options.maxLength || 255)) {
          this.currentValue = this.currentValue.substring(0, this.cursorPosition) + 
                             key + 
                             this.currentValue.substring(this.cursorPosition);
          this.cursorPosition++;
          this.updateTextMesh();
          this.updatePlaceholder();
          this.updateClearButton();
          this.emitEvent('input', { value: this.currentValue });
        }
        break;
    }
  }

  private updateTextMesh(): void {
    if (this.textMesh) {
      this.remove(this.textMesh);
      this.textMesh.geometry.dispose();
      if (Array.isArray(this.textMesh.material)) {
        this.textMesh.material.forEach(mat => mat.dispose());
      } else {
        this.textMesh.material.dispose();
      }
    }
    
    this.createTextMesh();
  }

  private updatePlaceholder(): void {
    if (this.placeholderMesh) {
      this.placeholderMesh.visible = !this.currentValue && !this.isFocused;
    }
  }

  private updateClearButton(): void {
    const shouldShowClear = this.options.clearable && this.currentValue;
    
    if (shouldShowClear && !this.clearButtonMesh) {
      this.createClearButton();
    } else if (!shouldShowClear && this.clearButtonMesh) {
      this.remove(this.clearButtonMesh);
      this.clearButtonMesh = undefined;
    }
  }

  public override dispose(): void {
    super.dispose();
    
    [this.textMesh, this.placeholderMesh, this.cursorMesh, this.iconMesh, 
     this.clearButtonMesh, this.borderHighlight].forEach(mesh => {
      if (mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }
}

// Class already exported above