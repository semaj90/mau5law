// Lightweight shim for, 'drizzle-orm' and local DB modules to reduce TS noise during migration. // This file intentionally keeps very permissive `any` types. It's reversible and only used to'
// unblock typechecking while we implement proper typed migrations for Drizzle and DB schemas. declare module, 'drizzle-orm' { const _drizzle: unknown | export = _drizzle}
declare module, '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/db/*' { const _dbSchema: unknown, export default _dbSchema}
declare module, '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/db/*/schema*' { const _dbSchema: unknown, export default _dbSchema} 
