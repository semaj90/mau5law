// test-lucia-login.js - Test Lucia v3 login functionality
import fetch from 'node-fetch';

async function testLogin() {
    const baseURL = 'http://localhost:5182';
    
    try {
        console.log('🔧 Testing server connectivity...');
        const healthCheck = await fetch(`${baseURL}`);
        console.log(`✅ Server responding: ${healthCheck.status}`);
        
        console.log('🔧 Testing login page...');
        const loginPageResponse = await fetch(`${baseURL}/auth/login`);
        console.log(`📄 Login page: ${loginPageResponse.status}`);
        
        if (loginPageResponse.status === 500) {
            const errorText = await loginPageResponse.text();
            console.log('❌ 500 Error Details:', errorText.slice(0, 500));
            return;
        }
        
        console.log('🔧 Testing login POST with demo credentials...');
        const loginResponse = await fetch(`${baseURL}/auth/login?/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                email: 'admin@legal-ai.local',
                password: 'admin123'
            }),
            redirect: 'manual' // Don't follow redirects so we can see the response
        });
        
        console.log(`📤 Login response: ${loginResponse.status}`);
        console.log('🍪 Set-Cookie headers:', loginResponse.headers.get('set-cookie') || 'None');
        
        if (loginResponse.status === 302) {
            const location = loginResponse.headers.get('location');
            console.log(`✅ Redirect to: ${location}`);
            console.log('🎉 Login successful! Lucia v3 authentication is working!');
        } else if (loginResponse.status === 400) {
            const errorText = await loginResponse.text();
            console.log('❌ Login failed - checking if user needs to be created...');
            console.log('Error:', errorText.slice(0, 200));
        } else {
            const errorText = await loginResponse.text();
            console.log('❌ Unexpected response:', errorText.slice(0, 500));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLogin();