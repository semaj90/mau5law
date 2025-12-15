/**
 * Type Mismatch Fixer Service
 * Fixes TypeScript type errors in components (props, events, slots)
 */

import { readFile, writeFile } from 'fs/promises';
import { BaseService } from '../base-service.js';
import type { CategorizedError, FixResult, Fix } from '../types.js';
import { generateId } from '../utils.js';

export class TypeFixer extends BaseService {
  constructor() {
    super('TypeFixer');
  }

  /**
   * Apply type fix to a file
   * Implements: Requirements 4.1, 4.2, 4.3, 4.4
   */
  async applyFix(file: string, error: CategorizedError): Promise<FixResult> {
    this.log(`Fixing type error in ${file}:${error.line}`);

    try {
      // Read file content
      const content = await readFile(file, 'utf-8');

      // Count errors before
      const errorsBefore = this.countTypeErrors(content);

      // Apply fix based on error type
      let fixed = content;
      let changes: string[] = [];

      if (this.isComponentPropError(error.message)) {
        const result = this.fixComponentPropType(content, error);
        fixed = result.fixed;
        changes = result.changes;
      } else if (this.isEventHandlerError(error.message)) {
        const result = this.fixEventHandlerType(content, error);
        fixed = result.fixed;
        changes = result.changes;
      } else if (this.isSlotError(error.message)) {
        const result = this.fixSlotType(content, error);
        fixed = result.fixed;
        changes = result.changes;
      } else if (this.isObjectLiteralError(error.message)) {
        const result = this.fixObjectLiteralType(content, error);
        fixed = result.fixed;
        changes = result.changes;
      }

      // Write fixed content
      await writeFile(file, fixed, 'utf-8');

      // Count errors after
      const errorsAfter = this.countTypeErrors(fixed);

      const fix: Fix = {
        id: generateId(),
        errorId: error.id,
        file,
        type: 'typeMismatch',
        before: content,
        after: fixed,
        applied: true,
        validated: false,
        rolledBack: false,
        timestamp: new Date(),
      };

      return {
        success: errorsAfter < errorsBefore,
        file,
        errorsBefore,
        errorsAfter,
        changes,
        fix,
      };
    } catch (error) {
      this.logError(`Failed to fix type error: ${error}`);
      return {
        success: false,
        file,
        errorsBefore: 0,
        errorsAfter: 0,
        changes: [],
      };
    }
  }

  /**
   * Fix component prop type errors
   * Implements: Requirements 4.1
   */
  private fixComponentPropType(
    content: string,
    error: CategorizedError
  ): { fixed: string; changes: string[] } {
    const lines = content.split('\n');
    const changes: string[] = [];

    // Extract line content
    const lineIndex = error.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return { fixed: content, changes };
    }

    const line = lines[lineIndex];

    // Pattern: let { prop } = $props() with type mismatch
    // Fix: Add type annotation to prop
    let fixed = line;

    // Handle: let { prop } = $props() → let { prop }: Type = $props()
    if (line.includes('$props()')) {
      // Extract prop name
      const propMatch = line.match(/let\s*{\s*(\w+)\s*}\s*=/);
      if (propMatch) {
        const propName = propMatch[1];
        // Add type annotation (infer from context or use 'any' as fallback)
        fixed = line.replace(
          /let\s*{\s*(\w+)\s*}\s*=/,
          `let { $1 }: { $1: unknown } =`
        );
        changes.push(`Added type annotation to prop '${propName}'`);
      }
    }

    // Handle: export let prop: WrongType
    // Fix: Change to correct type
    if (line.includes('export let')) {
      // Pattern: export let prop: Type
      const typeMatch = line.match(/export\s+let\s+(\w+)\s*:\s*(\w+)/);
      if (typeMatch) {
        const propName = typeMatch[1];
        const currentType = typeMatch[2];
        // Infer correct type from common patterns
        const correctType = this.inferCorrectType(currentType, error.message);
        if (correctType && correctType !== currentType) {
          fixed = line.replace(
            new RegExp(`:\\s*${currentType}\\b`),
            `: ${correctType}`
          );
          changes.push(
            `Changed prop '${propName}' type from '${currentType}' to '${correctType}'`
          );
        }
      }
    }

    lines[lineIndex] = fixed;
    return { fixed: lines.join('\n'), changes };
  }

  /**
   * Fix event handler type errors
   * Implements: Requirements 4.2
   */
  private fixEventHandlerType(
    content: string,
    error: CategorizedError
  ): { fixed: string; changes: string[] } {
    const lines = content.split('\n');
    const changes: string[] = [];

    const lineIndex = error.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return { fixed: content, changes };
    }

    const line = lines[lineIndex];
    let fixed = line;

    // Pattern: on:event={handler} with wrong signature
    // Fix: Update handler signature
    if (line.includes('on:')) {
      // Extract event name
      const eventMatch = line.match(/on:(\w+)/);
      if (eventMatch) {
        const eventName = eventMatch[1];
        // Common event handler fixes
        if (eventName === 'click' && !line.includes('MouseEvent')) {
          fixed = line.replace(
            /on:click=\{(\w+)\}/,
            'on:click={(e: MouseEvent) => $1(e)}'
          );
          changes.push(`Updated 'click' handler to accept MouseEvent`);
        } else if (eventName === 'change' && !line.includes('Event')) {
          fixed = line.replace(
            /on:change=\{(\w+)\}/,
            'on:change={(e: Event) => $1(e)}'
          );
          changes.push(`Updated 'change' handler to accept Event`);
        } else if (eventName === 'submit' && !line.includes('SubmitEvent')) {
          fixed = line.replace(
            /on:submit=\{(\w+)\}/,
            'on:submit={(e: SubmitEvent) => $1(e)}'
          );
          changes.push(`Updated 'submit' handler to accept SubmitEvent`);
        }
      }
    }

    // Pattern: function handler(arg: WrongType)
    // Fix: Update parameter type
    if (line.includes('function') || line.includes('=>')) {
      const paramMatch = line.match(/\((\w+):\s*(\w+)\)/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        const currentType = paramMatch[2];
        const correctType = this.inferCorrectType(currentType, error.message);
        if (correctType && correctType !== currentType) {
          fixed = line.replace(
            new RegExp(`\\(${paramName}:\\s*${currentType}\\)`),
            `(${paramName}: ${correctType})`
          );
          changes.push(
            `Updated parameter '${paramName}' type from '${currentType}' to '${correctType}'`
          );
        }
      }
    }

    lines[lineIndex] = fixed;
    return { fixed: lines.join('\n'), changes };
  }

  /**
   * Fix slot type errors
   * Implements: Requirements 4.3
   */
  private fixSlotType(
    content: string,
    error: CategorizedError
  ): { fixed: string; changes: string[] } {
    const lines = content.split('\n');
    const changes: string[] = [];

    const lineIndex = error.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return { fixed: content, changes };
    }

    const line = lines[lineIndex];
    let fixed = line;

    // Pattern: <slot let:item={value} />
    // Fix: Ensure type consistency
    if (line.includes('<slot')) {
      // Extract slot let bindings
      const letMatch = line.match(/let:(\w+)=\{(\w+)\}/);
      if (letMatch) {
        const slotVar = letMatch[1];
        const boundVar = letMatch[2];
        // Add type annotation if missing
        if (!line.includes(`: `)) {
          fixed = line.replace(
            /let:(\w+)=\{(\w+)\}/,
            `let:$1={$2} as unknown`
          );
          changes.push(
            `Added type annotation to slot binding '${slotVar}'`
          );
        }
      }
    }

    // Pattern: <svelte:fragment slot="name">
    // Ensure slot name is valid
    if (line.includes('slot=')) {
      const slotMatch = line.match(/slot="([^"]+)"/);
      if (slotMatch) {
        const slotName = slotMatch[1];
        // Validate slot name (no spaces, special chars)
        if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(slotName)) {
          const validName = slotName.replace(/[^a-zA-Z0-9_-]/g, '_');
          fixed = line.replace(/slot="[^"]+"/, `slot="${validName}"`);
          changes.push(`Fixed slot name from '${slotName}' to '${validName}'`);
        }
      }
    }

    lines[lineIndex] = fixed;
    return { fixed: lines.join('\n'), changes };
  }

  /**
   * Fix object literal type errors
   * Implements: Requirements 4.1
   */
  private fixObjectLiteralType(
    content: string,
    error: CategorizedError
  ): { fixed: string; changes: string[] } {
    const lines = content.split('\n');
    const changes: string[] = [];

    const lineIndex = error.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return { fixed: content, changes };
    }

    const line = lines[lineIndex];
    let fixed = line;

    // Pattern: { prop: value } where prop is not in type
    // Fix: Remove unknown property or add to type
    if (line.includes('{') && line.includes(':')) {
      // Extract property name from error message
      const propMatch = error.message.match(/property\s+'([^']+)'/i);
      if (propMatch) {
        const propName = propMatch[1];
        // Remove the property
        fixed = line.replace(
          new RegExp(`\\s*${propName}\\s*:\\s*[^,}]+,?`),
          ''
        );
        changes.push(`Removed unknown property '${propName}' from object`);
      }
    }

    lines[lineIndex] = fixed;
    return { fixed: lines.join('\n'), changes };
  }

  /**
   * Infer correct type from error message and context
   */
  private inferCorrectType(currentType: string, errorMessage: string): string | null {
    // Common type corrections
    const corrections: Record<string, string> = {
      'String': 'string',
      'Number': 'number',
      'Boolean': 'boolean',
      'Array': 'unknown[]',
      'Object': 'Record<string, unknown>',
      'Function': '(...args: unknown[]) => unknown',
    };

    if (corrections[currentType]) {
      return corrections[currentType];
    }

    // Try to infer from error message
    if (errorMessage.includes('string')) return 'string';
    if (errorMessage.includes('number')) return 'number';
    if (errorMessage.includes('boolean')) return 'boolean';
    if (errorMessage.includes('array')) return 'unknown[]';
    if (errorMessage.includes('object')) return 'Record<string, unknown>';

    return null;
  }

  /**
   * Check if error is a component prop error
   */
  private isComponentPropError(message: string): boolean {
    return (
      message.includes('Property') ||
      message.includes('prop') ||
      message.includes('$props')
    );
  }

  /**
   * Check if error is an event handler error
   */
  private isEventHandlerError(message: string): boolean {
    return (
      message.includes('event') ||
      message.includes('handler') ||
      message.includes('on:')
    );
  }

  /**
   * Check if error is a slot error
   */
  private isSlotError(message: string): boolean {
    return message.includes('slot') || message.includes('svelte:fragment');
  }

  /**
   * Check if error is an object literal error
   */
  private isObjectLiteralError(message: string): boolean {
    return (
      message.includes('Object literal') ||
      message.includes('only specify known properties')
    );
  }

  /**
   * Count type errors in content
   */
  private countTypeErrors(content: string): number {
    // Simple heuristic: count lines with type-related keywords
    const typeKeywords = [
      'Type',
      'is not assignable',
      'Property',
      'does not exist',
      'Object literal',
    ];
    let count = 0;
    for (const keyword of typeKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      count += matches ? matches.length : 0;
    }
    return count;
  }
}
