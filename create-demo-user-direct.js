// create-demo-user-direct.js - Create a demo user directly with Argon2
import { Argon2id } from 'oslo/password';
import postgres from 'postgres';

const sql = postgres('postgresql://postgres:123456@localhost:5432/legal_ai_db');

async function createDemoUser() {
    try {
        console.log('🔧 Creating demo user with Argon2 password...');
        
        // Hash the password using Argon2
        const hashedPassword = await new Argon2id().hash('admin123');
        
        // Generate UUID and insert user
        const result = await sql`
            INSERT INTO users (
                id, 
                email, 
                hashed_password, 
                first_name, 
                last_name, 
                role, 
                is_active,
                email_verified,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'admin@legal-ai.local',
                ${hashedPassword},
                'Admin',
                'User',
                'admin',
                true,
                NOW(),
                NOW(),
                NOW()
            ) 
            ON CONFLICT (email) DO UPDATE SET 
                hashed_password = EXCLUDED.hashed_password,
                updated_at = NOW()
            RETURNING id, email, first_name, last_name
        `;
        
        if (result.length > 0) {
            console.log('✅ Demo user created/updated:', result[0]);
            console.log('📧 Email: admin@legal-ai.local');
            console.log('🔐 Password: admin123');
        }
        
    } catch (error) {
        console.error('❌ Failed to create demo user:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await sql.end();
    }
}

createDemoUser();