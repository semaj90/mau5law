#!/usr/bin/env node

/**
 * Database Schema Validation Script
 * Validates Drizzle schema matches PostgreSQL database structure
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./src/lib/db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://legal_admin:LegalSecure2024!@localhost:5432/legal_ai_v3";

async function validateSchema() {
  console.log("🔍 Validating Database Schema...");

  let client;

  try {
    client = postgres(DATABASE_URL, { max: 1 });

    // Expected tables from Drizzle schema
    const expectedTables = [
      "users",
      "cases",
      "evidence",
      "documents",
      "notes",
      "ai_history",
      "collaboration_sessions",
    ];

    // Get actual tables from database
    const actualTables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const actualTableNames = actualTables.map((t) => t.table_name);

    console.log("\n📋 Schema Validation Results:");
    console.log("============================");

    let allValid = true;

    // Check each expected table
    for (const tableName of expectedTables) {
      if (actualTableNames.includes(tableName)) {
        console.log(`✅ ${tableName}`);

        // Validate key columns for main tables
        if (["users", "cases", "evidence"].includes(tableName)) {
          await validateTableStructure(client, tableName);
        }
      } else {
        console.log(`❌ ${tableName} - MISSING`);
        allValid = false;
      }
    }

    // Check for unexpected tables
    const unexpectedTables = actualTableNames.filter(
      (name) =>
        !expectedTables.includes(name) &&
        !name.startsWith("__drizzle") &&
        !name.startsWith("pg_"),
    );

    if (unexpectedTables.length > 0) {
      console.log("\n⚠️ Unexpected tables found:");
      unexpectedTables.forEach((name) => console.log(`  - ${name}`));
    }

    // Test relations
    console.log("\n🔗 Testing Relations:");
    await testRelations(client);

    console.log("\n🎯 Schema Status:", allValid ? "✅ VALID" : "❌ INVALID");
    return allValid;
  } catch (error) {
    console.error("❌ Schema validation failed:", error.message);
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

async function validateTableStructure(client, tableName) {
  try {
    const columns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    const requiredColumns = {
      users: ["id", "email", "name", "role", "password_hash"],
      cases: ["id", "title", "status", "created_by"],
      evidence: ["id", "case_id", "title", "type", "created_by"],
    };

    const actualColumns = columns.map((c) => c.column_name);
    const required = requiredColumns[tableName] || [];

    for (const col of required) {
      if (!actualColumns.includes(col)) {
        console.log(`    ❌ Missing column: ${col}`);
        return false;
      }
    }

    console.log(`    ✓ Structure valid (${actualColumns.length} columns)`);
    return true;
  } catch (error) {
    console.log(`    ❌ Structure check failed: ${error.message}`);
    return false;
  }
}

async function testRelations(client) {
  try {
    // Test foreign key constraints
    const constraints = await client`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
             ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;

    console.log(`✓ Found ${constraints.length} foreign key constraints`);

    // Test sample relation queries
    const sampleQuery = await client`
      SELECT c.title, u.name as creator_name
      FROM cases c
      JOIN users u ON c.created_by = u.id
      LIMIT 1
    `;

    console.log(
      `✓ Relations working (sample query returned ${sampleQuery.length} rows)`,
    );
  } catch (error) {
    console.log(`❌ Relations test failed: ${error.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateSchema().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { validateSchema };
