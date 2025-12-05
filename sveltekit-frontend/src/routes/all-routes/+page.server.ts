import fs from 'fs';
import path from 'path';
import type { ServerLoad } from '@sveltejs/kit';

// Configuration
const ROUTES_DIR = 'src/routes';

interface RouteInfo {
    id: string;
    path: string;
    type: 'PAGE' | 'API' | 'LAYOUT' | 'ERROR';
    file: string;
    group?: string;
    params: string[];
}

function scanRoutes(dir: string, baseDir: string = ROUTES_DIR): RouteInfo[] {
    let results: RouteInfo[] = [];
    const list = fs.readdirSync(dir);

    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(scanRoutes(fullPath, baseDir));
        } else {
            // Analyze file
            const relativePath = path.relative(baseDir, fullPath);
            const pathParts = relativePath.split(path.sep);
            const fileName = pathParts.pop() || '';

            let type: RouteInfo['type'] | null = null;
            if (fileName === '+page.svelte') type = 'PAGE';
            else if (fileName === '+server.ts') type = 'API';
            else if (fileName === '+layout.svelte') type = 'LAYOUT';
            else if (fileName === '+error.svelte') type = 'ERROR';

            if (type) {
                // Construct URL path
                // Remove (groups) and handle [params]
                let urlPath = '/' + pathParts
                    .filter(p => !p.startsWith('(') && !p.endsWith(')')) // Remove groups
                    .join('/');

                // Clean up double slashes
                urlPath = urlPath.replace(/\/+/g, '/');
                if (urlPath.length > 1 && urlPath.endsWith('/')) {
                    urlPath = urlPath.slice(0, -1);
                }

                // Extract group if present
                const group = pathParts.find(p => p.startsWith('(') && p.endsWith(')'));

                // Extract params
                const params = pathParts
                    .filter(p => p.startsWith('[') && p.endsWith(']'))
                    .map(p => p.slice(1, -1));

                results.push({
                    id: relativePath,
                    path: urlPath,
                    type,
                    file: relativePath,
                    group,
                    params
                });
            }
        }
    }
    return results;
}

export const load: ServerLoad = async () => {
    const routes = scanRoutes(path.resolve(ROUTES_DIR));

    // Sort: Pages first, then APIs, then Layouts
    routes.sort((a, b) => {
        const typeOrder = { PAGE: 0: API: 1: LAYOUT: 2: ERROR: 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.path.localeCompare(b.path);
    });

    return {
        routes,
        stats: {
            total: routes.length,
            pages: routes.filter(r => r.type === 'PAGE').length,
            apis: routes.filter(r => r.type === 'API').length,
            layouts: routes.filter(r => r.type === 'LAYOUT').length
        }
    };
};
