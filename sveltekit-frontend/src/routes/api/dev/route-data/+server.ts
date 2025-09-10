import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get the SvelteKit frontend directory
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const frontendRoot = path.resolve(__dirname, '../../../../../..');

    // Execute the route export script with analytics from the frontend directory
    const command = 'node scripts/export-routes-map.mjs --analytics --format=json';
    const { stdout, stderr } = await execAsync(command, {
      cwd: frontendRoot,
      maxBuffer: 1024 * 1024 * 2 // 2MB buffer for large route data
    });

    if (stderr) {
      console.warn('Route export script warnings:', stderr);
    }

    // Parse the JSON output
    let routeData;
    try {
      routeData = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse route data JSON:', parseError);
      console.log('Raw output:', stdout);
      throw new Error('Invalid JSON response from route export script');
    }

    // Enhance with additional analytics
    const analytics = generateEnhancedAnalytics(routeData);

    return json({
      ...routeData,
      analytics
    });

  } catch (error) {
    console.error('Failed to generate route data:', error);

    return json(
      {
        error: 'Failed to load route data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function generateEnhancedAnalytics(routeData: any) {
  const configRoutes = routeData.data?.configRoutes || [];
  const fileRoutes = routeData.data?.fileRoutes || [];

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  configRoutes.forEach((route: any) => {
    statusBreakdown[route.status] = (statusBreakdown[route.status] || 0) + 1;
  });

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  configRoutes.forEach((route: any) => {
    categoryBreakdown[route.category] = (categoryBreakdown[route.category] || 0) + 1;
  });

  // Tag usage analysis
  const tagUsage: Record<string, number> = {};
  configRoutes.forEach((route: any) => {
    if (route.tags) {
      route.tags.forEach((tag: string) => {
        tagUsage[tag] = (tagUsage[tag] || 0) + 1;
      });
    }
  });

  // Complexity metrics
  const dynamicRoutes = fileRoutes.filter((route: any) =>
    route.path?.includes('[') || route.path?.includes('(')
  ).length;

  const apiRoutes = fileRoutes.filter((route: any) =>
    route.path?.includes('/api/') || route.path?.endsWith('+server.ts')
  ).length;

  const staticPages = fileRoutes.filter((route: any) =>
    route.path?.endsWith('+page.svelte')
  ).length;

  // Calculate deepest nesting level
  const deepestNesting = Math.max(
    ...fileRoutes.map((route: any) =>
      (route.path?.split('/') || []).length - 1
    ),
    0
  );

  // Generate recommendations
  const recommendations: string[] = [];

  // Check for potential issues
  const deprecatedCount = statusBreakdown['deprecated'] || 0;
  if (deprecatedCount > 0) {
    recommendations.push(`Consider migrating ${deprecatedCount} deprecated route${deprecatedCount > 1 ? 's' : ''}`);
  }

  const experimentalCount = statusBreakdown['experimental'] || 0;
  if (experimentalCount > 5) {
    recommendations.push(`High number of experimental routes (${experimentalCount}) - consider stabilizing or removing unused ones`);
  }

  if (deepestNesting > 6) {
    recommendations.push(`Deep route nesting detected (${deepestNesting} levels) - consider flattening structure for better performance`);
  }

  const totalRoutes = configRoutes.length;
  if (totalRoutes > 100) {
    recommendations.push('Large number of routes - consider implementing route grouping and lazy loading');
  }

  // Check for missing configurations
  const missingConfig = routeData.counts?.issues?.filesMissingConfig || 0;
  if (missingConfig > 0) {
    recommendations.push(`${missingConfig} file route${missingConfig > 1 ? 's' : ''} missing configuration - add to routes-config.ts for better organization`);
  }

  const missingFiles = routeData.counts?.issues?.configMissingFiles || 0;
  if (missingFiles > 0) {
    recommendations.push(`${missingFiles} configured route${missingFiles > 1 ? 's' : ''} missing implementation files`);
  }

  // Performance recommendations
  if (apiRoutes > 20) {
    recommendations.push('Consider implementing API route caching and rate limiting for better performance');
  }

  return {
    statusBreakdown,
    categoryBreakdown,
    tagUsage,
    complexityMetrics: {
      dynamicRoutes,
      apiRoutes,
      staticPages,
      deepestNesting,
      totalConfiguredRoutes: totalRoutes,
      totalFileRoutes: fileRoutes.length
    },
    recommendations,
    lastUpdated: new Date().toISOString()
  };
}
