#!/usr/bin/env tsx

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { db } from '../../sveltekit-frontend/src/lib/server/db/index.js';
import { webPages, webEmbeddings } from '../../sveltekit-frontend/src/lib/server/db/schema-web.js';
import { generateEmbedding } from '../../sveltekit-frontend/src/lib/server/ai/embeddings.js';
import crypto from 'crypto';

async function fetchUrl(url: string): Promise<{ title: string; content: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WebCrawler/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error(`Could not parse content from ${url}`);
  }

  return {
    title: article.title || url,
    content: article.textContent || ''
  };
}

async function indexUrl(url: string, source: string = 'web') {
  console.log(`Indexing: ${url}`);

  try {
    // Fetch and parse
    const { title, content } = await fetchUrl(url);

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
    console.error(`✗ Failed to index ${url}:`, error.message);
  }
}

async function main() {
  const urls = process.argv.slice(2);

  if (urls.length === 0) {
    console.error('Usage: tsx index.ts <url1> <url2> ...');
    process.exit(1);
  }

  console.log(`Starting web crawler for ${urls.length} URLs...`);

  for (const url of urls) {
    await indexUrl(url);
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Web crawling complete!');
  process.exit(0);
}

main().catch(console.error);