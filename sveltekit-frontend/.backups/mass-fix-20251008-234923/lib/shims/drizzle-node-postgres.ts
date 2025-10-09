// Re-export the postgres-js adapter so imports of 'drizzle-orm/node-postgres'
// resolve to the postgres-js implementation at build/runtime.

export * from 'drizzle-orm/postgres-js';
export { drizzle } from 'drizzle-orm/postgres-js';

import * as postgresJs from 'drizzle-orm/postgres-js';
export default postgresJs;
export * from 'drizzle-orm/postgres-js';
import * as _default from 'drizzle-orm/postgres-js';
export default _default;
