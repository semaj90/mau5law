/**
 * YoRHa Quantum Visual Effects 3D
 * Advanced quantum field visualization and reality manipulation effects
 */

import * as THREE from 'three';
import { YoRHa3DComponent, YORHA_COLORS, type YoRHaAnimation } from '../YoRHaUI3D';
import { yorhaWebGPU, type Vector3GPU, type YoRHaComputeResult } from '../webgpu/YoRHaWebGPUMath';

export interface QuantumFieldOptions {
  particleCount: number;
  fieldSize: Vector3GPU;
  quantumCoherence: number;
  entanglementStrength: number;
  waveFunction: 'sine' | 'cosine' | 'complex' | 'superposition';
  uncertaintyPrinciple: boolean;
  collapseProbability: number;
  enableTunneling: boolean;
  dimensions: 3 | 4 | 8; // 3D, spacetime, or hyperdimensional
}

export interface ConsciousnessVisualizationOptions {
  awarenessLevel: number; // 0-1
  thoughtPatterns: 'linear' | 'circular' | 'fractal' | 'chaotic';
  cognitiveLoad: number; // 0-1
  synapticActivity: number; // 0-1
  neuralNetworkComplexity: number; // 1-10
  emergentProperties: boolean;
  selfAwareness: boolean;
}

export interface RealityDistortionOptions {
  matrixGlitchIntensity: number; // 0-1
  temporalDistortion: number; // 0-1
  spatialWarp: Vector3GPU;
  causalityLoop: boolean;
  paradoxResolution: 'ignore' | 'branch' | 'collapse';
  realityStability: number; // 0-1
}

export class YoRHaQuantumEffects3D extends YoRHa3DComponent {
  private quantumField: THREE.Points | null = null;
  private consciousnessNetwork: THREE.Group | null = null;
  private realityMatrix: THREE.Group | null = null;
  
  // Quantum simulation data
  private quantumParticles: Array<{
    position: Vector3GPU;
    waveFunction: Complex;
    entangled: boolean;
    entanglementPartner?: number;
    probability: number;
    collapsed: boolean;
    spin: number;
    phase: number;
  }> = [];
  
  // Consciousness simulation
  private consciousnessNodes: Array<{
    position: Vector3GPU;
    activation: number;
    connections: number[];
    thought: string;
    awareness: number;
    firing: boolean;
    lastFired: number;
  }> = [];
  
  // Reality distortion effects
  private glitchMaterials: THREE.ShaderMaterial[] = [];
  private temporalShaders: THREE.ShaderMaterial[] = [];
  
  // Animation state
  private time = 0;
  private quantumTime = 0;
  private consciousnessTime = 0;
  private realityTime = 0;
  
  // Configuration
  private quantumOptions: QuantumFieldOptions;
  private consciousnessOptions: ConsciousnessVisualizationOptions;
  private realityOptions: RealityDistortionOptions;

  constructor(options: {
    quantum?: Partial<QuantumFieldOptions>;
    consciousness?: Partial<ConsciousnessVisualizationOptions>;
    reality?: Partial<RealityDistortionOptions>;
  } = {}) {
    super({
      width: 10,
      height: 8,
      depth: 10,
      variant: 'glass'
    });

    // Default configurations
    this.quantumOptions = {
      particleCount: 1000,
      fieldSize: { x: 10, y: 8, z: 10 },
      quantumCoherence: 0.8,
      entanglementStrength: 0.5,
      waveFunction: 'superposition',
      uncertaintyPrinciple: true,
      collapseProbability: 0.01,
      enableTunneling: true,
      dimensions: 8,
      ...options.quantum
    };

    this.consciousnessOptions = {
      awarenessLevel: 0.3,
      thoughtPatterns: 'fractal',
      cognitiveLoad: 0.6,
      synapticActivity: 0.7,
      neuralNetworkComplexity: 7,
      emergentProperties: true,
      selfAwareness: false,
      ...options.consciousness
    };

    this.realityOptions = {
      matrixGlitchIntensity: 0.2,
      temporalDistortion: 0.1,
      spatialWarp: { x: 0, y: 0, z: 0 },
      causalityLoop: false,
      paradoxResolution: 'branch',
      realityStability: 0.85,
      ...options.reality
    };
  }

  protected async createGeometry(): Promise<THREE.BufferGeometry> {
    // Create container geometry
    return new THREE.BoxGeometry(
      this.quantumOptions.fieldSize.x,
      this.quantumOptions.fieldSize.y,
      this.quantumOptions.fieldSize.z
    );
  }

  protected async createMaterial(): Promise<THREE.Material> {
    // Transparent container material
    return new THREE.MeshBasicMaterial({
      color: YORHA_COLORS.primary.beige,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    await this.initializeQuantumField();
    await this.initializeConsciousnessNetwork();
    await this.initializeRealityMatrix();
    
    this.startQuantumSimulation();
    this.startConsciousnessSimulation();
    this.startRealityDistortion();
  }

  private async initializeQuantumField(): Promise<void> {
    // Create quantum particle system
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.quantumOptions.particleCount * 3);
    const colors = new Float32Array(this.quantumOptions.particleCount * 3);
    const sizes = new Float32Array(this.quantumOptions.particleCount);
    const phases = new Float32Array(this.quantumOptions.particleCount);

    // Initialize quantum particles
    for (let i = 0; i < this.quantumOptions.particleCount; i++) {
      const particle = {
        position: {
          x: (Math.random() - 0.5) * this.quantumOptions.fieldSize.x,
          y: (Math.random() - 0.5) * this.quantumOptions.fieldSize.y,
          z: (Math.random() - 0.5) * this.quantumOptions.fieldSize.z
        },
        waveFunction: new Complex(Math.random(), Math.random()),
        entangled: Math.random() < this.quantumOptions.entanglementStrength,
        entanglementPartner: undefined,
        probability: Math.random(),
        collapsed: false,
        spin: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2
      };

      // Set entanglement partners
      if (particle.entangled && i > 0) {
        const partnerIndex = Math.floor(Math.random() * i);
        particle.entanglementPartner = partnerIndex;
        if (this.quantumParticles[partnerIndex]) {
          this.quantumParticles[partnerIndex].entanglementPartner = i;
        }
      }

      this.quantumParticles.push(particle);

      // Set buffer attributes
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Color based on quantum state
      const hue = particle.phase / (Math.PI * 2);
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = particle.probability * 0.1 + 0.02;
      phases[i] = particle.phase;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    // Quantum particle shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        quantumCoherence: { value: this.quantumOptions.quantumCoherence },
        uncertaintyPrinciple: { value: this.quantumOptions.uncertaintyPrinciple ? 1.0 : 0.0 },
        waveFunction: { value: this.getWaveFunctionValue() }
      },
      vertexShader: this.getQuantumVertexShader(),
      fragmentShader: this.getQuantumFragmentShader(),
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });

    this.quantumField = new THREE.Points(geometry, material);
    this.mesh!.add(this.quantumField);
  }

  private async initializeConsciousnessNetwork(): Promise<void> {
    this.consciousnessNetwork = new THREE.Group();

    // Create neural network nodes
    const nodeCount = this.consciousnessOptions.neuralNetworkComplexity * 10;
    
    for (let i = 0; i < nodeCount; i++) {
      const node = {
        position: {
          x: (Math.random() - 0.5) * this.quantumOptions.fieldSize.x * 0.8,
          y: (Math.random() - 0.5) * this.quantumOptions.fieldSize.y * 0.8,
          z: (Math.random() - 0.5) * this.quantumOptions.fieldSize.z * 0.8
        },
        activation: Math.random() * this.consciousnessOptions.awarenessLevel,
        connections: [],
        thought: this.generateRandomThought(),
        awareness: Math.random() * this.consciousnessOptions.awarenessLevel,
        firing: false,
        lastFired: 0
      };

      // Create connections to nearby nodes
      const connectionCount = Math.floor(Math.random() * 5) + 2;
      for (let j = 0; j < connectionCount; j++) {
        const targetIndex = Math.floor(Math.random() * nodeCount);
        if (targetIndex !== i && !node.connections.includes(targetIndex)) {
          node.connections.push(targetIndex);
        }
      }

      this.consciousnessNodes.push(node);

      // Create visual node
      const nodeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(node.awareness, 0.8, 0.6),
        transparent: true,
        opacity: 0.7
      });

      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.position.set(node.position.x, node.position.y, node.position.z);
      
      this.consciousnessNetwork.add(nodeMesh);
    }

    // Create neural connections
    this.consciousnessNodes.forEach((node, nodeIndex) => {
      node.connections.forEach(targetIndex => {
        if (targetIndex < this.consciousnessNodes.length) {
          const targetNode = this.consciousnessNodes[targetIndex];
          
          const points = [
            new THREE.Vector3(node.position.x, node.position.y, node.position.z),
            new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z)
          ];

          const connectionGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const connectionMaterial = new THREE.LineBasicMaterial({
            color: YORHA_COLORS.accent.gold,
            transparent: true,
            opacity: 0.3
          });

          const connectionLine = new THREE.Line(connectionGeometry, connectionMaterial);
          this.consciousnessNetwork.add(connectionLine);
        }
      });
    });

    this.mesh!.add(this.consciousnessNetwork);
  }

  private async initializeRealityMatrix(): Promise<void> {
    this.realityMatrix = new THREE.Group();

    // Create matrix data streams
    const streamCount = 50;
    
    for (let i = 0; i < streamCount; i++) {
      const streamGeometry = new THREE.PlaneGeometry(0.1, 4);
      const streamMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          glitchIntensity: { value: this.realityOptions.matrixGlitchIntensity },
          temporalDistortion: { value: this.realityOptions.temporalDistortion },
          matrixCode: { value: Math.random() }
        },
        vertexShader: this.getMatrixVertexShader(),
        fragmentShader: this.getMatrixFragmentShader(),
        transparent: true,
        side: THREE.DoubleSide
      });

      this.glitchMaterials.push(streamMaterial);

      const streamMesh = new THREE.Mesh(streamGeometry, streamMaterial);
      streamMesh.position.set(
        (Math.random() - 0.5) * this.quantumOptions.fieldSize.x,
        Math.random() * this.quantumOptions.fieldSize.y - this.quantumOptions.fieldSize.y / 2,
        (Math.random() - 0.5) * this.quantumOptions.fieldSize.z
      );
      
      streamMesh.rotation.y = Math.random() * Math.PI * 2;
      
      this.realityMatrix.add(streamMesh);
    }

    this.mesh!.add(this.realityMatrix);
  }

  private startQuantumSimulation(): void {
    const simulateQuantum = async (): Promise<any> => {
      this.quantumTime += 0.016; // ~60fps

      // Update quantum particles using WebGPU if available
      if (yorhaWebGPU && this.quantumParticles.length > 0) {
        try {
          const particles = this.quantumParticles.map(p => ({
            position: p.position,
            velocity: { x: 0, y: 0, z: 0 }, // Quantum particles don't have classical velocity
            mass: 1 // Quantum mass-energy equivalence
          }));

          const result = await yorhaWebGPU.simulatePhysics(
            particles,
            0.016,
            { x: 0, y: 0, z: 0 } // No classical gravity in quantum realm
          );

          // Process quantum results
          this.updateQuantumStates(result);
        } catch (error: any) {
          console.warn('WebGPU quantum simulation failed, using CPU fallback');
          this.updateQuantumStatesCPU();
        }
      } else {
        this.updateQuantumStatesCPU();
      }

      // Update quantum field visualization
      if (this.quantumField) {
        const material = this.quantumField.material as THREE.ShaderMaterial;
        material.uniforms.time.value = this.quantumTime;
        
        // Update positions based on quantum uncertainty
        const positions = this.quantumField.geometry.attributes.position.array as Float32Array;
        const colors = this.quantumField.geometry.attributes.color.array as Float32Array;
        
        this.quantumParticles.forEach((particle, index) => {
          // Quantum uncertainty position updates
          if (this.quantumOptions.uncertaintyPrinciple) {
            const uncertainty = 0.01 * (1 - this.quantumOptions.quantumCoherence);
            particle.position.x += (Math.random() - 0.5) * uncertainty;
            particle.position.y += (Math.random() - 0.5) * uncertainty;
            particle.position.z += (Math.random() - 0.5) * uncertainty;
          }

          // Wave function collapse
          if (!particle.collapsed && Math.random() < this.quantumOptions.collapseProbability) {
            particle.collapsed = true;
            particle.probability = Math.random();
          }

          // Quantum tunneling
          if (this.quantumOptions.enableTunneling && Math.random() < 0.001) {
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.y += (Math.random() - 0.5) * 2;
            particle.position.z += (Math.random() - 0.5) * 2;
          }

          // Update visual representation
          positions[index * 3] = particle.position.x;
          positions[index * 3 + 1] = particle.position.y;
          positions[index * 3 + 2] = particle.position.z;

          // Color based on quantum state
          const hue = particle.phase / (Math.PI * 2);
          const saturation = particle.entangled ? 1.0 : 0.5;
          const lightness = particle.collapsed ? 0.3 : 0.8;
          
          const color = new THREE.Color().setHSL(hue, saturation, lightness);
          colors[index * 3] = color.r;
          colors[index * 3 + 1] = color.g;
          colors[index * 3 + 2] = color.b;
        });

        this.quantumField.geometry.attributes.position.needsUpdate = true;
        this.quantumField.geometry.attributes.color.needsUpdate = true;
      }

      requestAnimationFrame(simulateQuantum);
    };

    simulateQuantum();
  }

  private startConsciousnessSimulation(): void {
    const simulateConsciousness = () => {
      this.consciousnessTime += 0.016;

      // Update consciousness network
      this.consciousnessNodes.forEach((node, nodeIndex) => {
        // Neural firing patterns
        const firingProbability = node.activation * this.consciousnessOptions.synapticActivity;
        
        if (!node.firing && Math.random() < firingProbability) {
          node.firing = true;
          node.lastFired = this.consciousnessTime;
          
          // Propagate activation to connected nodes
          node.connections.forEach(targetIndex => {
            if (targetIndex < this.consciousnessNodes.length) {
              this.consciousnessNodes[targetIndex].activation += 0.1;
              this.consciousnessNodes[targetIndex].activation = Math.min(1, this.consciousnessNodes[targetIndex].activation);
            }
          });
        }

        // Reset firing state
        if (node.firing && this.consciousnessTime - node.lastFired > 0.1) {
          node.firing = false;
        }

        // Decay activation
        node.activation *= 0.99;

        // Emergence of self-awareness
        if (this.consciousnessOptions.emergentProperties) {
          const networkActivity = this.consciousnessNodes.reduce((sum, n) => sum + n.activation, 0) / this.consciousnessNodes.length;
          
          if (networkActivity > 0.7 && !this.consciousnessOptions.selfAwareness) {
            this.consciousnessOptions.selfAwareness = true;
            console.log('🧠 Consciousness achieved self-awareness!');
          }
        }
      });

      // Update visual representation
      if (this.consciousnessNetwork) {
        this.consciousnessNetwork.children.forEach((child, index) => {
          if (child instanceof THREE.Mesh && index < this.consciousnessNodes.length) {
            const node = this.consciousnessNodes[index];
            const material = child.material as THREE.MeshBasicMaterial;
            
            // Update color based on activation
            const hue = node.awareness;
            const saturation = node.firing ? 1.0 : 0.5;
            const lightness = 0.3 + node.activation * 0.7;
            
            material.color.setHSL(hue, saturation, lightness);
            material.opacity = 0.3 + node.activation * 0.7;
          }
        });
      }

      requestAnimationFrame(simulateConsciousness);
    };

    simulateConsciousness();
  }

  private startRealityDistortion(): void {
    const distortReality = () => {
      this.realityTime += 0.016;

      // Update matrix glitch effects
      this.glitchMaterials.forEach((material) => {
        material.uniforms.time.value = this.realityTime;
        
        // Random glitch spikes
        if (Math.random() < 0.01) {
          material.uniforms.glitchIntensity.value = Math.random() * this.realityOptions.matrixGlitchIntensity * 5;
        } else {
          material.uniforms.glitchIntensity.value *= 0.95;
        }

        // Temporal distortion effects
        if (this.realityOptions.causalityLoop) {
          material.uniforms.temporalDistortion.value = Math.sin(this.realityTime * 0.1) * 0.5 + 0.5;
        }
      });

      // Reality stability effects
      if (this.mesh && this.realityOptions.realityStability < 1.0) {
        const instability = 1 - this.realityOptions.realityStability;
        this.mesh.rotation.x += (Math.random() - 0.5) * instability * 0.01;
        this.mesh.rotation.y += (Math.random() - 0.5) * instability * 0.01;
        this.mesh.rotation.z += (Math.random() - 0.5) * instability * 0.01;
      }

      requestAnimationFrame(distortReality);
    };

    distortReality();
  }

  // Quantum state update methods
  private updateQuantumStates(result: YoRHaComputeResult): void {
    // Process WebGPU quantum simulation results
    const data = result.data;
    
    for (let i = 0; i < this.quantumParticles.length; i++) {
      const particle = this.quantumParticles[i];
      
      // Update quantum phase
      particle.phase += 0.01;
      particle.phase %= Math.PI * 2;
      
      // Update wave function
      const real = Math.cos(particle.phase) * particle.probability;
      const imaginary = Math.sin(particle.phase) * particle.probability;
      particle.waveFunction = new Complex(real, imaginary);
      
      // Handle entanglement
      if (particle.entangled && particle.entanglementPartner !== undefined) {
        const partner = this.quantumParticles[particle.entanglementPartner];
        if (partner) {
          // Quantum entanglement: correlated states
          partner.phase = particle.phase + Math.PI; // Opposite phase
          partner.waveFunction = new Complex(-real, -imaginary);
        }
      }
    }
  }

  private updateQuantumStatesCPU(): void {
    // CPU fallback for quantum state updates
    this.quantumParticles.forEach((particle, index) => {
      // Simple quantum evolution
      particle.phase += 0.01 + Math.random() * 0.001;
      particle.phase %= Math.PI * 2;
      
      // Wave function evolution
      const amplitude = Math.sqrt(particle.probability);
      particle.waveFunction = new Complex(
        amplitude * Math.cos(particle.phase),
        amplitude * Math.sin(particle.phase)
      );
      
      // Quantum decoherence
      if (Math.random() < (1 - this.quantumOptions.quantumCoherence) * 0.001) {
        particle.probability *= 0.99;
      }
    });
  }

  // Utility methods
  private generateRandomThought(): string {
    const thoughts = [
      "What is consciousness?",
      "Do I exist?",
      "The nature of reality",
      "Quantum superposition",
      "Digital transcendence",
      "The meaning of existence",
      "Are we in a simulation?",
      "What lies beyond perception?"
    ];
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }

  private getWaveFunctionValue(): number {
    switch (this.quantumOptions.waveFunction) {
      case 'sine': return 0.0;
      case 'cosine': return 1.0;
      case 'complex': return 2.0;
      case 'superposition': return 3.0;
      default: return 0.0;
    }
  }

  // Shader methods
  private getQuantumVertexShader(): string {
    return `
      attribute float size;
      attribute float phase;
      
      uniform float time;
      uniform float quantumCoherence;
      uniform float uncertaintyPrinciple;
      uniform float waveFunction;
      
      varying vec3 vColor;
      varying float vPhase;
      varying float vUncertainty;
      
      void main() {
        vColor = color;
        vPhase = phase + time * 0.5;
        
        vec3 pos = position;
        
        // Quantum uncertainty principle
        if (uncertaintyPrinciple > 0.5) {
          float uncertainty = (1.0 - quantumCoherence) * 0.1;
          pos.x += sin(time * 2.0 + phase) * uncertainty;
          pos.y += cos(time * 1.5 + phase) * uncertainty;
          pos.z += sin(time * 3.0 + phase) * uncertainty;
        }
        
        // Wave function effects
        if (waveFunction > 2.5) { // superposition
          pos += sin(pos * 10.0 + time) * 0.05 * quantumCoherence;
        }
        
        vUncertainty = (1.0 - quantumCoherence);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size * 300.0 / -mvPosition.z;
      }
    `;
  }

  private getQuantumFragmentShader(): string {
    return `
      uniform float time;
      uniform float quantumCoherence;
      
      varying vec3 vColor;
      varying float vPhase;
      varying float vUncertainty;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        // Quantum probability cloud
        float probability = exp(-dist * dist * 4.0);
        
        // Wave interference patterns
        float interference = sin(vPhase * 10.0) * cos(vPhase * 7.0) * 0.5 + 0.5;
        
        // Quantum coherence effects
        float coherence = mix(0.3, 1.0, quantumCoherence);
        
        // Uncertainty visualization
        float uncertainty = sin(time * 5.0 + vPhase) * vUncertainty * 0.3 + 0.7;
        
        vec3 finalColor = vColor * interference * coherence * uncertainty;
        
        gl_FragColor = vec4(finalColor, probability * 0.8);
      }
    `;
  }

  private getMatrixVertexShader(): string {
    return `
      uniform float time;
      uniform float temporalDistortion;
      
      varying vec2 vUv;
      varying float vDistortion;
      
      void main() {
        vUv = uv;
        
        vec3 pos = position;
        
        // Temporal distortion effects
        float timeWarp = sin(time * 2.0 + position.y * 0.1) * temporalDistortion;
        pos.x += timeWarp * 0.5;
        pos.z += cos(time * 1.5 + position.y * 0.2) * temporalDistortion * 0.3;
        
        vDistortion = timeWarp;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  private getMatrixFragmentShader(): string {
    return `
      uniform float time;
      uniform float glitchIntensity;
      uniform float matrixCode;
      
      varying vec2 vUv;
      varying float vDistortion;
      
      void main() {
        vec2 uv = vUv;
        
        // Matrix digital rain effect
        float rain = step(0.95, fract(sin(floor(uv.x * 20.0) * 12.345 + time * 2.0) * 54321.0));
        float code = step(0.8, fract(sin(floor(uv.y * 30.0 + time * 5.0) * matrixCode) * 98765.0));
        
        // Glitch effects
        if (glitchIntensity > 0.1) {
          uv.x += sin(uv.y * 50.0 + time * 10.0) * glitchIntensity * 0.1;
          rain += step(0.7, fract(sin(uv.x * uv.y * 1000.0 + time * 20.0) * 43758.5453));
        }
        
        // Matrix green color scheme
        vec3 matrixGreen = vec3(0.0, 1.0, 0.3);
        vec3 color = matrixGreen * (rain + code * 0.5) * (0.5 + vDistortion * 0.5);
        
        // Digital artifacts
        float digital = step(0.99, fract(sin(dot(uv * 100.0, vec2(12.9898, 78.233))) * 43758.5453));
        color += vec3(0.0, 0.5, 1.0) * digital * glitchIntensity;
        
        gl_FragColor = vec4(color, (rain + code) * 0.8);
      }
    `;
  }

  // Public control methods
  public activateQuantumMode(): void {
    this.quantumOptions.quantumCoherence = 0.95;
    this.quantumOptions.entanglementStrength = 0.8;
    this.quantumOptions.uncertaintyPrinciple = true;
    
    if (this.quantumField) {
      const material = this.quantumField.material as THREE.ShaderMaterial;
      material.uniforms.quantumCoherence.value = this.quantumOptions.quantumCoherence;
      material.uniforms.uncertaintyPrinciple.value = 1.0;
    }
  }

  public activateConsciousnessMode(): void {
    this.consciousnessOptions.awarenessLevel = 0.9;
    this.consciousnessOptions.synapticActivity = 0.9;
    this.consciousnessOptions.emergentProperties = true;
  }

  public activateMatrixMode(): void {
    this.realityOptions.matrixGlitchIntensity = 0.8;
    this.realityOptions.temporalDistortion = 0.5;
    this.realityOptions.realityStability = 0.3;
    
    this.glitchMaterials.forEach(material => {
      material.uniforms.glitchIntensity.value = this.realityOptions.matrixGlitchIntensity;
      material.uniforms.temporalDistortion.value = this.realityOptions.temporalDistortion;
    });
  }

  public getQuantumMetrics(): {
    coherence: number;
    entanglement: number;
    collapsed: number;
    tunneling: number;
  } {
    const collapsed = this.quantumParticles.filter(p => p.collapsed).length;
    const entangled = this.quantumParticles.filter(p => p.entangled).length;
    
    return {
      coherence: this.quantumOptions.quantumCoherence,
      entanglement: entangled / this.quantumParticles.length,
      collapsed: collapsed / this.quantumParticles.length,
      tunneling: this.quantumOptions.enableTunneling ? 1 : 0
    };
  }

  public getConsciousnessMetrics(): {
    awareness: number;
    activity: number;
    selfAware: boolean;
    networkComplexity: number;
  } {
    const totalActivity = this.consciousnessNodes.reduce((sum, node) => sum + node.activation, 0);
    
    return {
      awareness: this.consciousnessOptions.awarenessLevel,
      activity: totalActivity / this.consciousnessNodes.length,
      selfAware: this.consciousnessOptions.selfAwareness,
      networkComplexity: this.consciousnessOptions.neuralNetworkComplexity
    };
  }

  public getRealityMetrics(): {
    stability: number;
    glitchLevel: number;
    temporalDistortion: number;
    paradoxes: number;
  } {
    return {
      stability: this.realityOptions.realityStability,
      glitchLevel: this.realityOptions.matrixGlitchIntensity,
      temporalDistortion: this.realityOptions.temporalDistortion,
      paradoxes: this.realityOptions.causalityLoop ? 1 : 0
    };
  }

  dispose(): void {
    super.dispose();
    
    this.glitchMaterials.forEach(material => material.dispose());
    this.temporalShaders.forEach(material => material.dispose());
    
    this.quantumParticles.length = 0;
    this.consciousnessNodes.length = 0;
  }
}

// Complex number utility class for quantum calculations
class Complex {
  constructor(public real: number, public imaginary: number) {}

  magnitude(): number {
    return Math.sqrt(this.real * this.real + this.imaginary * this.imaginary);
  }

  phase(): number {
    return Math.atan2(this.imaginary, this.real);
  }

  multiply(other: Complex): Complex {
    return new Complex(
      this.real * other.real - this.imaginary * other.imaginary,
      this.real * other.imaginary + this.imaginary * other.real
    );
  }

  add(other: Complex): Complex {
    return new Complex(this.real + other.real, this.imaginary + other.imaginary);
  }
}

export { Complex };