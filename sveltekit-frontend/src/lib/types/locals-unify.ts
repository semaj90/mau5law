// Runtime implementation for SSR imports
// Keep ambient typings in locals-unify.d.ts; this file provides the actual function at runtime.
import type { RequestEvent } from '@sveltejs/kit';

export type TypedLocals = App.Locals;

export function getTypedLocals(locals: unknown): App.Locals {
  return locals as App.Locals;
}
