import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { users, sessions } from '$lib/server/db/schema-postgres';

export const POST: RequestHandler = async () => {
  try {
    console.log('🔄 Setting up database tables...');

    // Create the users table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) UNIQUE NOT NULL,
        "email_verified" timestamp,
        "hashed_password" text,
        "name" text,
        "first_name" varchar(100),
        "last_name" varchar(100),
        "avatar_url" text,
        "role" varchar(50) DEFAULT 'prosecutor' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "settings" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    // Create the sessions table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" text PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        CONSTRAINT "sessions_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
      )
    `);

    // Create indexes for better performance
    await db.execute('CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email")');
    await db.execute('CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role")');
    await db.execute('CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id")');
    await db.execute('CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at")');

    // Insert a test user if none exists
    const existingUsers = await db.execute('SELECT count(*) as count FROM users');
    const userCount = existingUsers[0]?.count || 0;

    if (userCount === 0) {
      console.log('🔄 Creating test user...');
      
      await db.execute(`
        INSERT INTO users (
          email, 
          hashed_password, 
          name, 
          first_name, 
          last_name, 
          role, 
          metadata,
          settings
        ) VALUES (
          'admin@legal-ai.dev', 
          '$2b$10$hash123fake', 
          'Admin User', 
          'Admin', 
          'User', 
          'admin',
          '{"department": "Legal", "jurisdiction": "CA", "practiceAreas": ["corporate", "litigation"], "permissions": ["admin", "read", "write"]}',
          '{"ui": {"sidebarCollapsed": false, "gridDensity": "standard"}, "notifications": {"email": true, "push": true}}'
        )
      `);
      
      console.log('✅ Test user created');
    }

    console.log('✅ Database setup completed successfully');

    return json({
      success: true,
      message: 'Database tables created and configured successfully',
      userCount: userCount
    });

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    return json(
      { 
        success: false, 
        error: 'Database setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};