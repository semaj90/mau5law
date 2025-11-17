import type { User } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types';
export type User = { id?: string; name?: string; email?: string; roles?: string[] };
declare const user: User | null;
export default user;
