#!/usr/bin/env node

import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const client = new Client({
  host: 'localhost',
  port: 5434,
  user: 'legal_admin', 
  password: 'testpass123',
  database: 'legal_ai_test',
});

async function waitForDatabase(maxRetries = 30, delay = 2000) {
  console.log('🔄 Waiting for database to be ready for seeding...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await execAsync('docker exec legal_ai_test_db pg_isready -U legal_admin -d legal_ai_test');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Extra wait for full initialization
      return;
    } catch (error) {
      console.log(`⏳ Database not ready yet (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('❌ Database failed to become ready within timeout');
}

async function seedTestData() {
  try {
    await waitForDatabase();
    await client.connect();
    console.log('Connected to test database...');

    // Clear existing data
    await client.query('TRUNCATE users, sessions, cases, persons_of_interest, evidence, legal_documents, case_activities CASCADE');

    // Create test user
    const userResult = await client.query(`
      INSERT INTO users (id, email, hashed_password, name, role, email_verified, is_active)
      VALUES (
        '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57',
        'test@example.com',
        '$2a$10$Xz5k8h9WkEjf.P3QnX.rLuyUB2vG8Q.hN7MxJj1qYzWvGdL0gGOsW',
        'Test Prosecutor',
        'prosecutor',
        NOW(),
        true
      ) RETURNING id
    `);
    console.log('Created test user:', userResult.rows[0].id);

    // Create test session
    await client.query(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (
        'test_session_123',
        '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57',
        NOW() + INTERVAL '7 days'
      )
    `);
    console.log('Created test session: test_session_123');

    // Create test case
    const caseResult = await client.query(`
      INSERT INTO cases (id, title, description, status, created_by)
      VALUES (
        uuid_generate_v4(),
        'Test Criminal Case 2024',
        'Test case for Playwright automation testing',
        'active',
        '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57'
      ) RETURNING id
    `);
    const caseId = caseResult.rows[0].id;
    console.log('Created test case:', caseId);

    // Create test persons of interest
    const persons = [
      {
        name: 'John Test Suspect',
        aliases: '["Johnny", "J. Test"]',
        relationship: 'Primary Suspect',
        threat_level: 'high',
        status: 'active',
        profile_data: '{"age": 35, "occupation": "Unknown", "last_known_address": "123 Test St"}',
        tags: '["violent", "armed", "flight-risk"]'
      },
      {
        name: 'Jane Test Witness',
        aliases: '["Janie"]',
        relationship: 'Key Witness',
        threat_level: 'low',
        status: 'cooperating',
        profile_data: '{"age": 28, "occupation": "Teacher", "reliability": "high"}',
        tags: '["cooperative", "reliable"]'
      },
      {
        name: 'Mike Test Associate',
        aliases: '[]',
        relationship: 'Known Associate',
        threat_level: 'medium',
        status: 'monitoring',
        profile_data: '{"age": 42, "occupation": "Construction Worker"}',
        tags: '["surveillance"]'
      }
    ];

    for (const person of persons) {
      await client.query(`
        INSERT INTO persons_of_interest (case_id, name, aliases, relationship, threat_level, status, profile_data, tags, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [caseId, person.name, person.aliases, person.relationship, person.threat_level, person.status, person.profile_data, person.tags, '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57']);
    }
    console.log('Created 3 test persons of interest');

    // Create test evidence
    await client.query(`
      INSERT INTO evidence (case_id, filename, file_type, file_size, storage_path, metadata, created_by)
      VALUES (
        $1,
        'test_evidence.pdf',
        'application/pdf',
        1024000,
        '/test/evidence/test_evidence.pdf',
        '{"description": "Test evidence document", "collected_by": "Officer Test", "chain_of_custody": ["Officer Test", "Detective Smith"]}',
        '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57'
      )
    `, [caseId]);
    console.log('Created test evidence');

    // Create test legal document
    await client.query(`
      INSERT INTO legal_documents (case_id, title, content, document_type, metadata, created_by)
      VALUES (
        $1,
        'Test Search Warrant',
        'This is a test search warrant document for Playwright testing...',
        'warrant',
        '{"issued_by": "Judge Test", "case_number": "TEST-2024-001", "valid_until": "2024-12-31"}',
        '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57'
      )
    `, [caseId]);
    console.log('Created test legal document');

    // Create test case activity
    await client.query(`
      INSERT INTO case_activities (case_id, activity_type, description, metadata, created_by)
      VALUES (
        $1,
        'investigation',
        'Initial case setup for automated testing',
        '{"automated": true, "test_data": true}',
        '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57'
      )
    `, [caseId]);
    console.log('Created test case activity');

    console.log('✅ Test database seeded successfully');
    console.log('Test credentials:');
    console.log('  Email: test@example.com');
    console.log('  Session ID: test_session_123');
    console.log('  User ID: 1ebbbeb1-baed-4c9f-a7d5-7367cf167c57');

  } catch (error) {
    console.error('❌ Error seeding test database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedTestData();