#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:123456@localhost:5432/legal_ai_db' 
});

try {
  const result = await pool.query('SELECT email, name, role FROM users ORDER BY email;');
  console.log('📋 Existing users:');
  result.rows.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role}`);
  });
  await pool.end();
} catch (error) {
  console.error('Error:', error);
}