import fetch from 'node-fetch';

async function testLogin() {
    const baseURL = 'http://localhost:5181';
    
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
        
        console.log('🔧 Testing login POST...');
        const loginResponse = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                email: 'admin@legal-ai.local',
                password: 'admin123'
            })
        });
        
        console.log(`📤 Login response: ${loginResponse.status}`);
        console.log('🍪 Response headers:', Object.fromEntries(loginResponse.headers.entries()));
        
        if (loginResponse.status !== 200 && loginResponse.status !== 302) {
            const errorText = await loginResponse.text();
            console.log('❌ Login Error Details:', errorText.slice(0, 500));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLogin();