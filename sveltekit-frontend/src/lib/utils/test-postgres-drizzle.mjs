// PostgreSQL Database Connection Test with Drizzle ORM
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/lib/db/schema.ts';

console.log('🔍 PostgreSQL + Drizzle ORM Comprehensive Test\n');

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';

async function testDatabaseConnection() {
    console.log('1️⃣ Testing Database Connection...');
    
    try {
        // Create postgres connection
        const queryClient = postgres(DATABASE_URL, {
            max: 1,
            ssl: false,
            prepare: false
        });
        
        // Test raw connection
        const result = await queryClient`SELECT version()`;
        console.log('✅ Connected to PostgreSQL');
        console.log('   Version:', result[0].version);
        
        // Create Drizzle instance
        const db = drizzle(queryClient, { schema });
        console.log('✅ Drizzle ORM initialized\n');
        
        return { queryClient, db };
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

async function testSchema(db) {
    console.log('2️⃣ Testing Schema Operations...');
    
    try {
        // Check if tables exist
        const tables = await db.execute`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        `;
        
        console.log('📊 Existing tables:');
        tables.forEach(t => console.log(`   - ${t.tablename}`));
        
        // Test vector extension
        const extensions = await db.execute`
            SELECT extname FROM pg_extension 
            WHERE extname = 'vector'
        `;
        
        if (extensions.length > 0) {
            console.log('✅ Vector extension installed');
        } else {
            console.log('⚠️  Vector extension not found - installing...');
            await db.execute`CREATE EXTENSION IF NOT EXISTS vector`;
            console.log('✅ Vector extension installed');
        }
        
        console.log('');
    } catch (error) {
        console.error('❌ Schema test failed:', error.message);
    }
}

async function testCRUDOperations(db) {
    console.log('3️⃣ Testing CRUD Operations...');
    
    try {
        // Test INSERT
        const testCase = {
            case_number: `TEST-${Date.now()}`,
            title: 'Test Legal Case',
            status: 'active',
            prosecutor: 'Test Attorney',
            defendant: 'Test Corp'
        };
        
        const insertResult = await db.execute`
            INSERT INTO legal_cases (case_number, title, status, prosecutor, defendant)
            VALUES (${testCase.case_number}, ${testCase.title}, ${testCase.status}, 
                    ${testCase.prosecutor}, ${testCase.defendant})
            RETURNING *
        `;
        
        if (insertResult.length > 0) {
            console.log('✅ INSERT successful');
            const caseId = insertResult[0].id;
            
            // Test SELECT
            const selectResult = await db.execute`
                SELECT * FROM legal_cases WHERE id = ${caseId}
            `;
            console.log('✅ SELECT successful');
            
            // Test UPDATE
            await db.execute`
                UPDATE legal_cases 
                SET status = 'completed' 
                WHERE id = ${caseId}
            `;
            console.log('✅ UPDATE successful');
            
            // Test DELETE
            await db.execute`
                DELETE FROM legal_cases WHERE id = ${caseId}
            `;
            console.log('✅ DELETE successful');
        }
        
        console.log('');
    } catch (error) {
        console.error('❌ CRUD test failed:', error.message);
    }
}

async function testVectorOperations(db) {
    console.log('4️⃣ Testing Vector Operations...');
    
    try {
        // Create test embedding
        const embedding = new Array(768).fill(0).map(() => Math.random());
        const embeddingStr = `[${embedding.join(',')}]`;
        
        // Test vector storage
        const result = await db.execute`
            INSERT INTO legal_documents (title, content, embedding)
            VALUES ('Test Document', 'Test content for vector operations', ${embeddingStr}::vector)
            RETURNING id
        `;
        
        if (result.length > 0) {
            console.log('✅ Vector storage successful');
            const docId = result[0].id;
            
            // Test similarity search
            const searchResults = await db.execute`
                SELECT title, 
                       embedding <=> ${embeddingStr}::vector as distance
                FROM legal_documents
                WHERE id = ${docId}
            `;
            
            console.log('✅ Vector similarity search successful');
            console.log(`   Distance: ${searchResults[0].distance}`);
            
            // Cleanup
            await db.execute`DELETE FROM legal_documents WHERE id = ${docId}`;
        }
        
        console.log('');
    } catch (error) {
        console.error('❌ Vector operations failed:', error.message);
        console.log('   Attempting to create table if missing...');
        
        try {
            await db.execute`
                CREATE TABLE IF NOT EXISTS legal_documents (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    title VARCHAR(500) NOT NULL,
                    content TEXT,
                    embedding vector(768),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            console.log('✅ Table created successfully');
        } catch (createError) {
            console.error('❌ Table creation failed:', createError.message);
        }
    }
}

async function testPerformance(db) {
    console.log('5️⃣ Testing Performance...');
    
    try {
        const startTime = Date.now();
        
        // Batch insert test
        const batchSize = 100;
        const values = [];
        for (let i = 0; i < batchSize; i++) {
            values.push({
                case_number: `PERF-${Date.now()}-${i}`,
                title: `Performance Test Case ${i}`,
                status: 'active'
            });
        }
        
        // Use transaction for batch insert
        await db.execute`BEGIN`;
        
        for (const val of values) {
            await db.execute`
                INSERT INTO legal_cases (case_number, title, status)
                VALUES (${val.case_number}, ${val.title}, ${val.status})
            `;
        }
        
        await db.execute`COMMIT`;
        
        const insertTime = Date.now() - startTime;
        console.log(`✅ Batch insert (${batchSize} records): ${insertTime}ms`);
        
        // Query performance test
        const queryStart = Date.now();
        await db.execute`
            SELECT COUNT(*) as count FROM legal_cases WHERE status = 'active'
        `;
        const queryTime = Date.now() - queryStart;
        console.log(`✅ Query performance: ${queryTime}ms`);
        
        // Cleanup
        await db.execute`
            DELETE FROM legal_cases WHERE case_number LIKE 'PERF-%'
        `;
        
        console.log('');
    } catch (error) {
        console.error('❌ Performance test failed:', error.message);
    }
}

async function runAllTests() {
    console.log('═'.repeat(50));
    console.log('PostgreSQL + Drizzle ORM Test Suite');
    console.log('═'.repeat(50) + '\n');
    
    const { queryClient, db } = await testDatabaseConnection();
    
    await testSchema(db);
    await testCRUDOperations(db);
    await testVectorOperations(db);
    await testPerformance(db);
    
    console.log('📊 Test Summary');
    console.log('═'.repeat(50));
    console.log('✅ All tests completed');
    console.log('\n🔗 Connection Details:');
    console.log('   Host: localhost');
    console.log('   Port: 5432');
    console.log('   Database: legal_ai_db');
    console.log('   User: legal_admin');
    
    // Close connection
    await queryClient.end();
    console.log('\n✅ Connection closed');
    process.exit(0);
}

// Run tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
