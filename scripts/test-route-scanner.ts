import fs from 'fs';
import path from 'path';

const ROUTES_DIR = 'sveltekit-frontend/src/routes';

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
    if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        return [];
    }
    const list = fs.readdirSync(dir);

    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(scanRoutes(fullPath, baseDir));
        } else {
            const relativePath = path.relative(baseDir, fullPath);
            const pathParts = relativePath.split(path.sep);
            const fileName = pathParts.pop() || '';

            let type: RouteInfo['type'] | null = null;
            if (fileName === '+page.svelte') type = 'PAGE';
            else if (fileName === '+server.ts') type = 'API';
            else if (fileName === '+layout.svelte') type = 'LAYOUT';
            else if (fileName === '+error.svelte') type = 'ERROR';

            if (type) {
                let urlPath = '/' + pathParts
                    .filter(p => !p.startsWith('(') && !p.endsWith(')'))
                    .join('/');

                urlPath = urlPath.replace(/\/+/g, '/');
                if (urlPath.length > 1 && urlPath.endsWith('/')) {
                    urlPath = urlPath.slice(0, -1);
                }

                const group = pathParts.find(p => p.startsWith('(') && p.endsWith(')'));
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

const routes = scanRoutes(path.resolve(ROUTES_DIR));
console.log(`Found ${routes.length} routes.`);
console.log('--- Sample Routes ---');
routes.slice(0, 5).forEach(r => console.log(`${r.type}: ${r.path} (${r.file})`));
console.log('--- Stats ---');
console.log(`Pages: ${routes.filter(r => r.type === 'PAGE').length}`);
console.log(`APIs: ${routes.filter(r => r.type === 'API').length}`);
console.log(`Layouts: ${routes.filter(r => r.type === 'LAYOUT').length}`);
