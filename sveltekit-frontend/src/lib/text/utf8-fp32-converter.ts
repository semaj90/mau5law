/**
 * UTF-8 to FP32 Text Converter for SvelteKit
 * Converts UTF-8 encoded text to 32-bit floating point arrays
 * Optimized for GPU processing and neural network inputs
 */

export interface TextConversionOptions {
  normalizationMethod: 'unicode' | 'range' | 'gaussian' | 'sigmoid';
  outputRange: [number, number]; // Min/max values for FP32 output
  paddingValue: number; // Value to use for padding
  maxLength?: number; // Maximum sequence length
  preserveSpecialChars: boolean; // Keep special characters vs normalize them
  encoding: 'utf8' | 'utf16' | 'ascii' | 'latin1';
}

export interface ConversionResult {
  fp32Array: Float32Array;
  originalLength: number;
  paddedLength: number;
  specialCharsCount: number;
  conversionTime: number;
  metadata: {
    minValue: number;
    maxValue: number;
    meanValue: number;
    uniqueChars: number;
    byteLength: number;
  };
}

export interface SpecialCharacterMap {
  [char: string]: number;
}

export class UTF8ToFP32Converter {
  private specialCharMap: SpecialCharacterMap = {};
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();
  
  // Legal text special characters with FP32 mappings
  private readonly LEGAL_SPECIAL_CHARS: SpecialCharacterMap = {
    '§': 0.95,  // Section symbol
    '¶': 0.93,  // Paragraph symbol
    '©': 0.91,  // Copyright
    '®': 0.89,  // Registered trademark
    '™': 0.87,  // Trademark
    '°': 0.85,  // Degree symbol
    '±': 0.83,  // Plus-minus
    '×': 0.81,  // Multiplication
    '÷': 0.79,  // Division
    '≤': 0.77,  // Less than or equal
    '≥': 0.75,  // Greater than or equal
    '≠': 0.73,  // Not equal
    '≈': 0.71,  // Approximately equal
    '∞': 0.69,  // Infinity
    '→': 0.67,  // Right arrow
    '←': 0.65,  // Left arrow
    '↑': 0.63,  // Up arrow
    '↓': 0.61,  // Down arrow
    '"': 0.59,  // Left double quote
    '"': 0.57,  // Right double quote
    "'": 0.55,  // Left single quote
    "'": 0.53,  // Right single quote
    '–': 0.51,  // En dash
    '—': 0.49,  // Em dash
    '…': 0.47,  // Ellipsis
    '•': 0.45,  // Bullet point
    '◦': 0.43,  // White bullet
    '▪': 0.41,  // Black small square
    '▫': 0.39,  // White small square
    '†': 0.37,  // Dagger
    '‡': 0.35,  // Double dagger
    '‰': 0.33,  // Per mille
    '′': 0.31,  // Prime
    '″': 0.29,  // Double prime
    '‹': 0.27,  // Single left angle quote
    '›': 0.25,  // Single right angle quote
    '«': 0.23,  // Double left angle quote
    '»': 0.21   // Double right angle quote
  };

  constructor() {
    this.initializeSpecialCharacterMap();
  }

  private initializeSpecialCharacterMap(): void {
    // Initialize with legal special characters
    this.specialCharMap = { ...this.LEGAL_SPECIAL_CHARS };
    
    // Add common programming/markup characters
    const programmingChars: SpecialCharacterMap = {
      '{': 0.19, '}': 0.17, '[': 0.15, ']': 0.13,
      '<': 0.11, '>': 0.09, '|': 0.07, '\\': 0.05,
      '/': 0.03, '~': 0.01, '`': -0.01, '^': -0.03,
      '%': -0.05, '#': -0.07, '@': -0.09, '&': -0.11,
      '*': -0.13, '+': -0.15, '=': -0.17, '_': -0.19,
      '-': -0.21, ':': -0.23, ';': -0.25, '!': -0.27,
      '?': -0.29, '.': -0.31, ',': -0.33, "'": -0.35,
      '"': -0.37, '(': -0.39, ')': -0.41, '$': -0.43
    };
    
    Object.assign(this.specialCharMap, programmingChars);
    
    console.log(`📝 Initialized special character map with ${Object.keys(this.specialCharMap).length} characters`);
  }

  /**
   * Convert UTF-8 text to FP32 array with various normalization options
   */
  convertToFP32(text: string, options?: Partial<TextConversionOptions>): ConversionResult {
    const startTime = performance.now();
    
    const config: TextConversionOptions = {
      normalizationMethod: 'range',
      outputRange: [-1.0, 1.0],
      paddingValue: 0.0,
      maxLength: undefined,
      preserveSpecialChars: true,
      encoding: 'utf8',
      ...options
    };

    try {
      // Step 1: Encode text to bytes based on encoding type
      const bytes = this.encodeText(text, config.encoding);
      
      // Step 2: Convert bytes to initial FP32 values
      let fp32Values = this.bytesToFP32(bytes, config);
      
      // Step 3: Handle special characters if preserving them
      if (config.preserveSpecialChars) {
        fp32Values = this.mapSpecialCharacters(text, fp32Values, config);
      }
      
      // Step 4: Apply normalization
      fp32Values = this.applyNormalization(fp32Values, config);
      
      // Step 5: Handle padding/truncation
      const finalArray = this.handleLengthConstraints(fp32Values, config);
      
      // Step 6: Calculate metadata
      const metadata = this.calculateMetadata(finalArray, text, bytes);
      
      const conversionTime = performance.now() - startTime;
      
      const result: ConversionResult = {
        fp32Array: finalArray,
        originalLength: text.length,
        paddedLength: finalArray.length,
        specialCharsCount: this.countSpecialCharacters(text),
        conversionTime,
        metadata
      };
      
      console.log(`🔢 Converted "${text.substring(0, 30)}..." to FP32 in ${conversionTime.toFixed(2)}ms`);
      console.log(`📊 Original: ${text.length} chars → FP32: ${finalArray.length} values`);
      console.log(`📈 Range: [${metadata.minValue.toFixed(4)}, ${metadata.maxValue.toFixed(4)}]`);
      
      return result;
      
    } catch (error) {
      console.error('❌ UTF-8 to FP32 conversion failed:', error);
      throw error;
    }
  }

  private encodeText(text: string, encoding: string): Uint8Array {
    switch (encoding) {
      case 'utf8':
        return this.textEncoder.encode(text);
      case 'utf16':
        // UTF-16 encoding (simplified)
        const utf16Array = new Uint16Array(text.length);
        for (let i = 0; i < text.length; i++) {
          utf16Array[i] = text.charCodeAt(i);
        }
        return new Uint8Array(utf16Array.buffer);
      case 'ascii':
        // ASCII encoding (7-bit)
        const asciiArray = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          asciiArray[i] = code > 127 ? 63 : code; // Replace non-ASCII with '?'
        }
        return asciiArray;
      case 'latin1':
        // Latin-1 encoding (8-bit)
        const latin1Array = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          latin1Array[i] = code > 255 ? 63 : code; // Replace non-Latin1 with '?'
        }
        return latin1Array;
      default:
        return this.textEncoder.encode(text);
    }
  }

  private bytesToFP32(bytes: Uint8Array, config: TextConversionOptions): Float32Array {
    const fp32Array = new Float32Array(bytes.length);
    
    // Convert each byte to initial FP32 value
    for (let i = 0; i < bytes.length; i++) {
      fp32Array[i] = bytes[i];
    }
    
    return fp32Array;
  }

  private mapSpecialCharacters(
    originalText: string, 
    fp32Values: Float32Array, 
    config: TextConversionOptions
  ): Float32Array {
    const result = new Float32Array(fp32Values);
    const bytes = this.encodeText(originalText, config.encoding);
    
    let byteIndex = 0;
    for (let charIndex = 0; charIndex < originalText.length; charIndex++) {
      const char = originalText[charIndex];
      
      if (this.specialCharMap.hasOwnProperty(char)) {
        // Map special character to predefined FP32 value
        const specialValue = this.specialCharMap[char];
        
        // Find corresponding byte indices for this character
        const charBytes = this.encodeText(char, config.encoding);
        for (let i = 0; i < charBytes.length && byteIndex < result.length; i++) {
          result[byteIndex] = specialValue;
          byteIndex++;
        }
      } else {
        // Skip to next character's bytes
        const charBytes = this.encodeText(char, config.encoding);
        byteIndex += charBytes.length;
      }
    }
    
    return result;
  }

  private applyNormalization(fp32Values: Float32Array, config: TextConversionOptions): Float32Array {
    const result = new Float32Array(fp32Values);
    const [minRange, maxRange] = config.outputRange;
    
    switch (config.normalizationMethod) {
      case 'range':
        // Min-max normalization to specified range
        const currentMin = Math.min(...result);
        const currentMax = Math.max(...result);
        const currentRange = currentMax - currentMin;
        
        if (currentRange > 0) {
          const targetRange = maxRange - minRange;
          for (let i = 0; i < result.length; i++) {
            result[i] = minRange + ((result[i] - currentMin) / currentRange) * targetRange;
          }
        }
        break;
        
      case 'unicode':
        // Normalize based on Unicode code point ranges
        for (let i = 0; i < result.length; i++) {
          // Normalize to [-1, 1] based on full Unicode range (0-1114111)
          result[i] = (result[i] / 557055.5) - 1.0;
          // Then scale to target range
          result[i] = minRange + ((result[i] + 1) / 2) * (maxRange - minRange);
        }
        break;
        
      case 'gaussian':
        // Gaussian normalization (z-score)
        const mean = result.reduce((sum, val) => sum + val, 0) / result.length;
        const variance = result.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / result.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev > 0) {
          for (let i = 0; i < result.length; i++) {
            result[i] = (result[i] - mean) / stdDev;
            // Scale to target range (assuming ~99.7% of values within 3 std devs)
            result[i] = Math.max(-3, Math.min(3, result[i])); // Clip to [-3, 3]
            result[i] = minRange + ((result[i] + 3) / 6) * (maxRange - minRange);
          }
        }
        break;
        
      case 'sigmoid':
        // Sigmoid normalization for smooth mapping
        for (let i = 0; i < result.length; i++) {
          // Apply sigmoid function: 1 / (1 + e^(-x/32))
          const normalized = 1 / (1 + Math.exp(-result[i] / 32));
          result[i] = minRange + normalized * (maxRange - minRange);
        }
        break;
    }
    
    return result;
  }

  private handleLengthConstraints(fp32Values: Float32Array, config: TextConversionOptions): Float32Array {
    if (!config.maxLength) {
      return fp32Values;
    }
    
    const targetLength = config.maxLength;
    
    if (fp32Values.length === targetLength) {
      return fp32Values;
    } else if (fp32Values.length < targetLength) {
      // Pad with padding value
      const padded = new Float32Array(targetLength);
      padded.set(fp32Values, 0);
      padded.fill(config.paddingValue, fp32Values.length);
      return padded;
    } else {
      // Truncate to target length
      return fp32Values.slice(0, targetLength);
    }
  }

  private calculateMetadata(fp32Array: Float32Array, originalText: string, bytes: Uint8Array) {
    const values = Array.from(fp32Array);
    const uniqueChars = new Set(originalText).size;
    
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      meanValue: values.reduce((sum, val) => sum + val, 0) / values.length,
      uniqueChars,
      byteLength: bytes.length
    };
  }

  private countSpecialCharacters(text: string): number {
    let count = 0;
    for (const char of text) {
      if (this.specialCharMap.hasOwnProperty(char)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Batch convert multiple texts to FP32 arrays
   */
  batchConvert(texts: string[], options?: Partial<TextConversionOptions>): ConversionResult[] {
    const startTime = performance.now();
    const results: ConversionResult[] = [];
    
    for (const text of texts) {
      try {
        const result = this.convertToFP32(text, options);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to convert text: "${text.substring(0, 30)}..."`, error);
      }
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`📊 Batch converted ${results.length}/${texts.length} texts in ${totalTime.toFixed(2)}ms`);
    
    return results;
  }

  /**
   * Convert FP32 array back to text (approximate reconstruction)
   */
  reconstructFromFP32(fp32Array: Float32Array, options?: Partial<TextConversionOptions>): string {
    const config: TextConversionOptions = {
      normalizationMethod: 'range',
      outputRange: [-1.0, 1.0],
      paddingValue: 0.0,
      preserveSpecialChars: true,
      encoding: 'utf8',
      ...options
    };

    try {
      // Reverse normalization to get byte values
      const denormalized = this.reverseNormalization(fp32Array, config);
      
      // Convert back to bytes
      const bytes = new Uint8Array(denormalized.length);
      for (let i = 0; i < denormalized.length; i++) {
        bytes[i] = Math.round(Math.max(0, Math.min(255, denormalized[i])));
      }
      
      // Decode bytes back to text
      const reconstructed = this.textDecoder.decode(bytes);
      
      console.log(`🔄 Reconstructed text from FP32 array (${fp32Array.length} values)`);
      return reconstructed;
      
    } catch (error) {
      console.error('❌ FP32 to text reconstruction failed:', error);
      return '';
    }
  }

  private reverseNormalization(fp32Array: Float32Array, config: TextConversionOptions): Float32Array {
    const result = new Float32Array(fp32Array);
    const [minRange, maxRange] = config.outputRange;
    
    switch (config.normalizationMethod) {
      case 'range':
        // Reverse min-max normalization (assuming original range was 0-255)
        const targetRange = maxRange - minRange;
        for (let i = 0; i < result.length; i++) {
          result[i] = ((result[i] - minRange) / targetRange) * 255;
        }
        break;
        
      case 'unicode':
        // Reverse Unicode normalization
        for (let i = 0; i < result.length; i++) {
          const normalized = ((result[i] - minRange) / (maxRange - minRange)) * 2 - 1;
          result[i] = (normalized + 1) * 557055.5;
        }
        break;
        
      case 'gaussian':
        // Reverse Gaussian normalization (approximate)
        for (let i = 0; i < result.length; i++) {
          const normalized = ((result[i] - minRange) / (maxRange - minRange)) * 6 - 3;
          result[i] = normalized * 32 + 128; // Approximate reverse
        }
        break;
        
      case 'sigmoid':
        // Reverse sigmoid normalization
        for (let i = 0; i < result.length; i++) {
          const sigmoid = (result[i] - minRange) / (maxRange - minRange);
          const logit = Math.log(sigmoid / (1 - sigmoid));
          result[i] = logit * 32;
        }
        break;
    }
    
    return result;
  }

  /**
   * Add custom special character mappings
   */
  addSpecialCharacter(char: string, fp32Value: number): void {
    this.specialCharMap[char] = fp32Value;
    console.log(`➕ Added special character: '${char}' → ${fp32Value}`);
  }

  /**
   * Get current special character mappings
   */
  getSpecialCharacterMap(): SpecialCharacterMap {
    return { ...this.specialCharMap };
  }

  /**
   * Clear all special character mappings
   */
  clearSpecialCharacters(): void {
    this.specialCharMap = {};
    console.log('🧹 Cleared all special character mappings');
  }

  /**
   * Export conversion settings for reproducibility
   */
  exportSettings(options: TextConversionOptions): string {
    return JSON.stringify({
      options,
      specialCharMap: this.specialCharMap,
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Import conversion settings
   */
  importSettings(settingsJson: string): void {
    try {
      const settings = JSON.parse(settingsJson);
      if (settings.specialCharMap) {
        this.specialCharMap = settings.specialCharMap;
        console.log(`📥 Imported settings with ${Object.keys(this.specialCharMap).length} special characters`);
      }
    } catch (error) {
      console.error('❌ Failed to import settings:', error);
    }
  }
}

/**
 * Singleton instance for global use
 */
export const utf8ToFP32Converter = new UTF8ToFP32Converter();

/**
 * Convenience functions for common operations
 */

export function textToFP32(text: string, options?: Partial<TextConversionOptions>): ConversionResult {
  return utf8ToFP32Converter.convertToFP32(text, options);
}

export function batchTextToFP32(texts: string[], options?: Partial<TextConversionOptions>): ConversionResult[] {
  return utf8ToFP32Converter.batchConvert(texts, options);
}

export function fp32ToText(fp32Array: Float32Array, options?: Partial<TextConversionOptions>): string {
  return utf8ToFP32Converter.reconstructFromFP32(fp32Array, options);
}

export function normalizeTextForGPU(text: string, maxLength: number = 512): Float32Array {
  const result = utf8ToFP32Converter.convertToFP32(text, {
    normalizationMethod: 'range',
    outputRange: [-1.0, 1.0],
    maxLength,
    paddingValue: 0.0,
    preserveSpecialChars: true
  });
  
  return result.fp32Array;
}