#!/usr/bin/env node

/**
 * PostgreSQL Connection Verification Script
 * Tests database connectivity before running the main application
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://legal_admin:LegalSecure2024!@localhost:5432/legal_ai_v3";

async function verifyConnection() {
  console.log("🔍 Verifying PostgreSQL connection...");
  console.log(
    "📍 Database URL:",
    DATABASE_URL.replace(/\/\/.*@/, "//[credentials]@"),
  );

  let client;

  try {
    // Create connection
    client = postgres(DATABASE_URL, { max: 1 });

    // Test basic connection
    const result =
      await client`SELECT version() as version, current_database() as database`;
    console.log("✅ Connection successful!");
    console.log("📊 PostgreSQL version:", result[0].version.split(" ")[1]);
    console.log("🗄️ Connected to database:", result[0].database);

    // Check for required tables
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if (tables.length > 0) {
      console.log("📋 Existing tables:");
      tables.forEach((table) => console.log(`  ✓ ${table.table_name}`));
    } else {
      console.log(
        "⚠️ No tables found - run setup-database.mjs to create schema",
      );
    }

    // Check pgvector extension
    const extensions = await client`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;

    if (extensions.length > 0) {
      console.log("🧩 pgvector extension: ✅ Installed");
    } else {
      console.log("🧩 pgvector extension: ⚠️ Not installed");
    }

    console.log("");
    console.log("🎉 Database verification completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("   ", error.message);
    console.error("");
    console.error("🔧 Troubleshooting:");
    console.error("   1. Ensure PostgreSQL is running");
    console.error("   2. Verify database credentials");
    console.error("   3. Check if database exists");
    console.error("   4. See POSTGRESQL-SETUP.md for setup instructions");
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyConnection().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { verifyConnection };
