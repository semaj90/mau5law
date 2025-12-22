/**
 * Quick test of MCP Agent + Svelte 5 Migration Query
 */

import AgentOrchestrator from './agent-orchestrator.mjs';

async function testSvelte5Query() {
    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  Testing MCP Agent: Svelte 5 Migration Patterns              ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

    const agent = new AgentOrchestrator('ollama');

    const systemPrompt = `You are an expert Svelte 5 migration assistant. You have access to:
- kb_vector_search: Search the indexed error analysis codebase for Svelte patterns
- web_search: Search for up-to-date Svelte 5 documentation
- graph_cypher_query: Query relationships between errors and fixes

Use these tools to find migration patterns from the codebase.`;

    const query = `Search the knowledge base for Svelte 5 component instantiation errors.
What are the patterns for migrating from "new Component()" to mount()?
Show examples from the indexed codebase and explain the migration steps.`;

    console.log(`📝 Query: ${query}\n`);
    console.log(`⏳ Processing (this may take 30-60 seconds)...\n`);

    try {
        const result = await agent.chat(query, systemPrompt);

        console.log(`\n✅ Final Response:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(result.response);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        if (result.toolCalls.length > 0) {
            console.log(`🔧 Tool Calls Made: ${result.toolCalls.length}`);
            for (const call of result.toolCalls) {
                console.log(`   • ${call.tool}:`);
                console.log(`     Args: ${JSON.stringify(call.args, null, 2).substring(0, 200)}...`);
                console.log(`     Time: ${call.timestamp}`);
            }
        } else {
            console.log(`⚠️  No tool calls made - LLM answered directly`);
        }

        console.log(`\n📊 Metadata:`);
        console.log(`   Iterations: ${result.metadata.iterations}`);
        console.log(`   Backend: ${result.metadata.backend}`);
        console.log(`   Timestamp: ${result.metadata.timestamp}`);

        // Save conversation
        agent.saveConversation('data/agent-conversations.jsonl');

        console.log(`\n✨ Test complete!\n`);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

testSvelte5Query();
