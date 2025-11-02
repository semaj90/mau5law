import type { User } from '$lib/types';
import type { Case } from '$lib/types';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  // Detect logged-in user (locals preferred) or session cookie as fallback
  const isLoggedIn = Boolean((locals as { user?: { id: string } })?.user?.id) || Boolean(cookies.get('session'));
  const dashboardPath = isLoggedIn ? '/dashboard/activities' : '/dashboard';

  // Services to check (unchanged)
  const services = [
    { name: 'SvelteKit Frontend', port: 5173, path: '/' },
    { name: 'SvelteKit Frontend (5175)', port: 5175, path: '/' },
    { name: 'SvelteKit Frontend (5176)', port: 5176, path: '/' },
    { name: 'QUIC Service', port: 5178, path: '/' },
    { name: 'Redis', port: 6379, path: '/ping' },
    { name: 'PostgreSQL', port: 5432, path: null }, // No HTTP endpoint
    { name: 'Ollama', port: 11434, path: '/api/tags' }
  ];

  // Test which services are actually responding (unchanged)
  const serviceStatus = await Promise.allSettled(
    services.map(async service => {
      if (!service.path) {
        return { ...service, status: 'no-http', responseTime: 0 };
      }

      const startTime = Date.now();
      try {
        const response = await fetch(`http://localhost:${service.port}${service.path}`, {
          signal: AbortSignal.timeout(2000)
        });
        const responseTime = Date.now() - startTime;
        return {
          ...service,
          status: response.ok ? 'healthy' : 'degraded',
          responseTime,
          httpStatus: response.status
        };
      } catch (error) {
        return {
          ...service,
          status: 'down',
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );

  // Build realRoutes and use computed dashboardPath
  const realRoutes = [
    { path: '/', icon: '🏠', description: 'YoRHa Legal AI Platform Home' },
    { path: '/evidence', icon: '📁', description: 'Evidence Manager (Working!)' },
    { path: '/cases', icon: '⚖️', description: 'Case Management' },
    { path: '/chat', icon: '💬', description: 'AI Chat Interface' },
    { path: '/ai-assistant', icon: '🤖', description: 'AI Assistant' },
    { path: dashboardPath, icon: '📊', description: isLoggedIn ? 'Your Activities Dashboard' : 'System Dashboard' },
    { path: '/admin', icon: '👨‍💼', description: 'Admin Panel' },
    { path: '/profile', icon: '👤', description: 'User Profile' },
    { path: '/upload', icon: '📤', description: 'File Upload' },
    { path: '/yorha/detective', icon: '🕵️', description: 'YoRHa Detective Mode' },
    { path: '/gallery', icon: '🖼️', description: 'Gallery' },
    { path: '/graph', icon: '🕸️', description: 'Graph Visualization' },
    { path: '/perf', icon: '⚡', description: 'Performance Monitor' },
    { path: '/spa', icon: '🔄', description: 'SPA Demo' },
    // API Routes
    { path: '/api/auth/login', icon: '🔐', description: 'Authentication API' },
    { path: '/api/evidence/ingest', icon: '📤', description: 'Evidence Ingest API' },
    { path: '/api/case-chat', icon: '💭', description: 'Case Chat API' },
    { path: '/api/reports', icon: '📋', description: 'Reports API' },
    { path: '/api/search/advanced', icon: '🔍', description: 'Advanced Search API' },
    { path: '/api/canvas', icon: '🎨', description: 'Canvas API` },'`
    { path: '/api/modules', icon: '🧩', description: `Modules API` },
    { path: '/api/updates', icon: '🔄', description: `Updates API` }
  ];

  // Simplified route layout recommendation (removed file system scanning)
  const recommendedRouteLayout = {
    dashboardPath,
    note: isLoggedIn
      ? 'User logged in — recommend linking dashboard to user activities at /dashboard/activities.'
      : 'Public view — system dashboard at /dashboard.',
    conflicts: [], // No file-based conflicts detected without fs access
    counts: {
      total: realRoutes.length,
      api: realRoutes.filter(r => r.path.startsWith('/api')).length,
      ui: realRoutes.filter(r => !r.path.startsWith('/api')).length,
      groups: {}
    },
    suggestions: [
      'Use nested dashboards for user-specific flows, e.g. /dashboard/activities, /dashboard/settings.',
      'Group feature pages under top-level namespaces (ai, yorha, admin) to keep routes organized.',
    ].filter(Boolean)
  };

  // Service health summary
  const healthyServices = serviceStatus.filter(
    result => result.status === 'fulfilled' && ['healthy', 'no-http'].includes(result.value.status)
  ).length;

  return {
    availableRoutes: realRoutes,
    routeInventory: {
      fileRoutesSample: realRoutes.map(r => r.path),
      counts: {
        config: realRoutes.length,
        fileBased: 0, // No file-based scanning
        api: realRoutes.filter(r => r.path.startsWith('/api')).length,
        configMissingFiles: 0,
        filesMissingConfig: 0,
        consolidatable: 0
      }
    },
    serviceHealth: { system_overview: {, healthy_services: healthyServices,
        total_services: services.length,
        uptime_hours: Math.floor(process.uptime() / 3600),
        last_updated: new Date().toISOString()
      },
      services: serviceStatus.map(result =>
        result.status === 'fulfilled' ? result.value : { name: 'Unknown', status: 'error', error: result.reason }
      ),
      performance: {
        cpu_usage: Math.round(process.cpuUsage().user / 1000000),
        memory_usage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        disk_usage: 45, // Mock value
      }
    },
    recommendedRouteLayout
  };
};
