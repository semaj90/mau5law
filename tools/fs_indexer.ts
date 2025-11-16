#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { db } from '../sveltekit-frontend/src/lib/server/db/index.js';
import { webPages, webEmbeddings } from '../sveltekit-frontend/src/lib/server/db/schema-web.js';
import { generateEmbedding } from '../sveltekit-frontend/src/lib/server/ai/embeddings.js';
import crypto from 'crypto';

const SUPPORTED_EXTENSIONS = [
  '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.svelte',
  '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.json', '.xml', '.yaml', '.yml', '.toml',
  '.html', '.css', '.scss', '.less'
];

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext) || !ext; // Include files without extension
}

function shouldIgnore(filePath: string): boolean {
  const basename = path.basename(filePath);
  const dirname = path.dirname(filePath);

  // Skip common ignore patterns
  const ignorePatterns = [
    /^\./, // Hidden files
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.next/,
    /__pycache__/,
    /\.DS_Store/,
    /Thumbs\.db/,
    /package-lock\.json/,
    /yarn\.lock/,
    /\.log$/,
    /\.tmp$/,
    /\.cache/
  ];

  return ignorePatterns.some(pattern =>
    pattern.test(basename) || pattern.test(dirname)
  );
}

async function readFileContent(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, 'utf-8');
}

async function indexFile(filePath: string, root: string, source: string = 'file') {
  if (!isTextFile(filePath) || shouldIgnore(filePath)) {
    return;
  }

  console.log(`Indexing: ${filePath}`);

  try {
    const content = await readFileContent(filePath);
    const relativePath = path.relative(root, filePath);
    const url = `file://${filePath.replace(/\\/g, '/')}`;
    const title = relativePath;

    // Generate ID
    const id = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);

    // Generate embedding
    const embedding = await generateEmbedding(content, {});

    // Count tokens (rough estimate)
    const tokenCount = Math.ceil(content.length / 4);

    // Store in database
    await db.insert(webPages).values({
      id,
      url,
      title,
      content,
      source
    }).onConflictDoUpdate({
      target: webPages.id,
      set: {
        title,
        content,
        source
      }
    });

    await db.insert(webEmbeddings).values({
      id,
      url,
      embedding,
      tokenCount
    }).onConflictDoUpdate({
      target: webEmbeddings.id,
      set: {
        embedding,
        tokenCount
      }
    });

    console.log(`✓ Indexed: ${title} (${content.length} chars, ${tokenCount} tokens)`);

  } catch (error) {
    console.error(`✗ Failed to index ${filePath}:`, error.message);
  }
}

async function walkDirectory(dir: string, root: string, source: string): Promise<void> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, root, source);
    } else if (entry.isFile()) {
      await indexFile(fullPath, root, source);
    }
  }
}

async function main() {
  const root = process.argv[2];

  if (!root) {
    console.error('Usage: tsx fs_indexer.ts <root_directory>');
    process.exit(1);
  }

  const resolvedRoot = path.resolve(root);

  if (!fs.existsSync(resolvedRoot)) {
    console.error(`Directory does not exist: ${resolvedRoot}`);
    process.exit(1);
  }

  const stat = await fs.promises.stat(resolvedRoot);
  if (!stat.isDirectory()) {
    console.error(`Path is not a directory: ${resolvedRoot}`);
    process.exit(1);
  }

  console.log(`Starting filesystem indexer for: ${resolvedRoot}`);

  await walkDirectory(resolvedRoot, resolvedRoot, 'file');

  console.log('Filesystem indexing complete!');
  process.exit(0);
}

main().catch(console.error);