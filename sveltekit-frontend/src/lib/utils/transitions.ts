
// Transition utilities for Melt UI components
// Compatible with Pico CSS + UnoCSS setup

import { cubicOut } from "svelte/easing";
import type { TransitionConfig } from 'svelte/transition';
// Restored TransitionConfig type import

export function flyAndScale(
  node: Element,
  params: {
    y?: number;
    x?: number;
    start?: number;
    duration?: number;
  } = {}
): TransitionConfig {
  const style = getComputedStyle(node);
  const transform = style.transform === "none" ? "" : style.transform;
  const scaleConversion = (
    valueA: number,
    scaleA: [number, number],
    scaleB: [number, number],
  ) => {
    const [minA, maxA] = scaleA;
    const [minB, maxB] = scaleB;
    const percentage = (valueA - minA) / (maxA - minA);
    const valueB = percentage * (maxB - minB) + minB;
    return valueB;
  };

  const styleToString = (
    style: Record<string, number | string | undefined>,
  ): string => {
    return Object.keys(style).reduce((str, key) => {
      if (style[key] === undefined) return str;
      return str + `${key}:${style[key]};`;
    }, "");
  };

  return {
    duration: params.duration ?? 150,
    delay: 0,
    css: (t) => {
      const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
      const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
      const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

      return styleToString({
        transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: t,
      });
    },
    easing: cubicOut,
  };
}
export function slideInFromBottom(
  node: Element,
  params: { duration?: number; delay?: number } = {}
): TransitionConfig {
  return {
    duration: params.duration ?? 300,
    delay: params.delay ?? 0,
    css: (t) => {
      const eased = cubicOut(t);
      return `
        transform: translateY(${(1 - eased) * 20}px);
        opacity: ${eased};
      `;
    },
  };
}
export function scaleIn(
  node: Element,
  params: { duration?: number; start?: number } = {}
): TransitionConfig {
  return {
    duration: params.duration ?? 150,
    css: (t) => {
      const eased = cubicOut(t);
      const scale = (params.start ?? 0.8) + (1 - (params.start ?? 0.8)) * eased;
      return `
        transform: scale(${scale});
        opacity: ${eased};
      `;
    },
  };
}
