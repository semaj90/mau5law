
// Simple content node interface
export interface ContentNode {
  type: string;
  text?: string;
  children?: ContentNode[];
  [key: string]: unknown;
}
/**
 * History Manager for undo/redo functionality in reports
 * Manages snapshots of document state for version control
 */
export class HistoryManager {
  private history: ContentNode[][] = [];
  private currentIndex = -1;
  private maxHistorySize = 50;

  constructor(initialValue?: ContentNode[]) {
    if (initialValue) {
      this.addSnapshot(initialValue);
    }
  }
  /**
   * Add a new snapshot to history
   */
  addSnapshot(value: ContentNode[]): void {
    // Remove any history after current index (when making changes after undo)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new snapshot
    this.history.push(JSON.parse(JSON.stringify(value)));
    this.currentIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
      this.currentIndex = this.history.length - 1;
    }
  }
  /**
   * Undo to previous state
   */
  undo(): ContentNode[] | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    }
    return null;
  }
  /**
   * Redo to next state
   */
  redo(): ContentNode[] | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    }
    return null;
  }
  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }
  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
  /**
   * Get current snapshot
   */
  getCurrentSnapshot(): ContentNode[] | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    }
    return null;
  }
  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
  /**
   * Get history stats
   */
  getStats() {
    return {
      totalSnapshots: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }
}
