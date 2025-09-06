// Admin Layout Load Function
// Handles server-side authentication and authorization for admin routes

import type { LayoutLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { URL } from "url";

export const load: LayoutLoad = async ({ fetch, url, depends }) => {
  depends('app:auth');

  try {
    // Dynamically import AccessControl to avoid static import/type resolution issues
    const rolesModule: any = await import('$lib/auth/roles');
    const AccessControl: any = rolesModule?.AccessControl ?? rolesModule?.default ?? rolesModule;

    // Check current session
    const sessionResponse = await fetch('/api/auth/session', {
      credentials: 'include'
    });

    if (!sessionResponse.ok) {
      throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
    }

    const sessionData = await sessionResponse.json();

    if (!sessionData.user || !sessionData.session) {
      throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
    }

    // Check if user has admin panel access
    const hasAdminAccess = AccessControl?.hasPermission?.(
      sessionData.user.role,
      'access_admin_panel'
    );

    if (!hasAdminAccess) {
      throw redirect(302, '/unauthorized');
    }

    return {
      user: sessionData.user,
      session: sessionData.session,
      permissions: AccessControl?.getRolePermissions?.(sessionData.user.role) ?? []
    };

  } catch (error: any) {
    // Re-throw SvelteKit HTTP/redirect-like errors so the framework can handle them
    if (error && typeof (error as any).status === 'number') {
      throw error;
    }

    console.error('Admin layout load error:', error);
    throw redirect(302, '/login');
  }
};