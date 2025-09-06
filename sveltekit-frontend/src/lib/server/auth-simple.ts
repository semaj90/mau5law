/**
 * Simple Authentication Service for Demo
 * Direct PostgreSQL queries to avoid schema mismatches
 */

import { Argon2id } from "oslo/password";
import pkg from 'pg';
const { Client } = pkg;
import { lucia } from './auth';

// Simple user type for authentication
export interface SimpleUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
}

export class SimpleAuthService {
  private argon2id = new Argon2id();

  /**
   * Get database client
   */
  private async getClient() {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'legal_ai_db',
      user: 'legal_admin',
      password: '123456'
    });
    await client.connect();
    return client;
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<SimpleUser> {
    const client = await this.getClient();
    
    try {
      // Query only the columns that exist in the actual database
      const result = await client.query(`
        SELECT id, email, hashed_password, first_name, last_name, role, is_active
        FROM users 
        WHERE email = $1 AND is_active = true
      `, [email]);

      if (result.rows.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = result.rows[0];

      if (!user.hashed_password) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const validPassword = await this.argon2id.verify(user.hashed_password, password);
      
      if (!validPassword) {
        throw new Error("Invalid email or password");
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active
      };

    } finally {
      await client.end();
    }
  }

  /**
   * Create session for user
   */
  async createSession(userId: string) {
    const session = await lucia.createSession(userId, {});
    return session;
  }

  /**
   * Demo user authentication (shortcut)
   */
  async authenticateDemoUser(): Promise<SimpleUser> {
    return await this.login('demo@legalai.gov', 'demo123456');
  }
}

export const simpleAuthService = new SimpleAuthService();