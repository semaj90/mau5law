/// <reference types="vite/client" />
// Database connection for Legal AI platform
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Database configuration - using environment variables or defaults
const DATABASE_URL = import.meta.env.DATABASE_URL || 
  import.meta.env.DEV_DATABASE_URL || 
  'postgresql://postgres:123456@localhost:5432/legal_ai_db';

// Create postgres client
const client = postgres(DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false // Disable prepared statements for compatibility
});

// Create Drizzle instance
export const db = drizzle(client, {
  logger: import.meta.env.NODE_ENV === 'development'
});

// Export client for raw SQL queries if needed
export { client };

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error: any) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Close connection (for graceful shutdown)
export async function closeConnection(): Promise<void> {
  await client.end();
}