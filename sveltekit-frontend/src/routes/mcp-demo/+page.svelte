<svelte:head>
  <title>MCP + Gemma Demo</title>
  <meta name="description" content="Demo page for querying MCP context7 via Gemma3-Legal" />
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'

  type RegistryServer = {
    name: string
    region?: string
    lastUpdated?: string
    cores?: number
    capabilities?: string[]
    endpoints?: Array<{ id: string; url: string; protocol: string }>
  }

  let serverName = 'context7'
  let useFunctions = true
  let loading = false
  let result: any = null
  let error: string | null = null
  let servers: RegistryServer[] = []

  async function loadServers() {
    try {
      const res = await fetch('/api/mcp/registry')
      if (!res.ok) throw new Error('Failed to load MCP registry')
      const data = await res.json()
      servers = data.servers ?? []
      if (!servers.find((s) => s.name === serverName) && servers.length > 0) {
        serverName = servers[0].name
      }
    } catch (err: any) {
      error = err?.message ?? String(err)
    }
  }

  async function fetchMcp() {
    loading = true
    error = null
    result = null
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverName, useFunctions })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? 'Request failed')
      }
      result = data
    } catch (err: any) {
      error = err?.message ?? String(err)
    } finally {
      loading = false
    }
  }

  onMount(async () => {
    await loadServers()
    await fetchMcp()
  })
</script>

<section class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
  <h1 class="text-2xl font-bold">MCP Server Query Demo</h1>
  <p class="text-sm text-gray-600">
    This demo calls <code>/api/mcp</code>, which in turn invokes Gemma3-Legal through Ollama.
    Toggle function-calling to let the model request <code>getMcpServerData</code>.
  </p>

  <div class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <label class="flex flex-col text-sm font-medium text-gray-700">
      MCP server
      {#if servers.length > 0}
        <select
          class="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          bind:value={serverName}
          on:change={fetchMcp}
        >
          {#each servers as server}
            <option value={server.name}>{server.name}</option>
          {/each}
        </select>
      {:else}
        <input
          class="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          bind:value={serverName}
          placeholder="context7"
        />
      {/if}
    </label>

    <label class="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" bind:checked={useFunctions} />
      Enable function calling flow
    </label>

    <button
      class="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      onclick={fetchMcp}
      disabled={loading}
    >
      {loading ? 'Running…' : 'Invoke MCP via Gemma'}
    </button>
  </div>

  {#if error}
    <div class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  {#if result}
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold">LLM Output</h2>
        <div class="rounded border border-gray-200 bg-gray-50 p-3 text-xs">
          <pre>{JSON.stringify(result.llm_output, null, 2)}</pre>
        </div>
      </div>

      {#if result.record}
        <div>
          <h2 class="text-lg font-semibold">Registry Record</h2>
          <div class="rounded border border-gray-200 bg-white p-4 shadow-sm text-sm space-y-3">
            <div class="flex flex-wrap gap-4">
              <p><span class="font-semibold">Server:</span> {result.record.serverName}</p>
              {#if result.record.region}
                <p><span class="font-semibold">Region:</span> {result.record.region}</p>
              {/if}
              {#if result.record.lastUpdated}
                <p><span class="font-semibold">Last updated:</span> {result.record.lastUpdated}</p>
              {/if}
              <p><span class="font-semibold">Cores:</span> {result.record.cores.length}</p>
            </div>

            {#if result.record.capabilities?.length}
              <div class="flex flex-wrap gap-2">
                {#each result.record.capabilities as capability}
                  <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {capability}
                  </span>
                {/each}
              </div>
            {/if}

            {#if result.record.endpoints?.length}
              <div>
                <h3 class="font-semibold text-sm">Endpoints</h3>
                <div class="grid gap-3 md:grid-cols-2">
                  {#each result.record.endpoints as endpoint}
                    <div class="rounded border border-gray-200 bg-gray-50 p-3">
                      <p class="text-xs uppercase tracking-wide text-gray-500">{endpoint.protocol}</p>
                      <p class="text-sm font-medium text-blue-700 break-all">{endpoint.url}</p>
                      {#if endpoint.id}
                        <p class="text-xs text-gray-500 mt-1">ID: {endpoint.id}</p>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if result.record.cores?.length}
              <div>
                <h3 class="font-semibold text-sm">Core Topology</h3>
                <div class="grid gap-2 md:grid-cols-2">
                  {#each result.record.cores as core}
                    <div class="rounded border border-gray-200 bg-white p-2 text-xs">
                      <p><strong>{core.id}</strong> — {core.role}</p>
                      <p>Status: <span class="font-semibold">{core.status}</span></p>
                      {#if core.host}
                        <p>Host: {core.host}</p>
                      {/if}
                      {#if core.capacity !== undefined}
                        <p>Capacity: {(core.capacity * 100).toFixed(0)}%</p>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</section>
