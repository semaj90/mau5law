#!/usr/bin/env node

/**
 * Test Login Session and Dashboard Navigation
 * Tests that login works, user has session, routes to dashboard with user info
 */

import http from 'http';
import https from 'https';

const SERVER_URL = 'http://localhost:5175';

// Test credentials
const TEST_USER = {
  email: 'admin@legal-ai.local',
  password: 'admin123'
};

console.log('🧪 Testing Login Session Functionality...\n');

async function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Test-Client/1.0',
        ...(cookies && { 'Cookie': cookies })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

function formatFormData(obj) {
  return Object.keys(obj)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
    .join('&');
}

async function test1_CheckLoginPage() {
  console.log('1️⃣ Testing login page access...');
  
  try {
    const response = await makeRequest('GET', '/auth/login');
    
    if (response.statusCode === 200) {
      console.log('   ✅ Login page accessible');
      console.log('   ✅ Status:', response.statusCode);
      
      // Check if page contains login form
      if (response.body.includes('Sign In') && response.body.includes('name="email"')) {
        console.log('   ✅ Login form found');
        return true;
      } else {
        console.log('   ❌ Login form not found');
        return false;
      }
    } else {
      console.log('   ❌ Login page not accessible, status:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error accessing login page:', error.message);
    return false;
  }
}

async function test2_TestLogin() {
  console.log('\n2️⃣ Testing login functionality...');
  
  try {
    const loginData = formatFormData({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    const response = await makeRequest('POST', '/auth/login?/login', loginData);
    
    console.log('   📊 Login response status:', response.statusCode);
    
    // Check for redirect (successful login)
    if (response.statusCode === 302 || response.statusCode === 303) {
      const location = response.headers.location;
      console.log('   ✅ Login redirect to:', location);
      
      // Check if session cookie was set
      const sessionCookie = response.cookies.find(cookie => cookie.includes('session_id'));
      if (sessionCookie) {
        console.log('   ✅ Session cookie set');
        console.log('   📝 Cookie:', sessionCookie.split(';')[0]);
        return { success: true, sessionCookie, redirectLocation: location };
      } else {
        console.log('   ❌ No session cookie found');
        return { success: false };
      }
    } else if (response.statusCode === 400) {
      console.log('   ❌ Login failed - invalid credentials or form error');
      console.log('   📄 Response body:', response.body.substring(0, 200));
      return { success: false };
    } else {
      console.log('   ❌ Unexpected login response status:', response.statusCode);
      console.log('   📄 Response body:', response.body.substring(0, 200));
      return { success: false };
    }
  } catch (error) {
    console.log('   ❌ Error during login:', error.message);
    return { success: false };
  }
}

async function test3_TestDashboardAccess(sessionCookie) {
  console.log('\n3️⃣ Testing dashboard access with session...');
  
  try {
    const response = await makeRequest('GET', '/yorha/dashboard', null, sessionCookie);
    
    console.log('   📊 Dashboard response status:', response.statusCode);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Dashboard accessible with session');
      
      // Check if dashboard contains expected content
      if (response.body.includes('SYSTEM DASHBOARD') || response.body.includes('dashboard')) {
        console.log('   ✅ Dashboard content found');
        
        // Look for user-related content or navigation
        if (response.body.includes('user') || response.body.includes('logout') || response.body.includes('profile')) {
          console.log('   ✅ User navigation/content found');
        } else {
          console.log('   ⚠️  No obvious user navigation found (might be in JS)');
        }
        
        return true;
      } else {
        console.log('   ❌ Dashboard content not found');
        return false;
      }
    } else if (response.statusCode === 302 || response.statusCode === 303) {
      const location = response.headers.location;
      console.log('   ❌ Dashboard redirected to:', location);
      if (location.includes('/auth/login') || location.includes('/login')) {
        console.log('   ❌ Session appears invalid - redirected to login');
      }
      return false;
    } else {
      console.log('   ❌ Dashboard not accessible, status:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error accessing dashboard:', error.message);
    return false;
  }
}

async function test4_TestSessionPersistence(sessionCookie) {
  console.log('\n4️⃣ Testing session persistence...');
  
  try {
    // Make multiple requests to verify session is maintained
    const paths = ['/yorha/dashboard', '/yorha', '/dashboard'];
    let sessionValid = true;
    
    for (const path of paths) {
      const response = await makeRequest('GET', path, null, sessionCookie);
      console.log(`   📊 ${path} status: ${response.statusCode}`);
      
      if (response.statusCode === 302 || response.statusCode === 303) {
        const location = response.headers.location;
        if (location.includes('/auth/login') || location.includes('/login')) {
          console.log(`   ❌ Session lost - redirected to login from ${path}`);
          sessionValid = false;
          break;
        }
      } else if (response.statusCode !== 200) {
        console.log(`   ⚠️  Unexpected status for ${path}: ${response.statusCode}`);
      }
    }
    
    if (sessionValid) {
      console.log('   ✅ Session persisted across multiple requests');
    }
    
    return sessionValid;
  } catch (error) {
    console.log('   ❌ Error testing session persistence:', error.message);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log(`🚀 Starting tests against ${SERVER_URL}\n`);
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  let serverReady = false;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (!serverReady && attempts < maxAttempts) {
    try {
      const response = await makeRequest('GET', '/');
      if (response.statusCode === 200 || response.statusCode === 404) {
        serverReady = true;
        console.log('   ✅ Server is ready\n');
      }
    } catch (error) {
      attempts++;
      console.log(`   ⏳ Attempt ${attempts}/${maxAttempts} - waiting for server...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!serverReady) {
    console.log('❌ Server not ready after 60 seconds. Please check if dev server is running on port 5175.\n');
    process.exit(1);
  }
  
  // Run the test suite
  const results = {};
  
  results.loginPage = await test1_CheckLoginPage();
  
  if (results.loginPage) {
    const loginResult = await test2_TestLogin();
    results.login = loginResult.success;
    
    if (results.login) {
      results.dashboard = await test3_TestDashboardAccess(loginResult.sessionCookie);
      results.sessionPersistence = await test4_TestSessionPersistence(loginResult.sessionCookie);
    }
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Login Page Access:    ${results.loginPage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Login Functionality:  ${results.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Dashboard Access:     ${results.dashboard ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Persistence:  ${results.sessionPersistence ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🏁 Overall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! Login and session functionality is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});