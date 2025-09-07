// Unified locals typing to ensure consistent RequestEvent.locals narrowing
import type { Session } from 'lucia';

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email?: string;
      role: 'admin' | 'user' | 'prosecutor' | 'detective';
    } | null;
    session: Session | null;
    
    // Common runtime helpers attached to locals in hooks
    db?: any;
    audit?: any;
  }
}


// Also augment the SvelteKit module so `Locals` used in RequestEvent and routes
// matches the canonical App.Locals above.
declare module '@sveltejs/kit' {
  interface Locals extends App.Locals {}
  
  interface RequestEvent {
    locals: App.Locals;
  }
}

// Utility function to cast locals for type safety
export function getTypedLocals(locals: any): App.Locals {
  return locals as App.Locals;
}


