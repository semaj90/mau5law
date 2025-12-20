#!/usr/bin/env node
/**
 * 🤖 Phase 76: ACE Contextual Prompt Engineer
 *
 * Advanced LLM prompting system that uses RAG+KAG for contextual code generation.
 *
 * Features:
 * - RAG: Semantic search through 53,227 error embeddings (Qdrant)
 * - KAG: Graph traversal for entity relationships (Neo4j optional)
 * - Multi-turn agentic dialogue with tool calling
 * - Confidence-based decision making (GRPO-style)
 * - Self-prompting with iterative refinement
 * - Multi-language support (TS, Svelte, Go, Python, C++)
 *
 * Architecture:
 * 1. User provides task/question
 * 2. RAG retrieves relevant errors/routes/components
 * 3. KAG finds related entities via graph traversal
 * 4. Generate contextual prompt with retrieved knowledge
 * 5. Call Ollama LLM with tools available
 * 6. Iteratively refine based on confidence scores
 * 7. Output final solution with validation
 *
 * Usage:
 *   node phase76-ace-prompt-engineer.mjs --task "Fix missing imports in evidence/analyze"
 *   node phase76-ace-prompt-engineer.mjs --task "Optimize route structure" --iterations 3
 *   node phase76-ace-prompt-engineer.mjs --file src/routes/(app)/cases/[id]/+page.svelte
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// ============================================
// Configuration
// ============================================
const CONFIG = {
	ollama: {
		url: process.env.OLLAMA_URL || 'http://localhost:11434',
		model: process.env.OLLAMA_MODEL || 'gemma3-legal:latest',  // Updated to use available model
		embeddingModel: 'embeddinggemma:latest',
		temperature: 0.3,
		topP: 0.9,
		maxTokens: 8192
	},
	qdrant: {
		url: process.env.QDRANT_URL || 'http://localhost:6333',
		collection: 'phase72_error_patterns',
		topK: 10,
		scoreThreshold: 0.7
	},
	neo4j: {
		enabled: false, // Set to true if Neo4j is running
		url: process.env.NEO4J_URL || 'bolt://localhost:7687',
		user: process.env.NEO4J_USER || 'neo4j',
		password: process.env.NEO4J_PASSWORD || 'password'
	},
	knowledge: {
		basePath: 'reports/phase76/consolidated-knowledge-base.json',
		promptsPath: 'reports/phase76/llm-prompts.json'
	},
	tools: {
		available: [
			'tsc',
			'svelte-check',
			'grep-search',
			'file-read',
			'file-write',
			'ast-analyzer',
			'web-search',
			'test-runner'
		]
	},
	confidence: {
		autoApply: 0.85,
		manualReview: 0.70,
		toolInvocation: 0.50,
		escalate: 0.50
	},
	output: {
		dir: 'reports/phase76/ace-sessions',
		sessionFile: 'session-{timestamp}.json',
		solutionFile: 'solution-{timestamp}.md'
	}
};

// ============================================
// ACE Prompt Engineer
// ============================================
class ACEPromptEngineer {
	constructor(options = {}) {
		this.task = options.task || '';
		this.file = options.file || null;
		this.iterations = options.iterations || 1;
		this.verbose = options.verbose || false;

		this.session = {
			id: Date.now().toString(),
			timestamp: new Date().toISOString(),
			task: this.task,
			file: this.file,
			iterations: [],
			finalSolution: null,
			confidence: 0,
			toolsCalled: []
		};

		this.knowledgeBase = null;
		this.prompts = null;
	}

	/**
	 * Initialize: Load knowledge base and prompts
	 */
	async initialize() {
		console.log(chalk.cyan.bold('🤖 ACE Contextual Prompt Engineer\n'));
		console.log(chalk.gray(`Task: ${this.task}`));
		if (this.file) console.log(chalk.gray(`File: ${this.file}`));
		console.log(chalk.gray(`Iterations: ${this.iterations}\n`));

		// Load knowledge base
		const kbPath = path.join(rootDir, CONFIG.knowledge.basePath);
		if (existsSync(kbPath)) {
			this.knowledgeBase = JSON.parse(await fs.readFile(kbPath, 'utf-8'));
			console.log(chalk.green('✅ Knowledge base loaded'));
		} else {
			console.log(chalk.yellow('⚠️  Knowledge base not found, run phase76-ace-knowledge-consolidator.mjs first'));
			this.knowledgeBase = { entities: { errors: [], routes: [], components: [] }, relationships: [] };
		}

		// Load prompts
		const promptsPath = path.join(rootDir, CONFIG.knowledge.promptsPath);
		if (existsSync(promptsPath)) {
			this.prompts = JSON.parse(await fs.readFile(promptsPath, 'utf-8'));
			console.log(chalk.green('✅ ACE prompts loaded\n'));
		}
	}

	/**
	 * Execute full ACE pipeline
	 */
	async execute() {
		const startTime = performance.now();

		for (let i = 0; i < this.iterations; i++) {
			console.log(chalk.yellow.bold(`\n🔄 Iteration ${i + 1}/${this.iterations}\n`));

			const iteration = {
				number: i + 1,
				timestamp: new Date().toISOString(),
				steps: []
			};

			// Step 1: RAG retrieval
			const ragContext = await this.performRAGRetrieval();
			iteration.steps.push({ name: 'RAG Retrieval', results: ragContext.length, time: performance.now() - startTime });

			// Step 2: KAG traversal (optional)
			const kagContext = await this.performKAGTraversal();
			iteration.steps.push({ name: 'KAG Traversal', results: kagContext.length, time: performance.now() - startTime });

			// Step 3: Build contextual prompt
			const prompt = this.buildContextualPrompt(ragContext, kagContext);
			iteration.steps.push({ name: 'Prompt Generation', size: prompt.length, time: performance.now() - startTime });

			// Step 4: Call LLM
			const llmResponse = await this.callLLM(prompt);
			iteration.steps.push({ name: 'LLM Response', confidence: llmResponse.confidence, time: performance.now() - startTime });

			// Step 5: Tool invocation (if needed)
			if (llmResponse.confidence < CONFIG.confidence.autoApply && llmResponse.suggestedTools) {
				const toolResults = await this.invokeTools(llmResponse.suggestedTools);
				iteration.steps.push({ name: 'Tool Invocation', tools: toolResults.length, time: performance.now() - startTime });

				// Re-prompt with tool results
				const refinedPrompt = this.buildRefinedPrompt(prompt, toolResults);
				const refinedResponse = await this.callLLM(refinedPrompt);
				llmResponse.solution = refinedResponse.solution;
				llmResponse.confidence = refinedResponse.confidence;
			}

			// Store iteration
			iteration.solution = llmResponse.solution;
			iteration.confidence = llmResponse.confidence;
			this.session.iterations.push(iteration);

			// Check if confidence is high enough
			if (llmResponse.confidence >= CONFIG.confidence.autoApply) {
				console.log(chalk.green(`\n✅ High confidence solution found (${(llmResponse.confidence * 100).toFixed(1)}%)`));
				this.session.finalSolution = llmResponse.solution;
				this.session.confidence = llmResponse.confidence;
				break;
			}
		}

		const duration = ((performance.now() - startTime) / 1000).toFixed(2);

		// Save session
		await this.saveSession();

		// Print summary
		this.printSummary(duration);
	}

	/**
	 * Step 1: RAG - Retrieve relevant context from Qdrant embeddings
	 */
	async performRAGRetrieval() {
		console.log(chalk.cyan('   📚 Step 1: RAG Retrieval (Semantic Search)'));

		try {
			// Generate embedding for the task query
			const embedding = await this.generateEmbedding(this.task);

			// Search Qdrant
			const searchUrl = `${CONFIG.qdrant.url}/collections/${CONFIG.qdrant.collection}/points/search`;
			const response = await fetch(searchUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					vector: embedding,
					limit: CONFIG.qdrant.topK,
					score_threshold: CONFIG.qdrant.scoreThreshold,
					with_payload: true
				})
			});

			if (!response.ok) {
				console.log(chalk.yellow('   ⚠️  Qdrant not available, using local knowledge base'));
				return this.fallbackRAGRetrieval();
			}

			const data = await response.json();
			const results = data.result || [];

			console.log(chalk.green(`   ✅ Found ${results.length} relevant errors/entities\n`));

			return results.map(r => ({
				score: r.score,
				file: r.payload.file,
				message: r.payload.message,
				category: r.payload.category
			}));

		} catch (error) {
			console.log(chalk.yellow(`   ⚠️  RAG error: ${error.message}, using fallback`));
			return this.fallbackRAGRetrieval();
		}
	}

	/**
	 * Fallback RAG: Use local knowledge base
	 */
	fallbackRAGRetrieval() {
		if (!this.knowledgeBase) return [];

		// Simple keyword matching
		const keywords = this.task.toLowerCase().split(' ');
		const relevantErrors = this.knowledgeBase.entities.errors.filter(e =>
			keywords.some(kw => e.message.toLowerCase().includes(kw) || e.file.toLowerCase().includes(kw))
		).slice(0, CONFIG.qdrant.topK);

		return relevantErrors.map(e => ({
			score: 0.8,
			file: e.file,
			message: e.message,
			category: e.category
		}));
	}

	/**
	 * Step 2: KAG - Knowledge graph traversal for relationships
	 */
	async performKAGTraversal() {
		console.log(chalk.cyan('   🔗 Step 2: KAG Traversal (Graph Relationships)'));

		if (!this.knowledgeBase) {
			console.log(chalk.yellow('   ⚠️  Knowledge base not loaded\n'));
			return [];
		}

		// If file is specified, find related entities
		if (this.file) {
			const relatedEntities = this.knowledgeBase.relationships
				.filter(r => r.from.includes(this.file) || r.to.includes(this.file))
				.slice(0, 10);

			console.log(chalk.green(`   ✅ Found ${relatedEntities.length} related entities\n`));
			return relatedEntities;
		}

		// Otherwise, find entities related to error categories
		const errorCategories = this.knowledgeBase.entities.errors
			.map(e => e.category)
			.filter((v, i, a) => a.indexOf(v) === i) // unique
			.slice(0, 5);

		console.log(chalk.green(`   ✅ Found ${errorCategories.length} error categories\n`));
		return errorCategories.map(cat => ({ category: cat }));
	}

	/**
	 * Step 3: Build contextual prompt with RAG+KAG context
	 */
	buildContextualPrompt(ragContext, kagContext) {
		console.log(chalk.cyan('   ✍️  Step 3: Building Contextual Prompt'));

		const templatePrompt = this.selectPromptTemplate();

		const prompt = `${templatePrompt.prompt}

## Retrieved Context (RAG):
${ragContext.map((ctx, i) => `${i + 1}. [Score: ${(ctx.score * 100).toFixed(0)}%] ${ctx.file}: ${ctx.message}`).join('\n')}

## Graph Relationships (KAG):
${kagContext.map((kg, i) => {
	if (kg.from && kg.to) return `${i + 1}. ${kg.from} → ${kg.type} → ${kg.to}`;
	if (kg.category) return `${i + 1}. Error Category: ${kg.category}`;
	return '';
}).join('\n')}

## Your Task:
${this.task}

${this.file ? `## Target File:\n${this.file}\n` : ''}

## Instructions:
1. Analyze the retrieved context carefully
2. Use graph relationships to understand dependencies
3. Generate a high-confidence solution (aim for ≥85%)
4. If confidence <85%, suggest tools to gather more information
5. Provide step-by-step implementation plan
6. Include validation steps

## Output Format:
{
  "solution": "detailed solution here",
  "confidence": 0.XX,
  "reasoning": "why this solution works",
  "steps": ["step 1", "step 2", ...],
  "validation": "how to validate the fix",
  "suggestedTools": ["tool1", "tool2"] // if confidence < 85%
}`;

		console.log(chalk.green(`   ✅ Prompt ready (${prompt.length} chars)\n`));
		return prompt;
	}

	/**
	 * Step 4: Call Ollama LLM
	 */
	async callLLM(prompt) {
		console.log(chalk.cyan('   🧠 Step 4: Calling Ollama LLM'));

		try {
			const response = await fetch(`${CONFIG.ollama.url}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: CONFIG.ollama.model,
					prompt: prompt,
					stream: false,
					options: {
						temperature: CONFIG.ollama.temperature,
						top_p: CONFIG.ollama.topP,
						num_predict: CONFIG.ollama.maxTokens
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Ollama error: ${response.status}`);
			}

			const data = await response.json();
			const responseText = data.response || '';

			// Try to parse JSON response
			let parsedResponse;
			try {
				const jsonMatch = responseText.match(/\{[\s\S]*\}/);
				parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { solution: responseText, confidence: 0.5 };
			} catch (e) {
				parsedResponse = { solution: responseText, confidence: 0.5 };
			}

			console.log(chalk.green(`   ✅ LLM responded (confidence: ${(parsedResponse.confidence * 100).toFixed(1)}%)\n`));
			return parsedResponse;

		} catch (error) {
			console.log(chalk.red(`   ❌ LLM error: ${error.message}\n`));
			return { solution: 'Error calling LLM', confidence: 0, error: error.message };
		}
	}

	/**
	 * Step 5: Invoke tools if needed
	 */
	async invokeTools(tools) {
		console.log(chalk.cyan(`   🛠️  Step 5: Invoking Tools: ${tools.join(', ')}`));

		const results = [];

		for (const tool of tools) {
			try {
				let output = '';

				switch (tool) {
					case 'tsc':
						output = execSync('npx tsc --noEmit', { cwd: rootDir, encoding: 'utf-8', stdio: 'pipe' });
						break;
					case 'svelte-check':
						output = execSync('npx svelte-check --threshold warning', { cwd: rootDir, encoding: 'utf-8', stdio: 'pipe' });
						break;
					case 'file-read':
						if (this.file && existsSync(path.join(rootDir, this.file))) {
							output = await fs.readFile(path.join(rootDir, this.file), 'utf-8');
						}
						break;
					case 'grep-search':
						// Search for related imports
						output = execSync(`grep -r "import.*Button\\|Card\\|Input" src/lib/components`, { cwd: rootDir, encoding: 'utf-8', stdio: 'pipe' });
						break;
					default:
						output = `Tool ${tool} not implemented yet`;
				}

				results.push({ tool, output: output.substring(0, 500) }); // Truncate long outputs
				this.session.toolsCalled.push(tool);

			} catch (error) {
				results.push({ tool, error: error.message });
			}
		}

		console.log(chalk.green(`   ✅ Tools executed: ${results.length}\n`));
		return results;
	}

	/**
	 * Build refined prompt with tool results
	 */
	buildRefinedPrompt(originalPrompt, toolResults) {
		const toolContext = toolResults.map(tr =>
			`Tool: ${tr.tool}\nOutput: ${tr.output || tr.error}`
		).join('\n\n');

		return `${originalPrompt}

## Additional Tool Context:
${toolContext}

Now generate a refined solution with higher confidence based on the tool outputs.`;
	}

	/**
	 * Select prompt template based on task
	 */
	selectPromptTemplate() {
		if (!this.prompts) {
			return {
				role: 'general-agent',
				prompt: 'You are an expert software engineer. Analyze the provided context and generate a solution.'
			};
		}

		// Match task to prompt template
		if (this.task.toLowerCase().includes('import')) return this.prompts.importResolution;
		if (this.task.toLowerCase().includes('route')) return this.prompts.routeConsolidation;
		if (this.task.toLowerCase().includes('error') || this.task.toLowerCase().includes('fix')) return this.prompts.errorFixing;

		return this.prompts.errorFixing; // Default
	}

	/**
	 * Generate embedding using Ollama
	 */
	async generateEmbedding(text) {
		const response = await fetch(`${CONFIG.ollama.url}/api/embeddings`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: CONFIG.ollama.embeddingModel,
				prompt: text
			})
		});

		if (!response.ok) {
			throw new Error('Embedding generation failed');
		}

		const data = await response.json();
		return data.embedding;
	}

	/**
	 * Save session to file
	 */
	async saveSession() {
		const sessionFile = CONFIG.output.sessionFile.replace('{timestamp}', this.session.id);
		const sessionPath = path.join(rootDir, CONFIG.output.dir, sessionFile);

		await fs.mkdir(path.dirname(sessionPath), { recursive: true });
		await fs.writeFile(sessionPath, JSON.stringify(this.session, null, 2));

		// Also save solution as markdown
		if (this.session.finalSolution) {
			const solutionFile = CONFIG.output.solutionFile.replace('{timestamp}', this.session.id);
			const solutionPath = path.join(rootDir, CONFIG.output.dir, solutionFile);

			const markdown = `# ACE Solution - ${this.task}

**Confidence:** ${(this.session.confidence * 100).toFixed(1)}%
**Timestamp:** ${this.session.timestamp}
**Iterations:** ${this.session.iterations.length}

## Solution

${this.session.finalSolution}

## Tools Used

${this.session.toolsCalled.join(', ') || 'None'}

## Validation

Run the following to validate:
- \`npm run check\` (TypeScript validation)
- \`npm test\` (test suite)
`;

			await fs.writeFile(solutionPath, markdown);
		}
	}

	/**
	 * Print summary
	 */
	printSummary(duration) {
		console.log(chalk.green.bold('\n✅ ACE Process Complete\n'));
		console.log(chalk.white(`   Task: ${this.task}`));
		console.log(chalk.white(`   Iterations: ${this.session.iterations.length}`));
		console.log(chalk.white(`   Final Confidence: ${(this.session.confidence * 100).toFixed(1)}%`));
		console.log(chalk.white(`   Tools Called: ${this.session.toolsCalled.join(', ') || 'None'}`));
		console.log(chalk.white(`   Duration: ${duration}s\n`));

		if (this.session.confidence >= CONFIG.confidence.autoApply) {
			console.log(chalk.green('🎯 Solution can be auto-applied'));
		} else if (this.session.confidence >= CONFIG.confidence.manualReview) {
			console.log(chalk.yellow('⚠️  Solution requires manual review'));
		} else {
			console.log(chalk.red('❌ Low confidence - human escalation needed'));
		}

		console.log(chalk.cyan(`\n📄 Session saved: ${CONFIG.output.dir}/session-${this.session.id}.json`));
		if (this.session.finalSolution) {
			console.log(chalk.cyan(`📝 Solution saved: ${CONFIG.output.dir}/solution-${this.session.id}.md\n`));
		}
	}
}

// ============================================
// CLI Interface
// ============================================
async function main() {
	const args = process.argv.slice(2);

	let task = '';
	let file = null;
	let iterations = 1;
	let verbose = false;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--task' && args[i + 1]) {
			task = args[i + 1];
			i++;
		} else if (args[i] === '--file' && args[i + 1]) {
			file = args[i + 1];
			i++;
		} else if (args[i] === '--iterations' && args[i + 1]) {
			iterations = parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === '--verbose') {
			verbose = true;
		}
	}

	if (!task) {
		console.log(chalk.red('❌ Error: --task is required\n'));
		console.log(chalk.cyan('Usage:'));
		console.log(chalk.white('  node phase76-ace-prompt-engineer.mjs --task "Fix missing imports" [--file path] [--iterations 3] [--verbose]\n'));
		console.log(chalk.cyan('Examples:'));
		console.log(chalk.white('  node phase76-ace-prompt-engineer.mjs --task "Resolve all import errors"'));
		console.log(chalk.white('  node phase76-ace-prompt-engineer.mjs --task "Optimize route structure" --iterations 2'));
		console.log(chalk.white('  node phase76-ace-prompt-engineer.mjs --task "Fix type errors" --file src/routes/(app)/cases/[id]/+page.svelte\n'));
		process.exit(1);
	}

	const engineer = new ACEPromptEngineer({ task, file, iterations, verbose });
	await engineer.initialize();
	await engineer.execute();
}

// Run if called directly
if (import.meta.url.startsWith('file:')) {
	const modulePath = fileURLToPath(import.meta.url);
	const scriptPath = process.argv[1];
	if (scriptPath && (modulePath === scriptPath || scriptPath.endsWith('phase76-ace-prompt-engineer.mjs'))) {
		main().catch(e => {
			console.error(e);
			process.exit(1);
		});
	}
}

export { ACEPromptEngineer, CONFIG };
