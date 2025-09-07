declare namespace App {
  interface Locals {
    user: {
      id: string;
      email?: string;
      role: 'admin' | 'user' | 'prosecutor' | 'detective';
    } | null;
    session: import('lucia').Session | null;
  }
}


