import path from "path";

// Fuse.js import wrapper with fallback
let Fuse: any;

try {
  // Try importing fuse.js
  Fuse = require('fuse.js');
} catch (error: any) {
  // Fallback implementation for basic search
  Fuse = class FuseFallback {
    private items: any[];
    private options: any;
    
    constructor(items: any[], options: any = {}) {
      this.items = items;
      this.options = options;
    }
    
    search(query: string) {
      const keys = this.options.keys || [];
      const threshold = this.options.threshold || 0.3;
      
      return this.items
        .map((item, index) => {
          let score = 1;
          
          // Simple string matching for each key
          for (const key of keys) {
            const value = this.getNestedValue(item, key);
            if (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
              score = 0.1; // Good match
              break;
            }
          }
          
          return { item, refIndex: index, score };
        })
        .filter((result: any) => result.score <= threshold)
        .sort((a, b) => a.score - b.score);
    }
    
    private getNestedValue(obj: any, path: string) {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    }
  };
}

export default Fuse;
