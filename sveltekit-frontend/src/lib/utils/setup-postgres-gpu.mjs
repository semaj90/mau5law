// Database Setup Script for PostgreSQL with Drizzle ORM
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';

console.log('🚀 Database Setup Starting...\n');

async function setupDatabase() {
    const sql = postgres(DATABASE_URL, { 
        max: 1,
        ssl: false
    });
    
    const db = drizzle(sql);
    
    try {
        // 1. Create extensions
        console.log('📦 Installing PostgreSQL extensions...');
        await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
        await sql`CREATE EXTENSION IF NOT EXISTS "vector"`;
        console.log('✅ Extensions installed\n');
        
        // 2. Create core tables with GPU support (768-dim embeddings)
        console.log('🏗️ Creating database schema...');
        
        // Legal cases table
        await sql`
            CREATE TABLE IF NOT EXISTS legal_cases (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                case_number VARCHAR(255) UNIQUE NOT NULL,
                title VARCHAR(500) NOT NULL,
                status VARCHAR(100) DEFAULT 'active',
                prosecutor VARCHAR(255),
                defendant VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('   ✓ legal_cases table');
        
        // Legal documents with 768-dim embeddings for GPU
        await sql`
            CREATE TABLE IF NOT EXISTS legal_documents (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                content TEXT,
                case_id VARCHAR(255),
                embedding vector(768),
                metadata JSONB DEFAULT '{}',
                processing_method VARCHAR(50) DEFAULT 'gpu',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('   ✓ legal_documents table (768-dim embeddings)');
        
        // Evidence table
        await sql`
            CREATE TABLE IF NOT EXISTS evidence (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                case_id VARCHAR(255),
                evidence_type VARCHAR(100),
                description TEXT,
                file_path VARCHAR(1000),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('   ✓ evidence table');
        
        // Indexed files for GPU processing
        await sql`
            CREATE TABLE IF NOT EXISTS indexed_files (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                file_path VARCHAR(1000) NOT NULL UNIQUE,
                content TEXT,
                embedding vector(768),
                summary TEXT,
                indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processing_method VARCHAR(50) DEFAULT 'gpu',
                gpu_processing_time_ms INTEGER,
                metadata JSONB DEFAULT '{}'
            )
        `;
        console.log('   ✓ indexed_files table');
        
        // User activities for recommendations
        await sql`
            CREATE TABLE IF NOT EXISTS user_activities (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                session_id VARCHAR(255),
                action VARCHAR(100) NOT NULL,
                query TEXT,
                results JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                feedback VARCHAR(50),
                processing_time_ms INTEGER
            )
        `;
        console.log('   ✓ user_activities table');
        
        // Processing jobs for BullMQ
        await sql`
            CREATE TABLE IF NOT EXISTS processing_jobs (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                job_id VARCHAR(255) UNIQUE NOT NULL,
                job_type VARCHAR(100) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                payload JSONB,
                result JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0
            )
        `;
        console.log('   ✓ processing_jobs table');
        
        // Recommendation models
        await sql`
            CREATE TABLE IF NOT EXISTS recommendation_models (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                model_data BYTEA,
                training_iterations INTEGER DEFAULT 0,
                last_trained TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                performance_metrics JSONB DEFAULT '{}'
            )
        `;
        console.log('   ✓ recommendation_models table\n');
        
        // 3. Create indexes for performance
        console.log('📈 Creating performance indexes...');
        
        await sql`CREATE INDEX IF NOT EXISTS idx_legal_documents_case_id ON legal_documents(case_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_legal_cases_number ON legal_cases(case_number)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_indexed_files_path ON indexed_files(file_path)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_user_activities_user_timestamp ON user_activities(user_id, timestamp DESC)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status, created_at)`;
        
        // Vector similarity index (IVFFlat for performance)
        await sql`CREATE INDEX IF NOT EXISTS idx_legal_documents_embedding ON legal_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_indexed_files_embedding ON indexed_files USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`;
        
        console.log('✅ Indexes created\n');
        
        // 4. Seed sample data
        const seedData = process.argv.includes('--seed');
        if (seedData) {
            console.log('🌱 Seeding sample data...');
            
            // Sample cases
            await sql`
                INSERT INTO legal_cases (case_number, title, prosecutor, defendant, status)
                VALUES 
                    ('CASE-2024-001', 'Contract Dispute - TechCorp vs StartupXYZ', 'Wilson & Associates', 'TechCorp Inc', 'active'),
                    ('CASE-2024-002', 'Employment Law - Remote Work Policy', 'Labor Board', 'StartupXYZ', 'review'),
                    ('CASE-2024-003', 'Intellectual Property - Software Patent', 'Patent Office', 'InnovateLabs', 'pending')
                ON CONFLICT (case_number) DO NOTHING
            `;
            
            // Sample documents with random embeddings
            const embedding = `[${new Array(768).fill(0).map(() => Math.random()).join(',')}]`;
            await sql`
                INSERT INTO legal_documents (title, content, case_id, embedding)
                VALUES 
                    ('Software License Agreement', 'This agreement governs the use of proprietary software...', 'CASE-2024-001', ${embedding}::vector),
                    ('Employee Handbook 2024', 'Comprehensive policies for remote work and employment...', 'CASE-2024-002', ${embedding}::vector),
                    ('Patent Application #12345', 'Novel method for distributed computing optimization...', 'CASE-2024-003', ${embedding}::vector)
                ON CONFLICT DO NOTHING
            `;
            
            console.log('✅ Sample data inserted\n');
        }
        
        // 5. Verify setup
        console.log('🔍 Verifying database setup...');
        
        const tableCount = await sql`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        
        const extensionCount = await sql`
            SELECT COUNT(*) as count 
            FROM pg_extension 
            WHERE extname IN ('uuid-ossp', 'vector')
        `;
        
        console.log(`   ✓ ${tableCount[0].count} tables created`);
        console.log(`   ✓ ${extensionCount[0].count} extensions installed`);
        
        // Test vector operations
        const vectorTest = await sql`
            SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector as distance
        `;
        console.log(`   ✓ Vector operations working (test distance: ${vectorTest[0].distance})`);
        
        console.log('\n✅ Database setup complete!\n');
        
        console.log('📊 Connection Details:');
        console.log('   Host: localhost');
        console.log('   Port: 5432');
        console.log('   Database: legal_ai_db');
        console.log('   User: legal_admin');
        console.log('   Password: 123456');
        console.log('\n🚀 Ready for GPU-accelerated legal processing!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        if (error.code === '28P01') {
            console.error('\n⚠️  Authentication failed. Please run:');
            console.error('   FIX-POSTGRES-ADMIN.bat (as Administrator)');
        }
        process.exit(1);
    } finally {
        await sql.end();
    }
}

// Run setup
setupDatabase().catch(console.error);
