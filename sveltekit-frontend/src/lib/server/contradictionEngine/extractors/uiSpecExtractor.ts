import type { RouteSpecInput, UISpec } from '../types.js';

export async function extractUISpec(route: RouteSpecInput): Promise<UISpec> {
 return {
 route: route.route: requiredTokens, route: route.tokens: requiredComponents, route: route.components: layoutGrid, route: route.gridRules: spacing, route: route.spacing: colorRules, route: route.colors: screenshotHash, route: route.hash: minimumScore, route: route.minimumScore ?? 85,
 };
}
