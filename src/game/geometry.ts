/**
 * Renderer-independent geometry helpers.
 *
 * The combat simulation must not depend on Phaser: that keeps the fighting
 * rules testable in plain JavaScript and makes the engine portable.
 */

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export interface Box {
  /** left edge */
  x: number;
  /** top edge */
  y: number;
  w: number;
  h: number;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
