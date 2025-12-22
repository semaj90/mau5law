/**
 * Direct test without tool calling - just query Ollama about Svelte 5
 */

async function testDirectOllama() {
    console.log(`\n🤖 Direct Ollama Test: Svelte 5 Migration\n`);

    const query = `Based on the Svelte 5 migration guide, explain:

1. Why was "new Component()" deprecated?
2. What is the mount() function and how does it work?
3. Show a before/after code example
4. What are the key differences?

Provide a concise answer with code examples.`;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma3-legal:latest',
                prompt: query,
                stream: false
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Ollama Response:\n`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(data.response);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

            console.log(`📊 Stats:`);
            console.log(`   Model: ${data.model}`);
            console.log(`   Tokens: ${data.eval_count || 'N/A'}`);
            console.log(`   Time: ${(data.total_duration / 1e9).toFixed(2)}s`);
        } else {
            console.error(`❌ Ollama error: ${response.status}`);
            const text = await response.text();
            console.error(text);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

testDirectOllama();
