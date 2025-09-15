/**
 * Database Sync Test Page Types
 * Re-export the server load data type for client-side usage
 */

import type { DatabaseSyncTestData } from './+page.server.js';

export type PageData = DatabaseSyncTestData;