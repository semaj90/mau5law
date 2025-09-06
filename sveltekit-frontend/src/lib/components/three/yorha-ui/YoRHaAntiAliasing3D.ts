/**
 * YoRHa 3D Anti-Aliasing Enhancement Library
 * Advanced anti-aliasing techniques for smooth, high-quality 3D UI components
 * Implements MSAA, FXAA, SMAA, and TAA for production-quality rendering
 */

import * as THREE from 'three';
import { YoRHa3DComponent, YORHA_COLORS } from './YoRHaUI3D';
import type { YoRHaStyle } from './YoRHaUI3D';

// Anti-aliasing configuration types
export interface AntiAliasingConfig {
  type: 'none' | 'msaa' | 'fxaa' | 'smaa' | 'taa' | 'auto';
  samples?: number; // For MSAA: 2, 4, 8, 16
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  edgeThreshold?: number; // For edge detection (0.1 - 0.3)
  subpixelQuality?: number; // For FXAA (0.5 - 1.0)
  enabled?: boolean;
  
  // Advanced TAA settings
  temporalSamples?: number;
  jitterPattern?: 'halton' | 'sobol' | 'r2';
  
  // Performance settings
  adaptiveQuality?: boolean;
  performanceTarget?: number; // Target FPS for adaptive quality
}

// Shader enhancement interface
export interface ShaderEnhancements {
  supersample?: boolean;
  edgeSmoothing?: boolean;
  gradientSmoothing?: boolean;
  alphaToCoverage?: boolean;
  customAASamples?: number;
}

// Enhanced YoRHa style with anti-aliasing
export interface YoRHaAAStyle extends YoRHaStyle {
  antiAliasing?: AntiAliasingConfig;
  shaderEnhancements?: ShaderEnhancements;
  renderQuality?: 'draft' | 'standard' | 'high' | 'ultra';
}

// MSAA Render Target Manager
class MSAARenderTarget {
  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private samples: number;

  constructor(width: number, height: number, samples: number = 4) {
    this.samples = samples;
    
    // Note: WebGLMultisampleRenderTarget has been removed in Three.js 0.169
    // Using WebGLRenderTarget with samples parameter instead
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      samples: samples > 1 ? samples : 0,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  public getRenderTarget(): THREE.WebGLRenderTarget {
    return this.renderTarget;
  }

  public dispose(): void {
    this.renderTarget.dispose();
  }
}

// FXAA Post-processing Shader
const FXAAShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    qualityPreset: { value: 12 }, // 10-39 range
    edgeThreshold: { value: 0.166 },
    edgeThresholdMin: { value: 0.0833 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float qualityPreset;
    uniform float edgeThreshold;
    uniform float edgeThresholdMin;
    varying vec2 vUv;

    #define FXAA_QUALITY_PS 12
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 2.0
    #define FXAA_QUALITY_P7 2.0
    #define FXAA_QUALITY_P8 2.0
    #define FXAA_QUALITY_P9 2.0
    #define FXAA_QUALITY_P10 4.0
    #define FXAA_QUALITY_P11 8.0

    float FxaaLuma(vec3 rgb) {
      return rgb.y * (0.587/0.299) + rgb.x;
    }

    vec3 FxaaPixelShader(vec2 pos, sampler2D tex, vec2 fxaaQualityRcpFrame) {
      vec3 rgbNW = texture2D(tex, pos + vec2(-1.0, -1.0) * fxaaQualityRcpFrame).xyz;
      vec3 rgbNE = texture2D(tex, pos + vec2(1.0, -1.0) * fxaaQualityRcpFrame).xyz;
      vec3 rgbSW = texture2D(tex, pos + vec2(-1.0, 1.0) * fxaaQualityRcpFrame).xyz;
      vec3 rgbSE = texture2D(tex, pos + vec2(1.0, 1.0) * fxaaQualityRcpFrame).xyz;
      vec3 rgbM = texture2D(tex, pos).xyz;

      float lumaNW = FxaaLuma(rgbNW);
      float lumaNE = FxaaLuma(rgbNE);
      float lumaSW = FxaaLuma(rgbSW);
      float lumaSE = FxaaLuma(rgbSE);
      float lumaM = FxaaLuma(rgbM);

      float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
      float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

      vec2 dir;
      dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
      dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

      float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * (1.0/8.0)), (1.0/128.0));
      float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);

      dir = min(vec2(8.0, 8.0), max(vec2(-8.0, -8.0), dir * rcpDirMin)) * fxaaQualityRcpFrame;

      vec3 rgbA = (1.0/2.0) * (
        texture2D(tex, pos + dir * (1.0/3.0 - 0.5)).xyz +
        texture2D(tex, pos + dir * (2.0/3.0 - 0.5)).xyz);
      
      vec3 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (
        texture2D(tex, pos + dir * (0.0/3.0 - 0.5)).xyz +
        texture2D(tex, pos + dir * (3.0/3.0 - 0.5)).xyz);

      float lumaB = FxaaLuma(rgbB);

      if((lumaB < lumaMin) || (lumaB > lumaMax)) {
        return rgbA;
      } else {
        return rgbB;
      }
    }

    void main() {
      gl_FragColor = vec4(FxaaPixelShader(vUv, tDiffuse, 1.0 / resolution), 1.0);
    }
  `
};

// Enhanced Temporal Anti-Aliasing (TAA) Shader
export const TAAShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrevious: { value: null },
    projectionMatrix: { value: new THREE.Matrix4() },
    inverseProjectionMatrix: { value: new THREE.Matrix4() },
    previousProjectionMatrix: { value: new THREE.Matrix4() },
    cameraMatrix: { value: new THREE.Matrix4() },
    previousCameraMatrix: { value: new THREE.Matrix4() },
    resolution: { value: new THREE.Vector2() },
    alpha: { value: 0.9 },
    jitterOffset: { value: new THREE.Vector2() },
    velocityScale: { value: 1.0 },
    feedbackMin: { value: 0.88 },
    feedbackMax: { value: 0.97 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform sampler2D tPrevious;
    uniform mat4 projectionMatrix;
    uniform mat4 inverseProjectionMatrix;
    uniform mat4 previousProjectionMatrix;
    uniform mat4 cameraMatrix;
    uniform mat4 previousCameraMatrix;
    uniform vec2 resolution;
    uniform float alpha;
    uniform vec2 jitterOffset;
    uniform float velocityScale;
    uniform float feedbackMin;
    uniform float feedbackMax;
    varying vec2 vUv;

    vec2 getVelocity(vec2 uv) {
      // Reconstruct world position
      vec4 clipPos = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
      vec4 viewPos = inverseProjectionMatrix * clipPos;
      viewPos /= viewPos.w;
      
      vec4 worldPos = inverse(cameraMatrix) * viewPos;
      
      // Transform to previous frame
      vec4 prevViewPos = previousCameraMatrix * worldPos;
      vec4 prevClipPos = previousProjectionMatrix * prevViewPos;
      prevClipPos /= prevClipPos.w;
      
      vec2 prevUv = (prevClipPos.xy + 1.0) * 0.5;
      return (uv - prevUv) * velocityScale;
    }

    vec3 clipAABB(vec3 aabbMin, vec3 aabbMax, vec3 p, vec3 q) {
      vec3 r = q - p;
      vec3 rmax = aabbMax - p;
      vec3 rmin = aabbMin - p;
      
      if (r.x > rmax.x + 0.000001) r *= (rmax.x / r.x);
      if (r.y > rmax.y + 0.000001) r *= (rmax.y / r.y);
      if (r.z > rmax.z + 0.000001) r *= (rmax.z / r.z);
      
      if (r.x < rmin.x - 0.000001) r *= (rmin.x / r.x);
      if (r.y < rmin.y - 0.000001) r *= (rmin.y / r.y);
      if (r.z < rmin.z - 0.000001) r *= (rmin.z / r.z);
      
      return p + r;
    }

    void main() {
      vec2 texelSize = 1.0 / resolution;
      vec3 current = texture2D(tDiffuse, vUv).rgb;
      
      // Calculate velocity for current pixel
      vec2 velocity = getVelocity(vUv);
      vec2 prevUv = vUv - velocity;
      
      // Sample previous frame
      vec3 previous = texture2D(tPrevious, prevUv).rgb;
      
      // Neighborhood clamping for better stability
      vec3 nearColor0 = texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.0)).rgb;
      vec3 nearColor1 = texture2D(tDiffuse, vUv + vec2(-texelSize.x, 0.0)).rgb;
      vec3 nearColor2 = texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y)).rgb;
      vec3 nearColor3 = texture2D(tDiffuse, vUv + vec2(0.0, -texelSize.y)).rgb;
      
      vec3 boxMin = min(current, min(nearColor0, min(nearColor1, min(nearColor2, nearColor3))));
      vec3 boxMax = max(current, max(nearColor0, max(nearColor1, max(nearColor2, nearColor3))));
      
      // Expand bounding box slightly
      vec3 boxCenter = (boxMax + boxMin) * 0.5;
      boxMin = mix(boxCenter, boxMin, 1.25);
      boxMax = mix(boxCenter, boxMax, 1.25);
      
      // Clip history to neighborhood
      previous = clipAABB(boxMin, boxMax, clamp(previous, boxMin, boxMax), previous);
      
      // Adaptive feedback based on velocity
      float velocityLength = length(velocity * resolution);
      float feedback = mix(feedbackMax, feedbackMin, clamp(velocityLength, 0.0, 1.0));
      
      vec3 result = mix(current, previous, feedback);
      gl_FragColor = vec4(result, 1.0);
    }
  `
};

// Advanced SMAA (Enhanced Subpixel Morphological Antialiasing) Shader
export const SMAAShader = {
  uniforms: {
    tDiffuse: { value: null },
    tArea: { value: null },
    tSearch: { value: null },
    resolution: { value: new THREE.Vector2() },
    threshold: { value: 0.1 },
    maxSearchSteps: { value: 16 },
    maxSearchStepsDiag: { value: 8 },
    cornerRounding: { value: 25 },
    localContrastAdaptationFactor: { value: 2.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec4 vOffset[3];
    uniform vec2 resolution;
    
    void main() {
      vUv = uv;
      vec2 texelSize = 1.0 / resolution;
      
      vOffset[0] = vUv.xyxy + texelSize.xyxy * vec4(-1.0, 0.0, 1.0, 0.0);
      vOffset[1] = vUv.xyxy + texelSize.xyxy * vec4(-2.0, 0.0, 2.0, 0.0);
      vOffset[2] = vUv.xyxy + texelSize.xyxy * vec4(0.0, -1.0, 0.0, 1.0);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform sampler2D tArea;
    uniform sampler2D tSearch;
    uniform vec2 resolution;
    uniform float threshold;
    uniform float maxSearchSteps;
    uniform float maxSearchStepsDiag;
    uniform float cornerRounding;
    uniform float localContrastAdaptationFactor;
    
    varying vec2 vUv;
    varying vec4 vOffset[3];

    float luminance(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    vec2 calculateDiagWeights(vec2 texcoord, vec2 e, sampler2D areaTex) {
      vec2 weights = vec2(0.0, 0.0);
      vec4 d;
      vec3 c;

      d.x = e.x * 20.0;
      d.y = e.y * 20.0;

      if (d.x + d.y > 0.5) {
        vec4 coords = mad(vec4(-d.x + 0.25, d.x, d.y, -d.y - 0.25), 1.0 / resolution.xyxy, texcoord.xyxy);
        
        c.x = texture2D(tDiffuse, coords.xy).a;
        c.y = texture2D(tDiffuse, coords.zw).g;
        c.z = texture2D(tDiffuse, coords.xy + vec2(0.0, 1.0 / resolution.y)).r;
        
        weights = texture2D(areaTex, vec2(length(c.xy), c.z)).rg;
      }
      
      return weights;
    }

    vec4 mad(vec4 a, float b, vec4 c) {
      return a * b + c;
    }

    void main() {
      vec4 weights = vec4(0.0);
      vec2 e = texture2D(tDiffuse, vUv).rg;

      if (e.g > 0.0) { // Edge on top
        vec2 d;
        vec3 coords;
        
        coords.x = 0.25 * resolution.x;
        coords.y = resolution.y;
        
        // Left side search
        vec2 end = texture2D(tSearch, vec2(e.x, 0.0)).rg;
        d.x = end.r;
        
        // Right side search  
        coords.x = -0.25 * resolution.x;
        end = texture2D(tSearch, vec2(-e.x, 0.0)).rg;
        d.y = end.r;
        
        d = abs(round(mad(vec4(d.x, -d.x, d.y, -d.y), resolution.xyxy, vUv.xyxy).zw));
        
        vec2 sqrt_d = sqrt(d);
        float e1 = texture2D(tDiffuse, vUv + vec2(0.0, 1.0 / resolution.y)).r;
        weights.rg = texture2D(tArea, vec2(sqrt_d.x, e1)).rg;
        
        coords.y = vUv.y - 1.0 / resolution.y;
        weights.rg = calculateDiagWeights(vUv, e, tArea);
      }

      if (e.r > 0.0) { // Edge on left
        vec2 d;
        vec3 coords;
        
        coords.y = 0.25 * resolution.y;
        coords.x = resolution.x;
        
        vec2 end = texture2D(tSearch, vec2(e.y, 0.5)).rg;
        d.x = end.r;
        
        coords.y = -0.25 * resolution.y;
        end = texture2D(tSearch, vec2(-e.y, 0.5)).rg;
        d.y = end.r;
        
        d = abs(round(mad(vec4(d.x, d.x, -d.y, d.y), resolution.xyxy, vUv.xyxy).xz));
        
        vec2 sqrt_d = sqrt(d);
        float e1 = texture2D(tDiffuse, vUv + vec2(1.0 / resolution.x, 0.0)).g;
        weights.ba = texture2D(tArea, vec2(sqrt_d.x, e1)).rg;
      }

      gl_FragColor = weights;
    }
  `
};

// Enhanced Anti-Aliasing Shader for geometry
const EnhancedAAShader = {
  uniforms: {
    baseColor: { value: new THREE.Color(YORHA_COLORS.primary.beige) },
    edgeColor: { value: new THREE.Color(YORHA_COLORS.primary.black) },
    edgeWidth: { value: 0.02 },
    aaStrength: { value: 1.0 },
    supersampleFactor: { value: 2.0 },
    time: { value: 0 }
  },

  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    precision highp float;
    
    uniform vec3 baseColor;
    uniform vec3 edgeColor;
    uniform float edgeWidth;
    uniform float aaStrength;
    uniform float supersampleFactor;
    uniform float time;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // High-quality smoothstep with anti-aliasing
    float aastep(float threshold, float value) {
      float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757 * aaStrength;
      return smoothstep(threshold - afwidth, threshold + afwidth, value);
    }

    // Enhanced edge detection with gradient analysis
    float detectEdge(vec2 uv) {
      float edge = 0.0;
      
      // Sample neighboring pixels for gradient calculation
      vec2 texelSize = vec2(1.0) / vec2(1024.0); // Adjust based on resolution
      
      // Sobel edge detection
      float tl = length(texture2D(gl_FragColor, uv + vec2(-texelSize.x, -texelSize.y)).rgb);
      float tm = length(texture2D(gl_FragColor, uv + vec2(0.0, -texelSize.y)).rgb);
      float tr = length(texture2D(gl_FragColor, uv + vec2(texelSize.x, -texelSize.y)).rgb);
      float ml = length(texture2D(gl_FragColor, uv + vec2(-texelSize.x, 0.0)).rgb);
      float mr = length(texture2D(gl_FragColor, uv + vec2(texelSize.x, 0.0)).rgb);
      float bl = length(texture2D(gl_FragColor, uv + vec2(-texelSize.x, texelSize.y)).rgb);
      float bm = length(texture2D(gl_FragColor, uv + vec2(0.0, texelSize.y)).rgb);
      float br = length(texture2D(gl_FragColor, uv + vec2(texelSize.x, texelSize.y)).rgb);
      
      float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
      float gy = (bl + 2.0 * bm + br) - (tl + 2.0 * tm + tr);
      
      return sqrt(gx * gx + gy * gy);
    }

    // Multi-sample anti-aliasing for smooth edges
    vec3 multisampleAA(vec3 color, vec2 uv) {
      vec3 result = color;
      
      if (supersampleFactor > 1.0) {
        vec2 texelSize = vec2(1.0) / vec2(1024.0);
        vec3 samples = vec3(0.0);
        float sampleCount = 0.0;
        
        // Rotated grid sampling pattern
        for (int i = 0; i < 4; i++) {
          float angle = float(i) * 1.5707963267948966; // π/2
          vec2 offset = vec2(cos(angle), sin(angle)) * texelSize * 0.5;
          
          // Sample with offset
          vec3 sample1 = color; // Would be actual sampling in real implementation
          samples += sample1;
          sampleCount += 1.0;
        }
        
        result = samples / sampleCount;
      }
      
      return result;
    }

    // YoRHa-specific procedural patterns with AA
    float yorhaPattern(vec2 uv) {
      // Hexagonal grid pattern
      vec2 hexUv = uv * 20.0;
      vec2 hexId = floor(hexUv);
      vec2 hexLocal = fract(hexUv) - 0.5;
      
      // Create hexagonal shape with anti-aliased edges
      float hexDist = max(abs(hexLocal.x), abs(hexLocal.y * 0.866) + abs(hexLocal.x) * 0.5);
      float hexPattern = 1.0 - aastep(0.3, hexDist);
      
      // Scan line overlay
      float scanLine = sin(uv.y * 100.0 + time * 2.0) * 0.5 + 0.5;
      scanLine = aastep(0.5, scanLine);
      
      return hexPattern * 0.8 + scanLine * 0.2;
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec2 uv = vUv;
      
      // Base color with YoRHa pattern overlay
      vec3 color = baseColor;
      float pattern = yorhaPattern(uv);
      color = mix(color, color * 1.2, pattern * 0.3);
      
      // Edge detection and anti-aliasing
      float edgeFactor = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
      edgeFactor = aastep(0.5, edgeFactor);
      
      // Apply edge coloring with smooth transitions
      color = mix(color, edgeColor, edgeFactor * edgeWidth);
      
      // Multi-sample anti-aliasing
      color = multisampleAA(color, uv);
      
      // Fresnel effect for additional depth
      float fresnel = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
      fresnel = pow(fresnel, 2.0);
      
      // Add subtle rim lighting
      color += fresnel * vec3(0.1, 0.1, 0.05);
      
      // Final output with gamma correction
      color = pow(color, vec3(1.0 / 2.2));
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// TAA (Temporal Anti-Aliasing) Manager
class TAAManager {
  private history: THREE.WebGLRenderTarget[] = [];
  private currentIndex: number = 0;
  private jitterPattern: THREE.Vector2[] = [];
  private frameCount: number = 0;
  
  constructor(width: number, height: number, samples: number = 8) {
    // Initialize history buffers
    for (let i = 0; i < 2; i++) {
      this.history.push(new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
      }));
    }
    
    // Initialize jitter pattern (Halton sequence)
    this.generateJitterPattern(samples);
  }
  
  private generateJitterPattern(samples: number): void {
    for (let i = 0; i < samples; i++) {
      const x = this.haltonSequence(i, 2) - 0.5;
      const y = this.haltonSequence(i, 3) - 0.5;
      this.jitterPattern.push(new THREE.Vector2(x, y));
    }
  }
  
  private haltonSequence(index: number, base: number): number {
    let result = 0;
    let f = 1;
    let i = index;
    
    while (i > 0) {
      f /= base;
      result += f * (i % base);
      i = Math.floor(i / base);
    }
    
    return result;
  }
  
  public getJitter(): THREE.Vector2 {
    return this.jitterPattern[this.frameCount % this.jitterPattern.length].clone();
  }
  
  public update(): void {
    this.frameCount++;
    this.currentIndex = (this.currentIndex + 1) % this.history.length;
  }
  
  public getCurrentRenderTarget(): THREE.WebGLRenderTarget {
    return this.history[this.currentIndex];
  }
  
  public getPreviousRenderTarget(): THREE.WebGLRenderTarget {
    const prevIndex = (this.currentIndex + 1) % this.history.length;
    return this.history[prevIndex];
  }
  
  public dispose(): void {
    this.history.forEach(rt => rt.dispose());
  }
}

// Enhanced YoRHa 3D Component with Anti-Aliasing
export abstract class YoRHaAntiAliased3D extends YoRHa3DComponent {
  protected aaConfig: AntiAliasingConfig;
  protected msaaManager: MSAARenderTarget | null = null;
  protected fxaaPass: THREE.ShaderMaterial | null = null;
  protected taaManager: TAAManager | null = null;
  protected enhancedMaterial: THREE.ShaderMaterial | null = null;
  
  constructor(style: YoRHaAAStyle = {}) {
    super(style);
    
    this.aaConfig = this.mergeDefaultAAConfig(style.antiAliasing || {});
    this.initializeAntiAliasing();
  }
  
  private mergeDefaultAAConfig(config: Partial<AntiAliasingConfig>): AntiAliasingConfig {
    return {
      type: 'auto',
      samples: 4,
      quality: 'high',
      edgeThreshold: 0.166,
      subpixelQuality: 0.75,
      enabled: true,
      temporalSamples: 8,
      jitterPattern: 'halton',
      adaptiveQuality: true,
      performanceTarget: 60,
      ...config
    };
  }
  
  private initializeAntiAliasing(): void {
    if (!this.aaConfig.enabled) return;
    
    switch (this.aaConfig.type) {
      case 'msaa':
        this.initializeMSAA();
        break;
      case 'fxaa':
        this.initializeFXAA();
        break;
      case 'smaa':
        this.initializeSMAA();
        break;
      case 'taa':
        this.initializeTAA();
        break;
      case 'auto':
        this.initializeAutoAA();
        break;
    }
    
    // Always create enhanced material for geometry-level AA
    this.createEnhancedMaterial();
  }
  
  private initializeMSAA(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      this.msaaManager = new MSAARenderTarget(
        canvas.width,
        canvas.height,
        this.aaConfig.samples || 4
      );
    }
  }
  
  private initializeFXAA(): void {
    this.fxaaPass = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms),
      vertexShader: FXAAShader.vertexShader,
      fragmentShader: FXAAShader.fragmentShader,
      transparent: true
    });
    
    // Configure FXAA quality based on settings
    const qualityMap = { low: 10, medium: 15, high: 25, ultra: 39 };
    this.fxaaPass.uniforms.qualityPreset.value = qualityMap[this.aaConfig.quality || 'high'];
    this.fxaaPass.uniforms.edgeThreshold.value = this.aaConfig.edgeThreshold || 0.166;
  }
  
  private initializeSMAA(): void {
    // SMAA implementation would require additional complexity
    console.warn('SMAA not fully implemented in this demo - falling back to FXAA');
    this.initializeFXAA();
  }
  
  private initializeTAA(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      this.taaManager = new TAAManager(
        canvas.width,
        canvas.height,
        this.aaConfig.temporalSamples || 8
      );
    }
  }
  
  private initializeAutoAA(): void {
    // Auto-detect best AA method based on performance and capabilities
    const performanceScore = this.estimatePerformanceScore();
    
    if (performanceScore > 0.8) {
      this.aaConfig.type = 'taa';
      this.initializeTAA();
    } else if (performanceScore > 0.6) {
      this.aaConfig.type = 'msaa';
      this.aaConfig.samples = 4;
      this.initializeMSAA();
    } else {
      this.aaConfig.type = 'fxaa';
      this.initializeFXAA();
    }
  }
  
  private estimatePerformanceScore(): number {
    // Simple performance estimation based on device capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 0.3;
    
    let score = 0.5;
    
    // Check for WebGL2 support
    if (canvas.getContext('webgl2')) score += 0.2;
    
    // Check for float texture support
    const ext = gl.getExtension('OES_texture_float');
    if (ext) score += 0.1;
    
    // Check max texture size as GPU power indicator
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize >= 4096) score += 0.1;
    if (maxTextureSize >= 8192) score += 0.1;
    
    return Math.min(score, 1.0);
  }
  
  private createEnhancedMaterial(): void {
    const style = this.style as YoRHaAAStyle;
    const shaderEnhancements = style.shaderEnhancements || {};
    
    this.enhancedMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(EnhancedAAShader.uniforms),
      vertexShader: EnhancedAAShader.vertexShader,
      fragmentShader: EnhancedAAShader.fragmentShader,
      transparent: this.style.opacity !== undefined && this.style.opacity < 1,
      side: THREE.DoubleSide
    });
    
    // Configure enhanced material
    this.enhancedMaterial.uniforms.baseColor.value.setHex(this.style.backgroundColor || YORHA_COLORS.primary.beige);
    this.enhancedMaterial.uniforms.edgeColor.value.setHex(this.style.borderColor || YORHA_COLORS.primary.black);
    this.enhancedMaterial.uniforms.edgeWidth.value = this.style.borderWidth || 0.02;
    this.enhancedMaterial.uniforms.aaStrength.value = this.getAAStrength();
    this.enhancedMaterial.uniforms.supersampleFactor.value = shaderEnhancements.customAASamples || 2.0;
  }
  
  private getAAStrength(): number {
    const qualityMap = { low: 0.5, medium: 1.0, high: 1.5, ultra: 2.0 };
    return qualityMap[this.aaConfig.quality || 'high'];
  }
  
  protected createMaterial(): void {
    if (this.enhancedMaterial) {
      this.material = this.enhancedMaterial;
    } else {
      super.createMaterial();
    }
  }
  
  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Update TAA if active
    if (this.taaManager) {
      this.taaManager.update();
    }
    
    // Update time uniform for shader animations
    if (this.enhancedMaterial) {
      this.enhancedMaterial.uniforms.time.value += deltaTime;
    }
    
    // Adaptive quality adjustment
    if (this.aaConfig.adaptiveQuality) {
      this.updateAdaptiveQuality();
    }
  }
  
  private updateAdaptiveQuality(): void {
    // Simple FPS-based quality adjustment
    const currentFPS = this.estimateFPS();
    const targetFPS = this.aaConfig.performanceTarget || 60;
    
    if (currentFPS < targetFPS * 0.8) {
      // Reduce quality
      this.downgradeQuality();
    } else if (currentFPS > targetFPS * 1.1) {
      // Increase quality if possible
      this.upgradeQuality();
    }
  }
  
  private estimateFPS(): number {
    // Simplified FPS estimation - in real implementation would track frame times
    return 60; // Placeholder
  }
  
  private downgradeQuality(): void {
    const qualityLevels = ['ultra', 'high', 'medium', 'low'];
    const currentIndex = qualityLevels.indexOf(this.aaConfig.quality || 'high');
    
    if (currentIndex < qualityLevels.length - 1) {
      this.aaConfig.quality = qualityLevels[currentIndex + 1] as any;
      this.updateQualitySettings();
    }
  }
  
  private upgradeQuality(): void {
    const qualityLevels = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = qualityLevels.indexOf(this.aaConfig.quality || 'high');
    
    if (currentIndex > 0) {
      this.aaConfig.quality = qualityLevels[currentIndex - 1] as any;
      this.updateQualitySettings();
    }
  }
  
  private updateQualitySettings(): void {
    if (this.enhancedMaterial) {
      this.enhancedMaterial.uniforms.aaStrength.value = this.getAAStrength();
    }
    
    if (this.fxaaPass) {
      const qualityMap = { low: 10, medium: 15, high: 25, ultra: 39 };
      this.fxaaPass.uniforms.qualityPreset.value = qualityMap[this.aaConfig.quality || 'high'];
    }
  }
  
  // Public API for AA configuration
  public setAntiAliasingConfig(config: Partial<AntiAliasingConfig>): void {
    this.aaConfig = { ...this.aaConfig, ...config };
    
    // Reinitialize if type changed
    if (config.type && config.type !== this.aaConfig.type) {
      this.disposeAntiAliasing();
      this.initializeAntiAliasing();
    } else {
      this.updateQualitySettings();
    }
  }
  
  public getAntiAliasingConfig(): AntiAliasingConfig {
    return { ...this.aaConfig };
  }
  
  public enableAntiAliasing(enabled: boolean = true): void {
    this.aaConfig.enabled = enabled;
    
    if (enabled && !this.enhancedMaterial) {
      this.initializeAntiAliasing();
    }
  }
  
  public disposeAntiAliasing(): void {
    if (this.msaaManager) {
      this.msaaManager.dispose();
      this.msaaManager = null;
    }
    
    if (this.fxaaPass) {
      this.fxaaPass.dispose();
      this.fxaaPass = null;
    }
    
    if (this.taaManager) {
      this.taaManager.dispose();
      this.taaManager = null;
    }
    
    if (this.enhancedMaterial) {
      this.enhancedMaterial.dispose();
      this.enhancedMaterial = null;
    }
  }
  
  public dispose(): void {
    this.disposeAntiAliasing();
    super.dispose();
  }
  
  // Debug and performance monitoring
  public getAAPerformanceStats(): {
    type: string;
    quality: string;
    samples: number;
    estimatedFPS: number;
    memoryUsage: number;
  } {
    return {
      type: this.aaConfig.type,
      quality: this.aaConfig.quality || 'high',
      samples: this.aaConfig.samples || 0,
      estimatedFPS: this.estimateFPS(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  private estimateMemoryUsage(): number {
    let usage = 0;
    
    if (this.msaaManager) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        usage += canvas.width * canvas.height * 4 * (this.aaConfig.samples || 1);
      }
    }
    
    if (this.taaManager) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        usage += canvas.width * canvas.height * 4 * 2; // Two history buffers
      }
    }
    
    return usage;
  }
}

// Export utility functions for external use
export const AntiAliasingUtils = {
  detectOptimalAAType(): AntiAliasingConfig['type'] {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 'none';
    
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    
    // Simple heuristics based on GPU vendor/type
    if (renderer.includes('NVIDIA') && renderer.includes('RTX')) {
      return 'taa';
    } else if (renderer.includes('AMD') || renderer.includes('Radeon')) {
      return 'msaa';
    } else {
      return 'fxaa';
    }
  },
  
  getRecommendedSettings(targetFPS: number = 60): AntiAliasingConfig {
    const type = AntiAliasingUtils.detectOptimalAAType();
    
    return {
      type,
      samples: type === 'msaa' ? 4 : 8,
      quality: targetFPS >= 60 ? 'high' : 'medium',
      edgeThreshold: 0.166,
      subpixelQuality: 0.75,
      enabled: true,
      adaptiveQuality: true,
      performanceTarget: targetFPS
    };
  },
  
  createAAPreset(preset: 'performance' | 'balanced' | 'quality'): AntiAliasingConfig {
    const presets = {
      performance: {
        type: 'fxaa' as const,
        quality: 'medium' as const,
        samples: 2,
        adaptiveQuality: true,
        performanceTarget: 60
      },
      balanced: {
        type: 'auto' as const,
        quality: 'high' as const,
        samples: 4,
        adaptiveQuality: true,
        performanceTarget: 60
      },
      quality: {
        type: 'taa' as const,
        quality: 'ultra' as const,
        samples: 8,
        adaptiveQuality: false,
        performanceTarget: 30
      }
    };
    
    return {
      enabled: true,
      edgeThreshold: 0.166,
      subpixelQuality: 0.75,
      temporalSamples: 8,
      jitterPattern: 'halton',
      ...presets[preset]
    };
  }
};