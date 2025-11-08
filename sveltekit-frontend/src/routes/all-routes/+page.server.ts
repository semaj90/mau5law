import type { ServerLoad } from '@sveltejs/kit';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface RouteDefinition {
  path: string;
  icon?: string;
  description?: string;
  type: 'page' | 'api';
}

async function discoverRoutes(baseDir: string, rootDir: string): Promise<RouteDefinition[]> {
  const routes: RouteDefinition[] = [];
  try {
    const files = await fs.readdir(baseDir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(baseDir, file.name);
      if (file.isDirectory()) {
        // Recursively discover routes in subdirectories
        routes.push(...(await discoverRoutes(fullPath, rootDir)));
      } else if (file.isFile()) {
        let routePath = '';
        let type: 'page' | 'api' = 'page';
        if (file.name === '+page.svelte') {
          routePath = '/' + path.relative(rootDir, baseDir).replace(/\\/g, '/');
          if (routePath === '/.') routePath = '/'; // Handle root route
          type = 'page';
        } else if (file.name === '+server.ts') {
          routePath = '/' + path.relative(rootDir, baseDir).replace(/\\/g, '/');
          if (routePath === '/.') routePath = '/'; // Handle root API route
          type = 'api';
        }

        if (routePath) {
          // Clean up dynamic segments like [id]
          routePath = routePath.replace(/\[([^\]]+)\]/g, (match, p1) => `:${p1}`);
          routes.push({
            path: routePath,
            icon: type === 'page' ? '📄' : '🔌',
            description: `Auto-discovered ${type} route`,
            type: type,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${baseDir}:`, error);
  }
  return routes;
}

export const load: ServerLoad = async ({ locals, cookies }) => {
  try {
    // Detect logged-in user (locals preferred) or session cookie as fallback
    const isLoggedIn = Boolean(locals.user) || Boolean(cookies.get('session'));
    const dashboardPath = isLoggedIn ? '/dashboard/activities' : '/dashboard';

    // Services to check (unchanged)
    const services = [
      { name: 'SvelteKit Frontend', port: 5173, path: '/' },
      { name: 'SvelteKit Frontend (5175)', port: 5175, path: '/' },
      { name: 'SvelteKit Frontend (5176)', port: 5176, path: '/' },
      { name: 'QUIC Service', port: 5178, path: '/' },
      { name: 'Redis', port: 6379, path: '/ping' },
      { name: 'PostgreSQL', port: 5432, path: null }, // No HTTP endpoint
      { name: 'Ollama', port: 11434, path: '/api/tags' },
    ];

    // Test which services are actually responding (unchanged)
    const serviceStatus = await Promise.allSettled(
      services.map(async (service) => {
        if (!service.path) {
          return { ...service, status: 'no-http', responseTime: 0 };
        }
        const startTime = Date.now();
        try {
          const response = await fetch(`http://localhost:${service.port}${service.path}`, {
            signal: AbortSignal.timeout(2000),
          });
          const responseTime = Date.now() - startTime;
          return {
            ...service,
            status: response.ok ? 'healthy' : 'degraded',
            responseTime,
            httpStatus: response.status,
          };
        } catch (error) {
          return {
            ...service,
            status: 'down',
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const sveltekitRoutesDir = path.join(process.cwd(), 'src', 'routes');
    const discoveredRoutes = await discoverRoutes(sveltekitRoutesDir, sveltekitRoutesDir);

    // Merge hardcoded routes with discovered routes, prioritizing hardcoded descriptions/icons
    const mergedRoutesMap = new Map<string, RouteDefinition>();

    // Add discovered routes first
    discoveredRoutes.forEach((route) => {
      mergedRoutesMap.set(route.path, route);
    });

    // Override with hardcoded routes for better descriptions/icons
    const hardcodedRoutes: RouteDefinition[] = [
      { path: '/', icon: '🏠', description: 'YoRHa Legal AI Platform Home', type: 'page' },
      { path: '/evidence', icon: '📁', description: 'Evidence Manager (Working!)', type: 'page' },
      { path: '/cases', icon: '⚖️', description: 'Case Management', type: 'page' },
      { path: '/chat', icon: '💬', description: 'AI Chat Interface', type: 'page' },
      { path: '/ai-assistant', icon: '🤖', description: 'AI Assistant', type: 'page' },
      {
        path: dashboardPath,
        icon: '📊',
        description: isLoggedIn ? 'Your Activities Dashboard' : 'System Dashboard',
        type: 'page',
      },
      { path: '/admin', icon: '👨‍💻', description: 'Admin Panel', type: 'page' },
      { path: '/profile', icon: '👤', description: 'User Profile', type: 'page' },
      { path: '/upload', icon: '📤', description: 'File Upload', type: 'page' },
      { path: '/yorha/detective', icon: '🕵️', description: 'YoRHa Detective Mode', type: 'page' },
      { path: '/gallery', icon: '🖼️', description: 'Gallery', type: 'page' },
      { path: '/graph', icon: '🕸️', description: 'Graph Visualization', type: 'page' },
      { path: '/perf', icon: '⚡', description: 'Performance Monitor', type: 'page' },
      { path: '/spa', icon: '🔄', description: 'SPA Demo', type: 'page' },
      // API Routes
      { path: '/api/auth/login', icon: '🔑', description: 'Authentication API', type: 'api' },
      { path: '/api/evidence/ingest', icon: '📥', description: 'Evidence Ingest API', type: 'api' },
      { path: '/api/case-chat', icon: '🗨️', description: 'Case Chat API', type: 'api' },
      { path: '/api/reports', icon: '📄', description: 'Reports API', type: 'api' },
      { path: '/api/search/advanced', icon: '🔍', description: 'Advanced Search API', type: 'api' },
      { path: '/api/canvas', icon: '🎨', description: 'Canvas API', type: 'api' },
      { path: '/api/modules', icon: '🧩', description: 'Modules API', type: 'api' },
      { path: '/api/updates', icon: '🔄', description: 'Updates API', type: 'api' },
    ];

    hardcodedRoutes.forEach((route) => {
      mergedRoutesMap.set(route.path, route);
    });

    const finalRoutes = Array.from(mergedRoutesMap.values()).sort((a, b) =>
      a.path.localeCompare(b.path)
    );

    // Simplified route layout recommendation (removed file system scanning)
    const recommendedRouteLayout = {
      dashboardPath: {
        note: isLoggedIn
          ? 'User logged in — recommend linking dashboard to user activities at /dashboard/activities.'
          : 'Public view — system dashboard at /dashboard.',
      },
      conflicts: [], // No file-based conflicts detected without fs access
      counts: {
        total: finalRoutes.length,
        api: finalRoutes.filter((r) => r.path.startsWith('/api')).length,
        ui: finalRoutes.filter((r) => !r.path.startsWith('/api')).length,
        groups: {},
      },
      suggestions: [
        'Use nested dashboards for user-specific flows, e.g. /dashboard/activities, /dashboard/settings.',
        'Group feature pages under top-level namespaces (ai, yorha, admin) to keep routes organized.',
      ].filter(Boolean),
    };

    // Service health summary
    const healthyServices = serviceStatus.filter(
      (result) =>
        result.status === 'fulfilled' && ['healthy', 'no-http'].includes(result.value.status)
    ).length;

    return {
      availableRoutes: finalRoutes,
      routeInventory: {
        fileRoutesSample: finalRoutes.map((r) => r.path),
        counts: {
          config: finalRoutes.length,
          fileBased: discoveredRoutes.length, // Now reflects actual discovered routes
          api: finalRoutes.filter((r) => r.path.startsWith('/api')).length,
          configMissingFiles: 0,
          filesMissingConfig: 0,
          consolidatable: 0,
        },
      },
      serviceHealth: {
        system_overview: {
          healthy_services: healthyServices,
          total_services: services.length,
          uptime_hours: Math.floor(process.uptime() / 3600),
          last_updated: new Date().toISOString(),
        },
        services: serviceStatus.map((result) =>
          result.status === 'fulfilled'
            ? result.value
            : { name: 'Unknown', status: 'error', error: result.reason }
        ),
        performance: {
          cpu_usage: Math.round(process.cpuUsage().user / 1000000),
          memory_usage: Math.round(
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
          ),
          disk_usage: 45, // Mock value
        },
      },
      recommendedRouteLayout,
    };
  } catch (err) {
    console.error('/all-routes load error:', err);
    return {
      availableRoutes: [],
      routeInventory: {
        fileRoutesSample: [],
        counts: {
          config: 0,
          fileBased: 0,
          api: 0,
          configMissingFiles: 0,
          filesMissingConfig: 0,
          consolidatable: 0,
        },
      },
      serviceHealth: {
        system_overview: {
          healthy_services: 0,
          total_services: 0,
          uptime_hours: 0,
          last_updated: new Date().toISOString(),
        },
        services: [],
        performance: { cpu_usage: 0, memory_usage: 0, disk_usage: 0 },
      },
      recommendedRouteLayout: {
        dashboardPath: { note: 'Error building route layout' },
        conflicts: [],
        counts: {},
        suggestions: [],
      },
      _error: err instanceof Error ? err.message : String(err),
    };
  }
};
