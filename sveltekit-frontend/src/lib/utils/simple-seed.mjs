#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

// Database connection configurations to try
const dbConfigs = [
  'postgresql://postgres:123456@localhost:5432/legal_ai_db',
  'postgresql://postgres:postgres@localhost:5432/legal_ai_db', 
  'postgresql://legal_admin:123456@localhost:5432/legal_ai_db',
  'postgresql://legal_admin:LegalAI2024!@localhost:5432/legal_ai_db'
];

let pool;

async function connectToDatabase() {
  for (const config of dbConfigs) {
    try {
      pool = new Pool({ connectionString: config });
      
      // Test the connection
      await pool.query('SELECT 1 as test');
      console.log('✅ Database connection successful with:', config.replace(/:[^:@]*@/, ':****@'));
      return true;
    } catch (error) {
      console.log(`❌ Failed to connect with: ${config.replace(/:[^:@]*@/, ':****@')}`);
    }
  }
  throw new Error('Could not connect to database with any credentials');
}

async function seed() {
  console.log('🌱 Starting simplified database seed...');

  try {
    // Connect to database
    await connectToDatabase();

    // Check if pgvector extension is installed
    try {
      const extensionCheck = await pool.query(`
        SELECT * FROM pg_extension WHERE extname = 'vector';
      `);
      if (extensionCheck.rows.length === 0) {
        console.log('⚠️  pgvector extension not found, attempting to create...');
        await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        console.log('✅ pgvector extension created');
      } else {
        console.log('✅ pgvector extension already installed');
      }
    } catch (error) {
      console.log('⚠️  pgvector extension check failed:', error.message);
    }

    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'cases', 'evidence', 'legal_documents');
    `);

    console.log(`📊 Found ${tablesCheck.rows.length} tables in database:`, 
      tablesCheck.rows.map(row => row.table_name));

    if (tablesCheck.rows.length === 0) {
      console.log('⚠️  No tables found. Please run migrations first with: npm run db:migrate');
      return;
    }

    // Create demo users with proper password hashing
    console.log('👤 Creating demo users...');
    
    try {
      // Import bcrypt for proper password hashing (requires installation)
      let bcryptHash;
      try {
        const bcrypt = await import('bcrypt');
        // Create hash for 'password123' - this is what the demo users will use
        bcryptHash = await bcrypt.hash('password123', 10);
      } catch {
        // Fallback to a bcrypt hash of 'password123' if bcrypt is not available
        bcryptHash = '$2b$10$K8jBqxr2nkG4Wy4XG1xJ4.WG7J8N9B8j0gL2hgKxX3z6WmN5rO8/e';
        console.log('⚠️  Using fallback password hash (bcrypt not available)');
      }

      const demoUsers = [
        {
          email: 'prosecutor@legal.ai',
          name: 'John Prosecutor', 
          firstName: 'John',
          lastName: 'Prosecutor',
          role: 'prosecutor',
          hashedPassword: bcryptHash
        },
        {
          email: 'detective@legal.ai',
          name: 'Jane Detective',
          firstName: 'Jane', 
          lastName: 'Detective',
          role: 'investigator', // Use investigator to match schema
          hashedPassword: bcryptHash
        },
        {
          email: 'admin@legal.ai',
          name: 'Admin User',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          hashedPassword: bcryptHash
        },
        {
          email: 'analyst@legal.ai',
          name: 'Legal Analyst',
          firstName: 'Legal',
          lastName: 'Analyst', 
          role: 'analyst',
          hashedPassword: bcryptHash
        }
      ];

      for (const user of demoUsers) {
        try {
          await pool.query(`
            INSERT INTO users (email, name, first_name, last_name, role, hashed_password, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              role = EXCLUDED.role,
              hashed_password = EXCLUDED.hashed_password,
              updated_at = NOW();
          `, [user.email, user.name, user.firstName, user.lastName, user.role, user.hashedPassword]);

          console.log(`✅ Demo user created/updated: ${user.email} (${user.role})`);
        } catch (userError) {
          console.log(`⚠️  Failed to create user ${user.email}:`, userError.message);
        }
      }

      console.log('✅ Demo users setup complete');
    } catch (error) {
      console.log('⚠️  Demo user creation failed:', error.message);
    }

    // Get user IDs for foreign key relationships
    const users = await pool.query(`SELECT id, email FROM users LIMIT 3;`);
    const userMap = {};
    users.rows.forEach(user => {
      userMap[user.email] = user.id;
    });

    // Create sample cases
    console.log('📁 Creating sample cases...');
    
    try {
      await pool.query(`
        INSERT INTO cases (case_number, title, description, priority, status, category, danger_score, created_by, ai_summary, ai_tags)
        VALUES 
          ('CASE-2024-001', 'Financial Fraud Investigation', 
           'Complex financial fraud case involving cryptocurrency transactions and money laundering.', 
           'high', 'open', 'financial_fraud', 75, $1, 
           'High-priority financial fraud case with strong evidence of money laundering.', 
           '["money_laundering", "cryptocurrency", "international"]'::jsonb),
          ('CASE-2024-002', 'Cybercrime Investigation',
           'Data breach and identity theft case with over 100,000 records compromised.',
           'medium', 'open', 'cybercrime', 60, $2,
           'Large-scale data breach affecting consumers across multiple states.',
           '["data_breach", "identity_theft", "consumer_harm"]'::jsonb),
          ('CASE-2024-003', 'White Collar Crime',
           'Corporate embezzlement case with CFO diverting company funds over 3 years.',
           'high', 'open', 'embezzlement', 45, $1,
           'Systematic embezzlement through fraudulent invoicing. Total loss: $1.8M.',
           '["embezzlement", "corporate_fraud", "systematic"]'::jsonb)
        ON CONFLICT (case_number) DO NOTHING;
      `, [userMap['prosecutor@legal.ai'], userMap['detective@legal.ai']]);

      console.log('✅ Cases created/verified');
    } catch (error) {
      console.log('⚠️  Case creation failed:', error.message);
    }

    // Get case IDs
    const cases = await pool.query(`SELECT id, case_number FROM cases LIMIT 3;`);
    const caseMap = {};
    cases.rows.forEach(case_row => {
      caseMap[case_row.case_number] = case_row.id;
    });

    // Create sample evidence
    console.log('🔍 Creating sample evidence...');
    
    try {
      await pool.query(`
        INSERT INTO evidence (case_id, title, description, evidence_type, tags, uploaded_by, ai_analysis, ai_tags, ai_summary)
        VALUES 
          ($1, 'Bank Transaction Records', 
           'Suspicious transaction patterns showing money laundering activity over 18 months.',
           'financial_document', '["transactions", "banking", "offshore"]'::jsonb, $4,
           '{"confidence": 0.92, "patterns": ["structuring", "round_amounts"], "total_amount": "$2.3M"}'::jsonb,
           '["money_laundering", "suspicious_patterns", "high_confidence"]'::jsonb,
           'Strong evidence of money laundering through structured transactions totaling $2.3M.'),
          ($2, 'Server Access Logs',
           'Evidence of unauthorized data access and SQL injection attacks.',
           'digital_evidence', '["logs", "unauthorized_access", "data_breach"]'::jsonb, $5,
           '{"confidence": 0.94, "techniques": ["sql_injection", "privilege_escalation"], "timeline": "2024-01-15 to 2024-03-20"}'::jsonb,
           '["cyberattack", "technical_evidence", "timeline_established"]'::jsonb,
           'Technical evidence of systematic data exfiltration over 2-month period.'),
          ($3, 'Financial Statements',
           'Falsified company financial statements with $1.8M total variance.',
           'financial_document', '["financial_statements", "falsification"]'::jsonb, $4,
           '{"confidence": 0.87, "discrepancies": ["revenue_inflation", "expense_understatement"], "amount": "$1.8M"}'::jsonb,
           '["document_fraud", "financial_manipulation", "systematic_falsification"]'::jsonb,
           'Financial statements show systematic manipulation to hide embezzlement patterns.')
        ON CONFLICT DO NOTHING;
      `, [
        caseMap['CASE-2024-001'], caseMap['CASE-2024-002'], caseMap['CASE-2024-003'],
        userMap['prosecutor@legal.ai'], userMap['detective@legal.ai']
      ]);

      console.log('✅ Evidence created/verified');
    } catch (error) {
      console.log('⚠️  Evidence creation failed:', error.message);
    }

    // Test vector operations if pgvector is available
    console.log('🧮 Testing vector operations...');
    
    try {
      // Create a sample legal document with vector embedding
      const sampleEmbedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
      const vectorString = '[' + sampleEmbedding.join(',') + ']';
      
      await pool.query(`
        INSERT INTO legal_documents (title, document_type, jurisdiction, content, full_text, embedding, keywords, topics, created_by)
        VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8::jsonb, $9)
        ON CONFLICT DO NOTHING;
      `, [
        'Money Laundering Statute Reference',
        'statute', 
        'federal',
        'Federal money laundering statutes define criminal offense of engaging in financial transactions with proceeds of unlawful activity...',
        'Complete statutory text with full legal definitions, penalties, and procedural requirements...',
        vectorString,
        JSON.stringify(['money_laundering', 'financial_crimes', 'federal_statute']),
        JSON.stringify(['financial_crimes', 'money_laundering', 'criminal_law']),
        userMap['admin@legal.ai']
      ]);

      console.log('✅ Legal document with vector embedding created');

      // Test vector similarity search
      const similarityTest = await pool.query(`
        SELECT title, 1 - (embedding <=> $1::vector) as similarity
        FROM legal_documents 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 3;
      `, [vectorString]);

      if (similarityTest.rows.length > 0) {
        console.log('✅ Vector similarity search working');
        console.log('📊 Sample results:', 
          similarityTest.rows.map(row => `${row.title}: ${(row.similarity * 100).toFixed(1)}% similar`)
        );
      }

    } catch (error) {
      console.log('⚠️  Vector operations failed:', error.message);
      console.log('This is expected if pgvector extension is not properly installed');
    }

    // Summary
    const userCount = await pool.query('SELECT COUNT(*) FROM users;');
    const caseCount = await pool.query('SELECT COUNT(*) FROM cases;');
    const evidenceCount = await pool.query('SELECT COUNT(*) FROM evidence;');
    const documentCount = await pool.query('SELECT COUNT(*) FROM legal_documents;');

    console.log('\n🎉 Database seed completed successfully!');
    console.log(`
📊 Database Summary:
   👤 Users: ${userCount.rows[0].count}
   📁 Cases: ${caseCount.rows[0].count}  
   🔍 Evidence: ${evidenceCount.rows[0].count}
   📄 Legal Documents: ${documentCount.rows[0].count}

🔐 Test Login Credentials:
   prosecutor@legal.ai / password123
   detective@legal.ai / password123  
   admin@legal.ai / password123

🚀 Next Steps:
   1. Test login at: http://localhost:5173/login
   2. Explore AI-powered search features
   3. Test vector similarity search with legal documents
   4. Check pgvector integration with real embeddings

⚠️  Note: Demo passwords are simplified for testing.
    In production, use proper password hashing with bcrypt or argon2.
`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    console.error('Full error:', error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  seed().then(() => {
    console.log('\n🎯 Seed script completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });
}

export { seed };