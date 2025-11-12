// test-minimal.mjs
import postgres from 'postgres';
console.log('✅ Postgres import works');

import pino from 'pino';
console.log('✅ Pino import works');

import { createClient } from 'redis';
console.log('✅ Redis import works');

console.log('🎉 All imports successful!');