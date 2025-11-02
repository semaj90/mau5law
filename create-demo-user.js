// create-demo-user.js - Create a demo user for testing Lucia v3 authentication
import { authService } from './sveltekit-frontend/src/lib/server/auth.js';

async function createDemoUser() {
    try {
        console.log('🔧 Creating demo user...');
        
        const user = await authService.register({
            email: 'admin@legal-ai.local',
            password: 'admin123',
            firstName: 'Admin',
            lastName: 'User',
            displayName: 'Admin User'
        });
        
        console.log('✅ Demo user created:', user.email);
        console.log('📧 Email: admin@legal-ai.local');
        console.log('🔐 Password: admin123');
        
    } catch (error) {
        if (error.message.includes('User already exists')) {
            console.log('ℹ️ Demo user already exists - you can proceed with testing');
        } else {
            console.error('❌ Failed to create demo user:', error.message);
        }
    }
}

createDemoUser();