
import AgenticToolCaller from './phase89-agentic-tools.mjs';

async function testLocalDocsSearch() {
    console.log('🧪 Testing search_local_docs tool...');
    const agent = new AgenticToolCaller();

    // Test a specific Svelte 5 query that should be in llms.txt
    const query = '$state';

    try {
        const result = await agent.tools.search_local_docs(query);
        console.log('\n📄 Result Content Preview:');
        console.log(result.content);

        if (result.success && result.content.includes('$state')) {
            console.log('\n✅ Test PASSED: Found $state in local docs');
            process.exit(0);
        } else {
            console.error('\n❌ Test FAILED: Did not find expected content');
            process.exit(1);
        }
    } catch (err) {
        console.error('\n❌ Test FAILED with error:', err);
        process.exit(1);
    } finally {
        // Clean up connections
        await agent.pool.end();
        await agent.redis.quit();
    }
}

testLocalDocsSearch();
