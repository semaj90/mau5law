#!/usr/bin/env node

/**
 * Database Setup and Migration Script
 * Ensures proper database initialization for Legal AI Case Management System
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://legal_admin:LegalSecure2024!@localhost:5432/legal_ai_v3";

console.log("🗄️ Legal AI Database Setup Starting...");
console.log(
  "📍 Database URL:",
  DATABASE_URL.replace(/\/\/.*@/, "//[credentials]@"),
);

async function setupDatabase() {
  let client;

  try {
    // Create PostgreSQL connection
    client = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(client);

    console.log("🔌 Testing database connection...");
    await client`SELECT 1 as test`;
    console.log("✅ Database connection successful!");

    // Check and install pgvector extension
    console.log("🧩 Checking pgvector extension...");
    const vectorCheck = await client`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_vector
    `;

    if (!vectorCheck[0].has_vector) {
      console.log("📦 Installing pgvector extension...");
      await client`CREATE EXTENSION IF NOT EXISTS vector`;
      console.log("✅ pgvector extension installed!");
    } else {
      console.log("✅ pgvector extension already installed!");
    }

    // Run migrations if they exist
    const migrationsPath = path.join(__dirname, "drizzle");
    if (existsSync(migrationsPath)) {
      console.log("🚀 Running database migrations...");
      try {
        await migrate(db, { migrationsFolder: migrationsPath });
        console.log("✅ Database migrations completed!");
      } catch (migrationError) {
        console.log(
          "ℹ️ No new migrations to run or migrations already applied",
        );
      }
    } else {
      console.log("ℹ️ No migrations folder found, creating basic tables...");

      // Create basic tables if no migrations exist
      await client`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          password_hash TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS cases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active',
          priority TEXT DEFAULT 'medium',
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS evidence (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID REFERENCES cases(id),
          title TEXT NOT NULL,
          file_path TEXT,
          file_type TEXT,
          file_size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
        CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
        CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
      `;
      console.log("✅ Basic tables created!");
    }

    // Verify tables
    console.log("🔍 Verifying table creation...");
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log("📋 Created tables:");
    tables.forEach((table) => {
      console.log(`  ✓ ${table.table_name}`);
    });

    console.log("");
    console.log("🎉 Database setup completed successfully!");
    console.log("🔗 You can now connect to your Legal AI database.");

    return db;
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    console.error("");
    console.error("🔧 Troubleshooting steps:");
    console.error("  1. Ensure PostgreSQL is running");
    console.error("  2. Check database credentials in .env file");
    console.error("  3. Verify database exists and is accessible");
    console.error("  4. Run: npm run db:reset to start fresh");
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Seed basic data
async function seedDatabase() {
  let client;

  try {
    client = postgres(DATABASE_URL, { max: 1 });

    console.log("🌱 Seeding initial data...");

    // Check if admin user exists
    const existingAdmin = await client`
      SELECT * FROM users WHERE email = 'admin@legal-ai.local'
    `;

    if (existingAdmin.length === 0) {
      const adminResult = await client`
        INSERT INTO users (email, name, role, password_hash) 
        VALUES ('admin@legal-ai.local', 'System Administrator', 'admin', '$2a$10$defaulthash')
        RETURNING id
      `;
      console.log("  ✓ Created admin user");

      // Create sample case with the admin user ID
      const adminId = adminResult[0].id;
      await client`
        INSERT INTO cases (title, description, status, priority, created_by) 
        VALUES (
          'Sample Legal Case', 
          'This is a sample case to demonstrate the system capabilities.',
          'active',
          'high',
          ${adminId}
        )
      `;
      console.log("  ✓ Created sample case");
    } else {
      console.log("  ℹ️ Admin user already exists");

      // Check for sample case
      const existingCase = await client`
        SELECT * FROM cases WHERE title LIKE '%Sample Legal Case%'
      `;

      if (existingCase.length === 0) {
        await client`
          INSERT INTO cases (title, description, status, priority, created_by) 
          VALUES (
            'Sample Legal Case', 
            'This is a sample case to demonstrate the system capabilities.',
            'active',
            'high',
            ${existingAdmin[0].id}
          )
        `;
        console.log("  ✓ Created sample case");
      } else {
        console.log("  ℹ️ Sample case already exists");
      }
    }

    console.log("✅ Initial data seeded successfully!");
  } catch (error) {
    console.log("⚠️ Seeding completed with some warnings:", error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Main execution
async function main() {
  await setupDatabase();

  // Only seed if this is a fresh setup
  if (process.argv.includes("--seed")) {
    await seedDatabase();
  }

  console.log("");
  console.log("🚀 Ready to launch Legal AI Case Management System!");
  console.log("📖 Next steps:");
  console.log("  1. npm run dev (start development server)");
  console.log("  2. Open http://localhost:5173");
  console.log('  3. Click "Demo Login" to access the system');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { setupDatabase, seedDatabase };
