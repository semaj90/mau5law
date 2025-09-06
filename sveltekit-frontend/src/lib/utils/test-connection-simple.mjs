// Simple PostgreSQL Connection Test
import postgres from 'postgres';

console.log('🔍 Testing PostgreSQL Connection...\n');

// Test different connection configurations
const configs = [
    {
        name: 'Config 1: legal_admin with password as string',
        url: 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db'
    },
    {
        name: 'Config 2: legal_admin with connection object',
        config: {
            host: 'localhost',
            port: 5432,
            database: 'legal_ai_db',
            username: 'legal_admin',
            password: '123456'
        }
    },
    {
        name: 'Config 3: postgres user',
        url: 'postgresql://postgres:postgres@localhost:5432/legal_ai_db'
    }
];

async function testConnection(config) {
    console.log(`Testing: ${config.name}`);
    console.log('─'.repeat(40));
    
    let sql;
    try {
        // Create connection
        if (config.url) {
            sql = postgres(config.url, { 
                max: 1,
                ssl: false,
                prepare: false
            });
        } else {
            sql = postgres(config.config);
        }
        
        // Test query
        const result = await sql`SELECT current_user, current_database(), version()`;
        
        console.log('✅ Connection successful!');
        console.log(`   User: ${result[0].current_user}`);
        console.log(`   Database: ${result[0].current_database}`);
        console.log(`   Version: ${result[0].version.split(',')[0]}\n`);
        
        // Close connection
        await sql.end();
        return true;
        
    } catch (error) {
        console.error('❌ Connection failed');
        console.error(`   Error: ${error.message}\n`);
        
        if (sql) {
            try { await sql.end(); } catch {}
        }
        return false;
    }
}

async function runTests() {
    console.log('═'.repeat(50));
    console.log('PostgreSQL Connection Diagnostics');
    console.log('═'.repeat(50) + '\n');
    
    let successCount = 0;
    
    for (const config of configs) {
        const success = await testConnection(config);
        if (success) successCount++;
    }
    
    console.log('═'.repeat(50));
    console.log(`Summary: ${successCount}/${configs.length} connections successful`);
    
    if (successCount === 0) {
        console.log('\n⚠️  All connections failed. Possible issues:');
        console.log('   1. PostgreSQL service not running');
        console.log('   2. Incorrect passwords');
        console.log('   3. Database does not exist');
        console.log('\n📝 To fix:');
        console.log('   1. Check service: Get-Service postgresql*');
        console.log('   2. Reset passwords: Run FIX-POSTGRES-ADMIN.bat as Administrator');
        console.log('   3. Create database: psql -U postgres -c "CREATE DATABASE legal_ai_db"');
    }
}

runTests().catch(console.error);
