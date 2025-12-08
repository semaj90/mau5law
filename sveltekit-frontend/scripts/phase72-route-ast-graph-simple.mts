#!/usr/bin/env node
/**
 * Phase 72 – Route AST Graph Builder (Simplified)
 *
 * Fast directory-based route graph without full ts-morph parsing
 *
 * Output:
 *   static/phase72/route-ast-graph.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const ROUTES_DIR = path.join(ROOT, 'src', 'routes');
const OUT_JSON = path.join(ROOT, 'static', 'phase72', 'route-ast-graph.json');

type RouteNode = {
  id: string;
  routePath: string;
  kind: 'page' | 'layout' | 'server' | 'page_server' | 'other';
  filePath: string;
  parentId?: string;
  hasLoad?: boolean;
  hasActions?: boolean;
  imports?: string[];
  importsAi?: boolean;
};

type RouteEdge = {
  from: string;
  to: string;
  kind: 'route_child' | 'import';
};

type RouteGraph = {
  nodes: RouteNode[];
  edges: RouteEdge[];
  metadata: {
    generatedAt: string;
    routeCount: number;
    edgeCount: number;
  };
};

function toPosix(p: string) {
  return p.replace(/\\/g, '/');
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function detectKind(filename: string): 'page' | 'layout' | 'server' | 'page_server' | 'other' {
  if (filename === '+page.svelte') return 'page';
  if (filename === '+layout.svelte') return 'layout';
  if (filename === '+server.ts' || filename === '+server.js') return 'server';
  if (filename === '+page.server.ts' || filename === '+page.server.js') return 'page_server';
  return 'other';
}

function deriveRoutePath(
  fileRel: string
): { routePath: string; id: string; parentId?: string } {
  let parts = fileRel.split(/[/\\]/);
  const filename = parts[parts.length - 1];
  const kind = detectKind(filename);

  if (kind === 'other') {
    return { routePath: '', id: '', parentId: undefined };
  }

  parts = parts.slice(0, -1); // Remove filename
  const dirname = parts.join('/');

  let routePath = '/';
  if (dirname) {
    routePath +=
      dirname
        .split('/')
        .map((p) => {
          if (p.startsWith('[') && p.endsWith(']')) {
            return ':' + p.slice(1, -1);
          }
          if (p.startsWith('(') && p.endsWith(')')) {
            return ''; // Group, invisible in path
          }
          return p;
        })
        .filter(Boolean)
        .join('/') || '';
  }

  const id = `route_${dirname.replace(/[/()\[\]]/g, '_')}`;
  const parentDirParts = parts.slice(0, -1);
  const parentId = parentDirParts.length > 0 ? `route_${parentDirParts.join('_').replace(/[/()\[\]]/g, '_')}` : undefined;

  return { routePath, id, parentId };
}

function hasAiImports(filePath: string, content: string): boolean {
  return /from\s+['"](\$lib\/ai|\.\..*ai)['"]/.test(content);
}

async function analyzeFile(filePath: string): Promise<{ hasLoad: boolean; hasActions: boolean; importsAi: boolean }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const hasLoad = /export\s+(?:const|async\s+function|function)\s+load\s*[=({]/.test(content);
    const hasActions = /export\s+const\s+actions\s*=/.test(content);
    const importsAi = hasAiImports(filePath, content);
    return { hasLoad, hasActions, importsAi };
  } catch {
    return { hasLoad: false, hasActions: false, importsAi: false };
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Phase 72 – Route AST Graph (Fast)                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    const allFiles = await walk(ROUTES_DIR);
    const routeFiles = allFiles.filter((f) => {
      const fname = path.basename(f);
      const kind = detectKind(fname);
      return kind !== 'other';
    });

    console.log(`📄 Found ${routeFiles.length} route files`);

    const nodes: RouteNode[] = [];
    const edges: RouteEdge[] = [];
    const nodeMap = new Map<string, RouteNode>();

    for (const file of routeFiles) {
      const relPath = toPosix(path.relative(ROOT, file));
      const fileRel = toPosix(path.relative(ROUTES_DIR, file));
      const filename = path.basename(file);
      const kind = detectKind(filename);

      const { routePath, id, parentId } = deriveRoutePath(fileRel);

      const { hasLoad, hasActions, importsAi } = await analyzeFile(file);

      const node: RouteNode = {
        id,
        routePath,
        kind,
        filePath: relPath,
      };

      if (parentId) {
        node.parentId = parentId;
        edges.push({
          from: parentId,
          to: id,
          kind: 'route_child',
        });
      }

      if (hasLoad) node.hasLoad = true;
      if (hasActions) node.hasActions = true;
      if (importsAi) node.importsAi = true;

      nodes.push(node);
      nodeMap.set(id, node);
    }

    console.log(`✅ Analyzed ${nodes.length} nodes`);
    console.log(`✅ Created ${edges.length} edges`);

    const graph: RouteGraph = {
      nodes,
      edges,
      metadata: {
        generatedAt: new Date().toISOString(),
        routeCount: nodes.length,
        edgeCount: edges.length,
      },
    };

    // Ensure output directory exists
    await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });

    // Write JSON
    await fs.writeFile(OUT_JSON, JSON.stringify(graph, null, 2));
    console.log(`\n✨ Graph written to: static/phase72/route-ast-graph.json`);
    console.log(`📊 Stats:`);
    console.log(`   - Total routes: ${graph.metadata.routeCount}`);
    console.log(`   - Total edges: ${graph.metadata.edgeCount}`);
    console.log(`   - AI-integrated routes: ${nodes.filter((n) => n.importsAi).length}`);
    console.log(`   - Routes with load: ${nodes.filter((n) => n.hasLoad).length}`);
    console.log(`   - Routes with actions: ${nodes.filter((n) => n.hasActions).length}`);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
