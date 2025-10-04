import type { PageServerLoad } from './$types.js';
import fs from 'fs';
import path from 'path';

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
    { name: 'Ollama', port: 11434, path: '/api/tags' },
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
    { path: '/api/canvas', icon: '🎨', description: 'Canvas API' },
    { path: '/api/modules', icon: '🧩', description: 'Modules API' },
    { path: '/api/updates', icon: '🔄', description: 'Updates API' },
  ];

  // Simple route scanner to detect file-based routes and conflicts
  const scanRoot = path.join(process.cwd(), 'sveltekit-frontend', 'src', 'routes');
  const normalize = (p: string) =>
    p
      .replace(scanRoot, '')
      .replace(/\\/g, '/')
      .replace(/\/\+page\.svelte$|\/\+layout\.svelte$|\/index\.svelte$|\.svelte$/i, '')
      .replace(/\/+$/, '') || '/';

  const routeFiles: string[] = [];
  try {
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
        if (name.name.startsWith('.')) continue;
        const full = path.join(dir, name.name);
        if (name.isDirectory()) walk(full);
        else if (name.isFile() && full.endsWith('.svelte')) routeFiles.push(full);
      }
    };
    if (fs.existsSync(scanRoot)) walk(scanRoot);
  } catch (err) {
    // ignore scan errors; we'll still return health data
  }

  const routeMap = new Map<string, string[]>();
  for (const f of routeFiles) {
    const id = normalize(f);
    const arr = routeMap.get(id) || [];
    arr.push(f);
    routeMap.set(id, arr);
  }

  const conflicts: { routeId: string; files: string[] }[] = [];
  for (const [id, files] of routeMap.entries()) {
    if (files.length > 1) conflicts.push({ routeId: id, files });
  }

  // Simple layout recommendation based on scanned routes
  const counts = { total: routeFiles.length, api: 0, ui: 0, groups: {} as Record<string, number> };
  for (const [id] of routeMap.entries()) {
    if (id.startsWith('/api')) counts.api++;
    else counts.ui++;
    const parts = id.split('/').filter(Boolean);
    const top = parts[0] || '/';
    counts.groups[top] = (counts.groups[top] || 0) + 1;
  }

  const recommendedRouteLayout = {
    dashboardPath,
    note: isLoggedIn
      ? 'User logged in — recommend linking dashboard to user activities at /dashboard/activities.'
      : 'Public view — system dashboard at /dashboard.',
    conflicts,
    counts,
    suggestions: [
      conflicts.length ? 'Resolve duplicate route files (see conflicts) to avoid SvelteKit route ambiguity.' : null,
      counts.api > 0 ? 'Keep /api routes as file-based server endpoints under /src/routes/api.' : null,
      'Use nested dashboards for user-specific flows, e.g. /dashboard/activities, /dashboard/settings.',
      'Group feature pages under top-level namespaces (ai, yorha, admin) to keep routes organized.',
    ].filter(Boolean),
  };

  // Service health summary
  const healthyServices = serviceStatus.filter(
    result => result.status === 'fulfilled' && ['healthy', 'no-http'].includes((result as any).value?.status)
  ).length;

  return {
    availableRoutes: realRoutes,
    routeInventory: {
      fileRoutesSample: realRoutes.map(r => r.path),
      counts: {
        config: realRoutes.length,
        fileBased: realRoutes.length,
        api: realRoutes.filter(r => r.path.startsWith('/api')).length,
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
      services: serviceStatus.map(result =>
        (result as any).status === 'fulfilled'
          ? (result as any).value
          : { name: 'Unknown', status: 'error', error: (result as any).reason }
      ),
      performance: {
        cpu_usage: Math.round(process.cpuUsage().user / 1000000),
        memory_usage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        disk_usage: 45, // Mock value
      },
    },
    recommendedRouteLayout,
  };
};
