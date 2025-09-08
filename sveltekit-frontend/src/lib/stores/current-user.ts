import { writable } from 'svelte/store';

export const currentUser = writable<{ id: string; email?: string; role?: string } | null>(null);

export async function hydrateCurrentUser() {
  try {
    const r = await fetch('/api/user/me');
    const j = await r.json();
    currentUser.set(j.user || null);
  } catch {
    currentUser.set(null);
  }
}
