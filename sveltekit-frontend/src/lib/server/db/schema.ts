// src/lib/server/db/schema.ts
// Main schema file - re-exports from schema-postgres.ts
// This is the canonical schema for the legal AI application

export * from './schema-postgres.js';

// Evidence CRUD + RAG Integration tables
export * from './schema-evidence-crud.js';

// Also export additional schema modules as needed
// export * from './schema-route-errors.js';
// export * from './schema-phase78.js';
