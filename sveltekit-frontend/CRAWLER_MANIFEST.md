# Crawler Manifest for Phase 76 Knowledge Base

This manifest lists the documentation URLs for the key libraries used in the project, based on `package.json`.
Run these commands to populate the `phase76_knowledge_base` collection.

## Core Frameworks
- **Svelte 5**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://svelte.dev/docs/svelte" --depth 2`
- **SvelteKit**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://kit.svelte.dev/docs" --depth 2`
- **Vite**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://vitejs.dev/guide/" --depth 2`

## UI & Styling
- **UnoCSS**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://unocss.dev/guide/" --depth 2`
- **Tailwind CSS**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://tailwindcss.com/docs" --depth 2`
- **Bits UI**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://www.bits-ui.com/docs/introduction" --depth 2`

## Authentication & Protocols
- **Lucia Auth**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://lucia-auth.com/getting-started/" --depth 2`
- **MCP SDK**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://modelcontextprotocol.io/introduction" --depth 2`

## Database & Backend
- **Drizzle ORM**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://orm.drizzle.team/docs/overview" --depth 2`
- **PostgreSQL**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://www.postgresql.org/docs/current/" --depth 1`
- **Redis**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://redis.io/docs/" --depth 1`
- **Qdrant**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://qdrant.tech/documentation/" --depth 2`

## AI & LLM
- **LangChain JS**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://js.langchain.com/docs/get_started/introduction" --depth 2`
- **Ollama**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://github.com/ollama/ollama/tree/main/docs" --depth 1`
- **Google Generative AI**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://ai.google.dev/gemini-api/docs" --depth 2`

## Testing & State
- **Vitest**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://vitest.dev/guide/" --depth 2`
- **Playwright**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://playwright.dev/docs/intro" --depth 2`
- **XState**: `node scripts/phase76-knowledge-builder.mjs --crawl "https://stately.ai/docs/xstate" --depth 2`

## Batch Execution Script (PowerShell)
```powershell
# Run all crawlers sequentially
$urls = @(
    "https://svelte.dev/docs/svelte",
    "https://kit.svelte.dev/docs",
    "https://vitejs.dev/guide/",
    "https://unocss.dev/guide/",
    "https://orm.drizzle.team/docs/overview",
    "https://js.langchain.com/docs/get_started/introduction",
    "https://vitest.dev/guide/",
    "https://www.bits-ui.com/docs/introduction",
    "https://lucia-auth.com/getting-started/",
    "https://modelcontextprotocol.io/introduction"
)

foreach ($url in $urls) {
    Write-Host "Crawling $url..." -ForegroundColor Cyan
    node scripts/phase76-knowledge-builder.mjs --crawl $url --depth 2
}
```
