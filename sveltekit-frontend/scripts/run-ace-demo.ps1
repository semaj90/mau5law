$env:LLM_PROVIDER='ollama'
$env:LLM_MODEL='gemma3-legal:latest'
node scripts/phase76-ace-prompt-engineer.mjs --task "Fix TypeScript 5.6 compatibility" --iterations 2
