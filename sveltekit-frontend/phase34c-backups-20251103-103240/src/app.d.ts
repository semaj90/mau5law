import type { Session } from 'lucia';
declare global {
  namespace App {
    interface Locals {
      user?: { id: string, email?: string; role?: string };
      session?: Session}
  }
}
export {};
