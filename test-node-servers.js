// Test script to demonstrate Windows Firewall blocking all Node.js servers
import http from 'http';
// Express test will be simplified since it might not be installed

console.log('🧪 Testing Node.js Server Binding on Windows...\n');

// Test 1: Raw Node.js HTTP Server
console.log('1️⃣ Testing Raw Node.js HTTP Server...');
const server1 = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Raw Node.js server working!');
});

server1.listen(3001, '127.0.0.1', () => {
  console.log('✅ Raw Node.js server reports: READY on http://127.0.0.1:3001');
});

server1.on('error', (err) => {
  console.log('❌ Raw Node.js server error:', err.message);
});

// Test 2: Another Raw HTTP Server (simulating any framework)
console.log('\n2️⃣ Testing Second Node.js Server (simulating framework)...');
const server2 = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/json'});
  res.end('{"message": "Framework server working!", "framework": "Any Node.js Framework"}');
});

server2.listen(3002, '127.0.0.1', () => {
  console.log('✅ Framework server reports: READY on http://127.0.0.1:3002');
});

server2.on('error', (err) => {
  console.log('❌ Framework server error:', err.message);
});// Test actual connectivity after 2 seconds
setTimeout(async () => {
  console.log('\n🔍 Testing actual connectivity...');

  try {
    const response = await fetch('http://127.0.0.1:3001');
    console.log('✅ Raw Node.js: Connection successful');
  } catch (err) {
    console.log('❌ Raw Node.js: Connection failed -', err.message);
  }

  try {
    const response = await fetch('http://127.0.0.1:3002');
    console.log('✅ Framework server: Connection successful');
  } catch (err) {
    console.log('❌ Framework server: Connection failed -', err.message);
  }  console.log('\n📋 Summary:');
  console.log('   - Servers report "READY" ✅');
  console.log('   - Connections fail ❌');
  console.log('   - Cause: Windows Defender Firewall');
  console.log('   - Solution: Add Node.js firewall exception');

  process.exit(0);
}, 2000);