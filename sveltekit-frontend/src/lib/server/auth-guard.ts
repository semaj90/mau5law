import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

/**
 * Enhanced authentication guard for storage operations
 * Supports both session-based and JWT authentication
 */
export async function requireAuthentication(event: RequestEvent): Promise<AuthenticatedUser | null> {
  try {
    // Development mode: Always authenticate with a default dev user
    const isDevelopment = dev || process.env.DEV_MODE === 'true';
    
    if (isDevelopment) {
      // Check if there's a specific dev user override
      const devUserId = event.request.headers.get('x-dev-user-id');
      const devUserEmail = event.request.headers.get('x-dev-user-email');
      
      if (devUserId || devUserEmail) {
        return {
          id: devUserId || 'dev-user-custom',
          email: devUserEmail || 'dev-user@legal-ai.local',
          firstName: 'Dev',
          lastName: 'User',
          role: 'admin'
        };
      }
      
      // Default dev user for all requests in development
      console.log('🔧 Development mode: Using default authenticated user');
      return {
        id: 'dev-user-123',
        email: 'developer@legal-ai.local',
        firstName: 'Development',
        lastName: 'User',
        role: 'admin'
      };
    }

    // Production mode: Strict authentication required
    console.log('🔒 Production mode: Requiring real authentication');

    // Check for session-based authentication first
    const session = await event.locals.auth?.validate();
    if (session?.user) {
      return {
        id: session.user.id || session.user.userId,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role
      };
    }

    // Check for JWT Bearer token
    const authHeader = event.request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const jwtSecret = process.env.JWT_SECRET;
      
      if (jwtSecret) {
        try {
          const decoded = jwt.verify(token, jwtSecret) as any;
          return {
            id: decoded.sub || decoded.userId || decoded.id,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            role: decoded.role
          };
        } catch (jwtError) {
          console.warn('JWT verification failed:', jwtError);
        }
      }
    }

    // Check for API key (fallback for service-to-service)
    const apiKey = process.env.STORAGE_API_KEY || process.env.API_KEY;
    if (apiKey) {
      const headerKey = event.request.headers.get('x-api-key');
      if (headerKey === apiKey) {
        return {
          id: 'system',
          email: 'system@legal-ai.local',
          role: 'system'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return null;
  }
}

/**
 * Check if user owns the resource or has sufficient permissions
 */
export function checkOwnership(
  user: AuthenticatedUser, 
  resourceOwnerId: string, 
  allowedRoles: string[] = ['admin', 'system']
): boolean {
  // User owns the resource
  if (user.id === resourceOwnerId) {
    return true;
  }
  
  // User has privileged role
  if (user.role && allowedRoles.includes(user.role)) {
    return true;
  }
  
  return false;
}

/**
 * Rate limiting for storage operations
 */
export class StorageRateLimit {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  
  static check(userId: string, maxRequests = 100, windowMs = 60000): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (userRequests.count >= maxRequests) {
      return false;
    }
    
    userRequests.count++;
    return true;
  }
}