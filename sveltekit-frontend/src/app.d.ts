import type { Session } from "lucia";

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email?: string;
        role?: string;
      } | null;
      session: Session | null;
      contextualSessionId?: string | null;
      contextualUserId?: string | null;
    }
  }
}

export {};
