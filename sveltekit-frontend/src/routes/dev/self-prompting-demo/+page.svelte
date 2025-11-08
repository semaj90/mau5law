<script lang="ts">
  import type { Case } from '$lib/types';
  import SelfPromptingDemo from '$lib/components/dev/SelfPromptingDemo.svelte';
</script>

<svelte:head>
  <title>Self-Prompting Agent Orchestration Demo - Legal AI Development</title>
  <meta
    name="description"
    content="Comprehensive demonstration of multi-agent coordination with self-prompting loops and Context7 MCP integration"
  />
</svelte:head>
<main class="min-h-screen">
  <div class="max-w-full">
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-4xl font-bold">Self-Prompting Agent Orchestration</h1>
        <p class="text-xl text-blue-100">
          Experience advanced AI agent coordination with self-prompting loops, semantic search
          integration, memory graph analysis, and automated legal workflow processing.
        </p>
        <div class="mt-8 grid grid-cols-1 md:grid-cols-4">
          <div class="bg-blue-700 bg-opacity-50 rounded-lg">
            <h3 class="font-semibold">ðŸ¤– Multi-Agent</h3>
            <p class="text-sm">AutoGen, CrewAI, vLLM, Claude coordination</p>
          </div>
          <div class="bg-purple-700 bg-opacity-50 rounded-lg">
            <h3 class="font-semibold">ðŸ”„ Self-Prompting</h3>
            <p class="text-sm">Agents generate their own follow-up prompts</p>
          </div>
          <div class="bg-indigo-700 bg-opacity-50 rounded-lg">
            <h3 class="font-semibold">âš–ï¸ Legal AI</h3>
            <p class="text-sm">Evidence analysis and case building workflows</p>
          </div>
          <div class="bg-teal-700 bg-opacity-50 rounded-lg">
            <h3 class="font-semibold">ðŸ”§ Context7</h3>
            <p class="text-sm">MCP tools for development guidance</p>
          </div>
        </div>
      </div>
    </div>
    <SelfPromptingDemo />
    <footer class="bg-white border-t border-gray-200">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 md: grid-cols-3">
          <div>
            <h3 class="font-semibold text-gray-900">Architecture Overview</h3>
            <ul class="text-sm text-gray-600">
              <li>â€¢ SvelteKit, 2 + Svelte, 5 runes</li>
              <li>â€¢ TypeScript for type safety</li>
              <li>â€¢ UnoCSS for styling optimization</li>
              <li>â€¢ Drizzle ORM with PostgreSQL</li>
              <li>â€¢ Context7 MCP server integration</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">AI Integration</h3>
            <ul class="text-sm text-gray-600">
              <li>â€¢ vLLM for high-performance inference</li>
              <li>â€¢ Ollama for local LLM hosting</li>
              <li>â€¢ AutoGen multi-agent framework</li>
              <li>â€¢ CrewAI workflow orchestration</li>
              <li>â€¢ Claude API for reasoning tasks</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">Legal AI Features</h3>
            <ul class="text-sm text-gray-600">
              <li>â€¢ Evidence processing and validation</li>
              <li>â€¢ Case building and argument synthesis</li>
              <li>â€¢ Legal precedent research automation</li>
              <li>â€¢ Multi-agent collaborative analysis</li>
              <li>â€¢ Automated report generation</li>
            </ul>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-gray-200">
          <p class="text-sm">
            Advanced AI-powered legal workflow automation with self-prompting agent orchestration.
            Built with production-ready SvelteKit architecture and Context7 MCP integration.
          </p>
        </div>
      </div>
    </footer>
  </div>
</main>

<style>
  /* Ensure full-width layout */
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
