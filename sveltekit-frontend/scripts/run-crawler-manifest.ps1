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
