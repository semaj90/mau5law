#!/usr/bin/env node

/**
 * PostgreSQL CRUD Testing Script
 * Tests all database operations for Legal AI Case Management System
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./src/lib/db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://legal_admin:LegalSecure2024!@localhost:5432/legal_ai_v3";

async function testCRUDOperations() {
  console.log("🧪 Testing PostgreSQL CRUD Operations...");
  console.log(
    "📍 Database:",
    DATABASE_URL.replace(/\/\/.*@/, "//[credentials]@"),
  );

  let client;
  const testResults = {
    connection: false,
    userCRUD: false,
    caseCRUD: false,
    evidenceCRUD: false,
    relations: false,
    cleanup: false,
  };

  try {
    // Test 1: Connection
    console.log("\n[TEST 1] Database Connection...");
    client = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(client, { schema });

    await client`SELECT 1 as test`;
    console.log("✅ Connection successful");
    testResults.connection = true;

    // Test 2: User CRUD
    console.log("\n[TEST 2] User CRUD Operations...");

    // Create user
    const testUser = await db
      .insert(schema.users)
      .values({
        email: "test@crud.local",
        name: "Test User",
        role: "prosecutor",
        passwordHash: "$2a$10$testhash",
      })
      .returning();
    console.log("  ✓ User created:", testUser[0].id);

    // Read user
    const readUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, testUser[0].id));
    console.log("  ✓ User read:", readUser[0].email);

    // Update user
    await db
      .update(schema.users)
      .set({ name: "Updated Test User" })
      .where(eq(schema.users.id, testUser[0].id));
    console.log("  ✓ User updated");

    testResults.userCRUD = true;

    // Test 3: Case CRUD
    console.log("\n[TEST 3] Case CRUD Operations...");

    // Create case
    const testCase = await db
      .insert(schema.cases)
      .values({
        title: "Test Legal Case",
        description: "CRUD testing case",
        status: "active",
        priority: "high",
        createdBy: testUser[0].id,
      })
      .returning();
    console.log("  ✓ Case created:", testCase[0].id);

    // Read case with relations
    const readCase = await db.query.cases.findFirst({
      where: eq(schema.cases.id, testCase[0].id),
      with: {
        creator: true,
      },
    });
    console.log("  ✓ Case read with creator:", readCase.creator.name);

    testResults.caseCRUD = true;

    // Test 4: Evidence CRUD
    console.log("\n[TEST 4] Evidence CRUD Operations...");

    // Create evidence
    const testEvidence = await db
      .insert(schema.evidence)
      .values({
        caseId: testCase[0].id,
        title: "Test Evidence",
        description: "CRUD testing evidence",
        type: "document",
        content: "Sample evidence content",
        createdBy: testUser[0].id,
      })
      .returning();
    console.log("  ✓ Evidence created:", testEvidence[0].id);

    // Read evidence with relations
    const readEvidence = await db.query.evidence.findFirst({
      where: eq(schema.evidence.id, testEvidence[0].id),
      with: {
        case: true,
        creator: true,
      },
    });
    console.log("  ✓ Evidence read with case:", readEvidence.case.title);

    testResults.evidenceCRUD = true;

    // Test 5: Complex Relations
    console.log("\n[TEST 5] Complex Relations...");

    // Get case with all evidence
    const caseWithEvidence = await db.query.cases.findFirst({
      where: eq(schema.cases.id, testCase[0].id),
      with: {
        evidence: {
          with: {
            creator: true,
          },
        },
        creator: true,
      },
    });

    console.log(
      "  ✓ Case with evidence count:",
      caseWithEvidence.evidence.length,
    );
    console.log(
      "  ✓ Evidence creator:",
      caseWithEvidence.evidence[0].creator.name,
    );

    testResults.relations = true;

    // Test 6: Cleanup
    console.log("\n[TEST 6] Cleanup...");

    await db
      .delete(schema.evidence)
      .where(eq(schema.evidence.id, testEvidence[0].id));
    await db.delete(schema.cases).where(eq(schema.cases.id, testCase[0].id));
    await db.delete(schema.users).where(eq(schema.users.id, testUser[0].id));

    console.log("  ✓ Test data cleaned up");
    testResults.cleanup = true;

    // Results Summary
    console.log("\n🎉 CRUD Test Results:");
    console.log("=====================================");
    console.log(`Connection:   ${testResults.connection ? "✅" : "❌"}`);
    console.log(`User CRUD:    ${testResults.userCRUD ? "✅" : "❌"}`);
    console.log(`Case CRUD:    ${testResults.caseCRUD ? "✅" : "❌"}`);
    console.log(`Evidence CRUD:${testResults.evidenceCRUD ? "✅" : "❌"}`);
    console.log(`Relations:    ${testResults.relations ? "✅" : "❌"}`);
    console.log(`Cleanup:      ${testResults.cleanup ? "✅" : "❌"}`);

    const allPassed = Object.values(testResults).every(
      (result) => result === true,
    );
    console.log(
      `\nOverall: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`,
    );

    return allPassed;
  } catch (error) {
    console.error("❌ CRUD Test failed:", error.message);
    console.error("\nFull error:", error);
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Import eq from drizzle-orm for queries
import { eq } from "drizzle-orm";

if (import.meta.url === `file://${process.argv[1]}`) {
  testCRUDOperations().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { testCRUDOperations };
