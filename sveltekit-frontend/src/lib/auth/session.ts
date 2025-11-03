// Deprecated duplicate Lucia session definition. Re-export canonical lucia instance. import {lucia} from '../server/auth.js';
export { lucia };
export type Auth = typeof lucia;
