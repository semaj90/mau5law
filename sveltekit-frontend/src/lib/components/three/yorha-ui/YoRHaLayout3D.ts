/**
 * YoRHa 3D Layout Management System
 * Advanced CSS-like layout system for 3D UI components
 */

import * as THREE from 'three';
import { YoRHa3DComponent } from './YoRHaUI3D';

export interface YoRHaLayoutOptions {
  type: 'flex' | 'grid' | 'absolute' | 'stack' | 'flow';
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justify?: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number;
  padding?: YoRHaPadding3D;
  gridColumns?: number;
  gridRows?: number;
  gridTemplate?: string;
  zSpacing?: number; // 3D-specific spacing
}

export interface YoRHaPadding3D {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  front?: number; // 3D-specific
  back?: number;  // 3D-specific
}

export interface YoRHaChildLayout {
  flex?: number;
  grow?: number;
  shrink?: number;
  basis?: number;
  alignSelf?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  order?: number;
  gridColumn?: string | number;
  gridRow?: string | number;
  position?: YoRHaPosition3D;
  margin?: YoRHaPadding3D;
}

export interface YoRHaPosition3D {
  x?: number;
  y?: number;
  z?: number;
  relative?: boolean;
}

export class YoRHaLayout3D extends THREE.Group {
  private options: YoRHaLayoutOptions;
  private children3D: Array<{ 
    component: YoRHa3DComponent; 
    layout: YoRHaChildLayout;
    originalPosition: THREE.Vector3;
  }> = [];
  private bounds = new THREE.Box3();
  private needsLayout = true;

  constructor(options: YoRHaLayoutOptions) {
    super();
    this.options = options;
  }

  public addChild(component: YoRHa3DComponent | YoRHaLayout3D, layout: YoRHaChildLayout = {}): void {
    // Store original position
    const originalPosition = component.position.clone();
    
    // Cast to YoRHa3DComponent for the internal array (layout components can be treated as components)
    const comp = component as YoRHa3DComponent;
    this.children3D.push({
      component: comp,
      layout,
      originalPosition
    });
    
    this.add(component);
    this.needsLayout = true;
  }

  public removeChild(component: YoRHa3DComponent): void {
    const index = this.children3D.findIndex(child => child.component === component);
    if (index !== -1) {
      this.children3D.splice(index, 1);
      this.remove(component);
      this.needsLayout = true;
    }
  }

  public updateLayout(): void {
    if (!this.needsLayout) return;
    
    switch (this.options.type) {
      case 'flex':
        this.layoutFlex();
        break;
      case 'grid':
        this.layoutGrid();
        break;
      case 'absolute':
        this.layoutAbsolute();
        break;
      case 'stack':
        this.layoutStack();
        break;
      case 'flow':
        this.layoutFlow();
        break;
    }
    
    this.needsLayout = false;
  }

  private layoutFlex(): void {
    if (this.children3D.length === 0) return;

    const isRow = this.options.direction === 'row' || this.options.direction === 'row-reverse';
    const isReverse = this.options.direction?.includes('reverse');
    const gap = this.options.gap || 0.2;
    const padding = this.normalizePadding(this.options.padding);
    
    // Calculate total size of children
    let totalMainSize = 0;
    let maxCrossSize = 0;
    let totalFlex = 0;
    
    const childSizes: Array<{ main: number; cross: number; flex: number }> = [];
    
    this.children3D.forEach(({ component, layout }) => {
      const bounds = this.getComponentBounds(component);
      const mainSize = isRow ? bounds.x : bounds.y;
      const crossSize = isRow ? bounds.y : bounds.x;
      const flex = layout.flex || layout.grow || 0;
      
      childSizes.push({ main: mainSize, cross: crossSize, flex });
      totalMainSize += mainSize;
      maxCrossSize = Math.max(maxCrossSize, crossSize);
      totalFlex += flex;
    });
    
    // Calculate available space
    const containerBounds = this.getContainerBounds();
    const availableMain = (isRow ? containerBounds.x : containerBounds.y) - 
                         padding.left - padding.right - 
                         (gap * (this.children3D.length - 1));
    const availableCross = (isRow ? containerBounds.y : containerBounds.x) - 
                          padding.top - padding.bottom;
    
    // Distribute extra space among flex items
    const extraSpace = Math.max(0, availableMain - totalMainSize);
    const flexSpace = totalFlex > 0 ? extraSpace / totalFlex : 0;
    
    // Position children
    let currentPosition = this.getStartPosition(availableMain, totalMainSize, padding);
    
    this.children3D.forEach(({ component, layout }, index) => {
      const childIndex = isReverse ? this.children3D.length - 1 - index : index;
      const { component: child, layout: childLayout } = this.children3D[childIndex];
      const { main, cross, flex } = childSizes[childIndex];
      
      const finalMainSize = main + (flex * flexSpace);
      const crossPosition = this.getCrossPosition(cross, availableCross, childLayout.alignSelf, padding);
      
      if (isRow) {
        child.position.set(
          currentPosition + finalMainSize / 2,
          crossPosition,
          this.getZPosition(childLayout)
        );
      } else {
        child.position.set(
          crossPosition,
          currentPosition + finalMainSize / 2,
          this.getZPosition(childLayout)
        );
      }
      
      currentPosition += finalMainSize + gap;
    });
  }

  private layoutGrid(): void {
    if (this.children3D.length === 0) return;

    const columns = this.options.gridColumns || Math.ceil(Math.sqrt(this.children3D.length));
    const rows = this.options.gridRows || Math.ceil(this.children3D.length / columns);
    const gap = this.options.gap || 0.2;
    const padding = this.normalizePadding(this.options.padding);
    
    const containerBounds = this.getContainerBounds();
    const availableWidth = containerBounds.x - padding.left - padding.right - (gap * (columns - 1));
    const availableHeight = containerBounds.y - padding.top - padding.bottom - (gap * (rows - 1));
    
    const cellWidth = availableWidth / columns;
    const cellHeight = availableHeight / rows;
    
    this.children3D.forEach(({ component, layout }, index) => {
      // Determine grid position
      let column: number, row: number;
      
      if (layout.gridColumn !== undefined && layout.gridRow !== undefined) {
        column = typeof layout.gridColumn === 'number' ? layout.gridColumn : parseInt(layout.gridColumn) - 1;
        row = typeof layout.gridRow === 'number' ? layout.gridRow : parseInt(layout.gridRow) - 1;
      } else {
        column = index % columns;
        row = Math.floor(index / columns);
      }
      
      const x = -containerBounds.x / 2 + padding.left + (column * (cellWidth + gap)) + cellWidth / 2;
      const y = containerBounds.y / 2 - padding.top - (row * (cellHeight + gap)) - cellHeight / 2;
      const z = this.getZPosition(layout);
      
      component.position.set(x, y, z);
    });
  }

  private layoutAbsolute(): void {
    this.children3D.forEach(({ component, layout }) => {
      if (layout.position) {
        const pos = layout.position;
        component.position.set(
          pos.x || 0,
          pos.y || 0,
          pos.z || 0
        );
      }
    });
  }

  private layoutStack(): void {
    const zSpacing = this.options.zSpacing || 0.1;
    const padding = this.normalizePadding(this.options.padding);
    
    this.children3D.forEach(({ component, layout }, index) => {
      component.position.set(
        0,
        0,
        padding.front + (index * zSpacing)
      );
    });
  }

  private layoutFlow(): void {
    if (this.children3D.length === 0) return;

    const gap = this.options.gap || 0.2;
    const padding = this.normalizePadding(this.options.padding);
    const containerBounds = this.getContainerBounds();
    const availableWidth = containerBounds.x - padding.left - padding.right;
    
    let currentX = -availableWidth / 2;
    let currentY = containerBounds.y / 2 - padding.top;
    let lineHeight = 0;
    
    this.children3D.forEach(({ component, layout }) => {
      const bounds = this.getComponentBounds(component);
      
      // Check if component fits on current line
      if (currentX + bounds.x > availableWidth / 2) {
        // Move to next line
        currentX = -availableWidth / 2;
        currentY -= lineHeight + gap;
        lineHeight = 0;
      }
      
      component.position.set(
        currentX + bounds.x / 2,
        currentY - bounds.y / 2,
        this.getZPosition(layout)
      );
      
      currentX += bounds.x + gap;
      lineHeight = Math.max(lineHeight, bounds.y);
    });
  }

  private getComponentBounds(component: YoRHa3DComponent): THREE.Vector3 {
    // Get component's bounding box
    const box = new THREE.Box3().setFromObject(component);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  private getContainerBounds(): THREE.Vector3 {
    // Calculate container bounds (could be based on viewport or parent)
    return new THREE.Vector3(10, 8, 5); // Default bounds
  }

  private normalizePadding(padding?: YoRHaPadding3D): Required<YoRHaPadding3D> {
    return {
      top: padding?.top || 0,
      right: padding?.right || 0,
      bottom: padding?.bottom || 0,
      left: padding?.left || 0,
      front: padding?.front || 0,
      back: padding?.back || 0
    };
  }

  private getStartPosition(availableMain: number, totalMainSize: number, padding: Required<YoRHaPadding3D>): number {
    const containerBounds = this.getContainerBounds();
    let start = -availableMain / 2 + padding.left;
    
    switch (this.options.justify) {
      case 'center':
        start = -totalMainSize / 2;
        break;
      case 'end':
        start = availableMain / 2 - totalMainSize + padding.left;
        break;
      case 'space-between':
        start = -availableMain / 2 + padding.left;
        break;
      case 'space-around':
      case 'space-evenly':
        // Handled in flex distribution
        break;
    }
    
    return start;
  }

  private getCrossPosition(
    childCrossSize: number, 
    availableCross: number, 
    alignSelf: string | undefined, 
    padding: Required<YoRHaPadding3D>
  ): number {
    const align = alignSelf || this.options.align || 'start';
    
    switch (align) {
      case 'center':
        return 0;
      case 'end':
        return availableCross / 2 - childCrossSize / 2 - padding.bottom;
      case 'start':
      default:
        return -availableCross / 2 + childCrossSize / 2 + padding.top;
    }
  }

  private getZPosition(layout: YoRHaChildLayout): number {
    if (layout.position?.z !== undefined) {
      return layout.position.z;
    }
    
    const zSpacing = this.options.zSpacing || 0;
    return zSpacing * (layout.order || 0);
  }

  // Public API methods
  public setLayoutType(type: YoRHaLayoutOptions['type']): void {
    this.options.type = type;
    this.needsLayout = true;
  }

  public setDirection(direction: YoRHaLayoutOptions['direction']): void {
    this.options.direction = direction;
    this.needsLayout = true;
  }

  public setGap(gap: number): void {
    this.options.gap = gap;
    this.needsLayout = true;
  }

  public setJustifyContent(justify: YoRHaLayoutOptions['justify']): void {
    this.options.justify = justify;
    this.needsLayout = true;
  }

  public setAlignItems(align: YoRHaLayoutOptions['align']): void {
    this.options.align = align;
    this.needsLayout = true;
  }

  public setPadding(padding: YoRHaPadding3D): void {
    this.options.padding = padding;
    this.needsLayout = true;
  }

  public getChildLayout(component: YoRHa3DComponent): YoRHaChildLayout | undefined {
    const child = this.children3D.find(c => c.component === component);
    return child?.layout;
  }

  public setChildLayout(component: YoRHa3DComponent, layout: YoRHaChildLayout): void {
    const child = this.children3D.find(c => c.component === component);
    if (child) {
      child.layout = { ...child.layout, ...layout };
      this.needsLayout = true;
    }
  }

  public animate(): void {
    if (this.needsLayout) {
      this.updateLayout();
    }
  }

  public dispose(): void {
    this.children3D.forEach(({ component }) => {
      component.dispose();
    });
    this.children3D = [];
  }
}

// Utility function to create common layout configurations
export class YoRHaLayoutPresets {
  static createFlexRow(gap = 0.2): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'flex',
      direction: 'row',
      justify: 'start',
      align: 'center',
      gap
    });
  }

  static createFlexColumn(gap = 0.2): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'flex',
      direction: 'column',
      justify: 'start',
      align: 'center',
      gap
    });
  }

  static createGrid(columns: number, rows?: number, gap = 0.2): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'grid',
      gridColumns: columns,
      gridRows: rows,
      gap
    });
  }

  static createCenteredStack(zSpacing = 0.1): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'stack',
      justify: 'center',
      align: 'center',
      zSpacing
    });
  }

  static createFlowLayout(gap = 0.2): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'flow',
      wrap: 'wrap',
      gap
    });
  }

  static createDialog(): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'flex',
      direction: 'column',
      justify: 'center',
      align: 'center',
      padding: { top: 0.3, right: 0.3, bottom: 0.3, left: 0.3, front: 0, back: 0 },
      gap: 0.3
    });
  }

  static createForm(): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'flex',
      direction: 'column',
      justify: 'start',
      align: 'stretch',
      padding: { top: 0.4, right: 0.4, bottom: 0.4, left: 0.4, front: 0, back: 0 },
      gap: 0.25
    });
  }

  static createToolbar(): YoRHaLayout3D {
    return new YoRHaLayout3D({
      type: 'flex',
      direction: 'row',
      justify: 'space-between',
      align: 'center',
      padding: { top: 0.1, right: 0.2, bottom: 0.1, left: 0.2, front: 0, back: 0 },
      gap: 0.15
    });
  }
}