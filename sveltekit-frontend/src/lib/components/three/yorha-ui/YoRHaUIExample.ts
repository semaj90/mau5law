/**
 * YoRHa 3D UI Component Library Example
 * Comprehensive demonstration of the 3D UI system with YoRHa aesthetic
 */

import * as THREE from 'three';
import { YoRHaButton3D } from './components/YoRHaButton3D.js';
import { YoRHaPanel3D } from './components/YoRHaPanel3D.js';
import { YoRHaInput3D } from './components/YoRHaInput3D.js';
import { YoRHaModal3D } from './components/YoRHaModal3D.js';
import { YoRHaLayout3D, YoRHaLayoutPresets } from './YoRHaLayout3D.js';
import { YORHA_COLORS } from './YoRHaUI3D.js';
import { EventEmitter } from "events";

export class YoRHaUIExample {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private animationId?: number;
  
  private mainLayout!: YoRHaLayout3D;
  private modal?: YoRHaModal3D;
  private hoveredObject?: THREE.Object3D;
  private clickedObject?: THREE.Object3D;

  constructor(container: HTMLElement) {
    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupRenderer(container);
    this.setupScene();
    this.setupLighting();
    this.setupCamera();
    this.setupEventListeners(container);
    
    // Create the main layout and UI components
    this.createMainInterface();
    
    // Start the render loop
    this.animate();
  }

  private setupRenderer(container: HTMLElement): void {
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(YORHA_COLORS.primary.black, 0.9);
    
    container.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    // Add subtle background gradient
    const gradientGeometry = new THREE.PlaneGeometry(50, 30);
    const gradientMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(YORHA_COLORS.primary.black) },
        bottomColor: { value: new THREE.Color(YORHA_COLORS.primary.grey) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
      `
    });
    
    const background = new THREE.Mesh(gradientGeometry, gradientMaterial);
    background.position.z = -10;
    this.scene.add(background);
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(YORHA_COLORS.primary.white, 0.4);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(YORHA_COLORS.accent.gold, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Accent lighting for YoRHa aesthetic
    const accentLight1 = new THREE.PointLight(YORHA_COLORS.accent.gold, 0.3, 10);
    accentLight1.position.set(-3, 2, 3);
    this.scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(YORHA_COLORS.accent.amber, 0.2, 8);
    accentLight2.position.set(3, -2, 2);
    this.scene.add(accentLight2);
  }

  private setupCamera(): void {
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(container: HTMLElement): void {
    // Mouse events
    container.addEventListener('mousemove', this.onMouseMove.bind(this));
    container.addEventListener('click', this.onClick.bind(this));
    
    // Keyboard events (for input components)
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    
    // Resize handling
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createMainInterface(): void {
    // Create main layout container
    this.mainLayout = YoRHaLayoutPresets.createFlexColumn(0.4);
    this.scene.add(this.mainLayout);

    // Create header panel with title and controls
    this.createHeader();
    
    // Create main content area with form
    this.createMainContent();
    
    // Create footer with action buttons
    this.createFooter();
    
    // Create floating action buttons
    this.createFloatingActions();

    // Update layout
    this.mainLayout.updateLayout();
  }

  private createHeader(): void {
    // Header panel
    const headerPanel = new YoRHaPanel3D({
      title: 'YoRHa Interface System',
      variant: 'terminal',
      width: 8,
      height: 1.2,
      showCloseButton: false,
      glow: {
        enabled: true,
        color: YORHA_COLORS.accent.gold,
        intensity: 0.3
      }
    });

    // Header layout for controls
    const headerLayout = YoRHaLayoutPresets.createToolbar();
    headerPanel.addContent(headerLayout);

    // System status indicators
    const statusButton = new YoRHaButton3D({
      text: 'System Status: OPERATIONAL',
      variant: 'ghost',
      size: 'small',
      textColor: YORHA_COLORS.status.success
    });

    const settingsButton = new YoRHaButton3D({
      text: 'Settings',
      variant: 'secondary',
      size: 'small',
      icon: 'gear'
    });

    headerLayout.addChild(statusButton);
    headerLayout.addChild(settingsButton);

    this.mainLayout.addChild(headerPanel, { alignSelf: 'stretch' });
  }

  private createMainContent(): void {
    // Main content panel
    const contentPanel = new YoRHaPanel3D({
      title: 'Data Input Terminal',
      variant: 'default',
      width: 8,
      height: 4.5,
      scrollable: true,
      resizable: true
    });

    // Form layout
    const formLayout = YoRHaLayoutPresets.createForm();
    contentPanel.addContent(formLayout);

    // Create form inputs
    const nameInput = new YoRHaInput3D({
      placeholder: 'Enter identification code...',
      variant: 'outlined',
      size: 'medium',
      icon: 'user',
      iconPosition: 'left',
      clearable: true,
      width: 6
    });

    const passwordInput = new YoRHaInput3D({
      placeholder: 'Security passphrase...',
      type: 'password',
      variant: 'outlined',
      size: 'medium',
      icon: 'lock',
      iconPosition: 'left',
      width: 6
    });

    const emailInput = new YoRHaInput3D({
      placeholder: 'Communication channel...',
      type: 'email',
      variant: 'outlined',
      size: 'medium',
      icon: 'email',
      iconPosition: 'left',
      clearable: true,
      width: 6
    });

    const messageInput = new YoRHaInput3D({
      placeholder: 'Mission parameters...',
      variant: 'filled',
      multiline: true,
      rows: 3,
      maxLength: 500,
      width: 6
    });

    // Add inputs to form
    formLayout.addChild(nameInput, { alignSelf: 'stretch' });
    formLayout.addChild(passwordInput, { alignSelf: 'stretch' });
    formLayout.addChild(emailInput, { alignSelf: 'stretch' });
    formLayout.addChild(messageInput, { alignSelf: 'stretch' });

    // Add event listeners
    nameInput.addEventListener('input', (event: any) => {
      console.log('Name input:', event.data?.value);
    });

    this.mainLayout.addChild(contentPanel, { flex: 1, alignSelf: 'stretch' });
  }

  private createFooter(): void {
    // Footer layout for action buttons
    const footerLayout = YoRHaLayoutPresets.createFlexRow(0.3);

    // Action buttons
    const submitButton = new YoRHaButton3D({
      text: 'Execute Command',
      variant: 'primary',
      size: 'large',
      icon: 'play',
      iconPosition: 'left'
    });

    const cancelButton = new YoRHaButton3D({
      text: 'Abort',
      variant: 'danger',
      size: 'large'
    });

    const helpButton = new YoRHaButton3D({
      text: 'System Manual',
      variant: 'secondary',
      size: 'medium',
      icon: 'help'
    });

    // Add event listeners
    submitButton.addEventListener('click', () => {
      this.showSubmissionModal();
    });

    cancelButton.addEventListener('click', () => {
      this.showConfirmationModal();
    });

    helpButton.addEventListener('click', () => {
      this.showHelpModal();
    });

    footerLayout.addChild(submitButton);
    footerLayout.addChild(cancelButton);
    footerLayout.addChild(helpButton);

    this.mainLayout.addChild(footerLayout, { alignSelf: 'center' });
  }

  private createFloatingActions(): void {
    // Floating notification button
    const notificationButton = new YoRHaButton3D({
      text: '3',
      variant: 'accent',
      size: 'small',
      rounded: true,
      glow: {
        enabled: true,
        color: YORHA_COLORS.accent.gold,
        intensity: 0.5
      }
    });

    notificationButton.position.set(6, 3, 1);
    this.scene.add(notificationButton);

    // Add pulsing animation
    notificationButton.addCustomAnimation('pulse', (deltaTime) => {
      const time = Date.now() * 0.003;
      const scale = 1 + Math.sin(time) * 0.1;
      notificationButton.scale.setScalar(scale);
    });
  }

  private showSubmissionModal(): void {
    this.modal = new YoRHaModal3D({
      title: 'Command Execution',
      variant: 'confirm',
      size: 'medium',
      closable: true,
      showHeader: true,
      showFooter: true
    });

    // Add content to modal
    const modalLayout = YoRHaLayoutPresets.createDialog();
    
    const messagePanel = new YoRHaPanel3D({
      variant: 'glass',
      width: 4,
      height: 1.5
    });

    const confirmButton = new YoRHaButton3D({
      text: 'Confirm Execution',
      variant: 'primary',
      size: 'medium'
    });

    const cancelButton = new YoRHaButton3D({
      text: 'Cancel',
      variant: 'secondary',
      size: 'medium'
    });

    confirmButton.addEventListener('click', () => {
      this.modal?.close();
      this.showSuccessModal();
    });

    cancelButton.addEventListener('click', () => {
      this.modal?.close();
    });

    modalLayout.addChild(messagePanel);
    modalLayout.addChild(confirmButton);
    modalLayout.addChild(cancelButton);

    this.modal.addContent(modalLayout);
    this.scene.add(this.modal);
    this.modal.open();

    this.modal.addEventListener('closed', () => {
      if (this.modal) {
        this.scene.remove(this.modal);
        this.modal.dispose();
        this.modal = undefined;
      }
    });
  }

  private showConfirmationModal(): void {
    this.modal = new YoRHaModal3D({
      title: 'Abort Operation',
      variant: 'alert',
      size: 'small',
      closable: true
    });

    const modalLayout = YoRHaLayoutPresets.createDialog();
    
    const confirmButton = new YoRHaButton3D({
      text: 'Abort',
      variant: 'danger',
      size: 'medium'
    });

    confirmButton.addEventListener('click', () => {
      this.modal?.close();
    });

    modalLayout.addChild(confirmButton);
    this.modal.addContent(modalLayout);
    this.scene.add(this.modal);
    this.modal.open();

    this.modal.addEventListener('closed', () => {
      if (this.modal) {
        this.scene.remove(this.modal);
        this.modal.dispose();
        this.modal = undefined;
      }
    });
  }

  private showHelpModal(): void {
    this.modal = new YoRHaModal3D({
      title: 'System Documentation',
      variant: 'terminal',
      size: 'large',
      closable: true
    });

    const modalLayout = YoRHaLayoutPresets.createForm();
    
    const helpPanel = new YoRHaPanel3D({
      variant: 'terminal',
      width: 6,
      height: 4
    });

    modalLayout.addChild(helpPanel);
    this.modal.addContent(modalLayout);
    this.scene.add(this.modal);
    this.modal.open();

    this.modal.addEventListener('closed', () => {
      if (this.modal) {
        this.scene.remove(this.modal);
        this.modal.dispose();
        this.modal = undefined;
      }
    });
  }

  private showSuccessModal(): void {
    this.modal = new YoRHaModal3D({
      title: 'Command Executed Successfully',
      variant: 'default',
      size: 'medium',
      closable: true
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
      this.modal?.close();
    }, 3000);

    this.scene.add(this.modal);
    this.modal.open();

    this.modal.addEventListener('closed', () => {
      if (this.modal) {
        this.scene.remove(this.modal);
        this.modal.dispose();
        this.modal = undefined;
      }
    });
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Handle hover effects
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (this.hoveredObject) {
      // Trigger leave event on previously hovered object
      if (this.hoveredObject.userData.onLeave) {
        this.hoveredObject.userData.onLeave();
      }
      this.hoveredObject = undefined;
    }

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData.interactive) {
        this.hoveredObject = object;
        this.renderer.domElement.style.cursor = 'pointer';
        
        if (object.userData.onHover) {
          object.userData.onHover();
        }
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private onClick(event: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData.interactive && object.userData.onClick) {
        object.userData.onClick();
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Handle keyboard input for focused components
    // This would be expanded to work with actual focused input components
    console.log('Key pressed:', event.key);
  }

  private onWindowResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    // Update layouts
    this.mainLayout.updateLayout();

    // Update all components with custom animations
    this.scene.traverse((object) => {
      if (object instanceof YoRHaButton3D || 
          object instanceof YoRHaPanel3D || 
          object instanceof YoRHaInput3D || 
          object instanceof YoRHaModal3D) {
        // Components handle their own animations internally
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Dispose of all components
    this.scene.traverse((object) => {
      if (object instanceof YoRHaButton3D || 
          object instanceof YoRHaPanel3D || 
          object instanceof YoRHaInput3D || 
          object instanceof YoRHaModal3D) {
        object.dispose();
      }
    });

    this.mainLayout.dispose();
    
    // Dispose of Three.js resources
    this.renderer.dispose();
  }
}

// Usage example
export function createYoRHaUIDemo(container: HTMLElement): YoRHaUIExample {
  return new YoRHaUIExample(container);
}

// YoRHaUIExample already exported above