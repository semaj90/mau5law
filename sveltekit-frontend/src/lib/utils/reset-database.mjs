#!/usr/bin/env node

/**
 * PostgreSQL Database Reset Script
 * Drops all tables and recreates schema from scratch
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://legal_admin:LegalSecure2024!@localhost:5432/legal_ai_v3";

async function resetDatabase() {
  console.log("🔄 Resetting PostgreSQL database...");
  console.log("⚠️ This will DELETE ALL DATA!");

  let client;

  try {
    client = postgres(DATABASE_URL, { max: 1 });

    // Drop all tables in public schema
    console.log("🗑️ Dropping existing tables...");
    await client`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
      GRANT ALL ON SCHEMA public TO legal_admin;
    `;

    // Recreate pgvector extension
    await client`CREATE EXTENSION IF NOT EXISTS vector`;

    console.log("✅ Database reset completed!");
    console.log("🔄 Run setup-database.mjs --seed to recreate schema and data");
  } catch (error) {
    console.error("❌ Reset failed:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

resetDatabase();
