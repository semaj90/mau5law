#!/usr/bin/env node
/**
 * Phase 72 - AST-Based Error Analyzer
 *
 * Uses ts-morph to perform deep code analysis:
 * - Import/export graph mapping
 * - Type relationship analysis
 * - Symbol resolution and usage tracking
 * - Scope and dependency analysis
 * - Dead code detection
 * - Circular dependency detection
 *
 * Usage:
 *   npm install --save-dev ts-morph
 *   node scripts/ast-error-analyzer.mjs --file src/lib/auth/auth-store.ts
 *   node scripts/ast-error-analyzer.mjs --dir src/lib/services
 *   node scripts/ast-error-analyzer.mjs --graph import-graph.json
 */

import fs from 'fs';
import path from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse arguments
const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null;
const graphOutput = args.includes('--graph') ? args[args.indexOf('--graph') + 1] : 'ast-analysis.json';

console.log('🔍 Phase 72 - AST-Based Error Analyzer\n');

// Initialize ts-morph project
const project = new Project({
	tsConfigFilePath: path.join(__dirname, '..', 'tsconfig.json'),
	skipAddingFilesFromTsConfig: false
});

const analysis = {
	timestamp: new Date().toISOString(),
	files: {},
	importGraph: {},
	typeRelationships: {},
	circularDependencies: [],
	unusedExports: [],
	undeclaredImports: [],
	stats: {
		totalFiles: 0,
		totalImports: 0,
		totalExports: 0,
		totalSymbols: 0,
		circularDeps: 0
	}
};

/**
 * Analyze a single source file
 */
function analyzeFile(sourceFile) {
	const filePath = sourceFile.getFilePath().replace(/\\/g, '/');
	const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');

	console.log(`📄 Analyzing: ${relativePath}`);

	const fileAnalysis = {
		path: relativePath,
		imports: [],
		exports: [],
		symbols: [],
		types: [],
		errors: []
	};

	// Extract imports
	const importDeclarations = sourceFile.getImportDeclarations();
	importDeclarations.forEach(imp => {
		const moduleSpecifier = imp.getModuleSpecifierValue();
		const namedImports = imp.getNamedImports().map(ni => ni.getName());
		const defaultImport = imp.getDefaultImport()?.getText();

		fileAnalysis.imports.push({
			module: moduleSpecifier,
			named: namedImports,
			default: defaultImport,
			line: imp.getStartLineNumber()
		});

		// Track import graph
		if (!analysis.importGraph[relativePath]) {
			analysis.importGraph[relativePath] = [];
		}
		analysis.importGraph[relativePath].push(moduleSpecifier);
	});

	// Extract exports
	const exportDeclarations = sourceFile.getExportDeclarations();
	exportDeclarations.forEach(exp => {
		const moduleSpecifier = exp.getModuleSpecifierValue();
		const namedExports = exp.getNamedExports().map(ne => ne.getName());

		fileAnalysis.exports.push({
			module: moduleSpecifier,
			named: namedExports,
			line: exp.getStartLineNumber()
		});
	});

	// Extract exported functions/classes/variables
	sourceFile.getFunctions().forEach(fn => {
		if (fn.isExported()) {
			fileAnalysis.exports.push({
				type: 'function',
				name: fn.getName(),
				line: fn.getStartLineNumber()
			});
		}
	});

	sourceFile.getClasses().forEach(cls => {
		if (cls.isExported()) {
			fileAnalysis.exports.push({
				type: 'class',
				name: cls.getName(),
				line: cls.getStartLineNumber()
			});
		}
	});

	sourceFile.getVariableStatements().forEach(varStmt => {
		if (varStmt.isExported()) {
			varStmt.getDeclarations().forEach(decl => {
				fileAnalysis.exports.push({
					type: 'variable',
					name: decl.getName(),
					line: decl.getStartLineNumber()
				});
			});
		}
	});

	// Extract symbols (identifiers)
	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	const symbolSet = new Set();
	identifiers.forEach(id => {
		symbolSet.add(id.getText());
	});
	fileAnalysis.symbols = Array.from(symbolSet);

	// Extract type aliases and interfaces
	sourceFile.getTypeAliases().forEach(ta => {
		fileAnalysis.types.push({
			type: 'alias',
			name: ta.getName(),
			line: ta.getStartLineNumber()
		});
	});

	sourceFile.getInterfaces().forEach(iface => {
		fileAnalysis.types.push({
			type: 'interface',
			name: iface.getName(),
			line: iface.getStartLineNumber()
		});
	});

	// Detect errors via diagnostics
	const diagnostics = sourceFile.getPreEmitDiagnostics();
	diagnostics.forEach(diag => {
		const line = diag.getLineNumber();
		const message = diag.getMessageText().toString();
		const code = diag.getCode();

		fileAnalysis.errors.push({
			line,
			code: `TS${code}`,
			message,
			category: diag.getCategory()
		});
	});

	// Update stats
	analysis.stats.totalImports += fileAnalysis.imports.length;
	analysis.stats.totalExports += fileAnalysis.exports.length;
	analysis.stats.totalSymbols += fileAnalysis.symbols.length;

	analysis.files[relativePath] = fileAnalysis;
	analysis.stats.totalFiles++;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies() {
	console.log('\n🔄 Detecting circular dependencies...');

	const visited = new Set();
	const recursionStack = new Set();
	const cycles = [];

	function dfs(node, path = []) {
		if (recursionStack.has(node)) {
			// Found cycle
			const cycleStart = path.indexOf(node);
			const cycle = path.slice(cycleStart).concat(node);
			cycles.push(cycle);
			return;
		}

		if (visited.has(node)) return;

		visited.add(node);
		recursionStack.add(node);
		path.push(node);

		const dependencies = analysis.importGraph[node] || [];
		dependencies.forEach(dep => {
			// Resolve relative paths
			const resolvedDep = dep.startsWith('.')
				? path.resolve(path.dirname(node), dep).replace(/\\/g, '/')
				: dep;

			if (analysis.importGraph[resolvedDep]) {
				dfs(resolvedDep, [...path]);
			}
		});

		recursionStack.delete(node);
	}

	Object.keys(analysis.importGraph).forEach(file => {
		if (!visited.has(file)) {
			dfs(file);
		}
	});

	analysis.circularDependencies = cycles;
	analysis.stats.circularDeps = cycles.length;

	if (cycles.length > 0) {
		console.log(`⚠️  Found ${cycles.length} circular dependencies:`);
		cycles.slice(0, 5).forEach((cycle, idx) => {
			console.log(`   ${idx + 1}. ${cycle.join(' → ')}`);
		});
		if (cycles.length > 5) {
			console.log(`   ... and ${cycles.length - 5} more`);
		}
	} else {
		console.log('✅ No circular dependencies detected');
	}
}

/**
 * Find unused exports
 */
function findUnusedExports() {
	console.log('\n🔍 Finding unused exports...');

	const exportedSymbols = {};
	const importedSymbols = new Set();

	// Collect all exports
	Object.entries(analysis.files).forEach(([filePath, fileData]) => {
		fileData.exports.forEach(exp => {
			if (exp.named) {
				exp.named.forEach(name => {
					exportedSymbols[`${filePath}:${name}`] = { file: filePath, name, line: exp.line };
				});
			}
			if (exp.name) {
				exportedSymbols[`${filePath}:${exp.name}`] = { file: filePath, name: exp.name, line: exp.line };
			}
		});
	});

	// Collect all imports
	Object.values(analysis.files).forEach(fileData => {
		fileData.imports.forEach(imp => {
			if (imp.named) {
				imp.named.forEach(name => importedSymbols.add(name));
			}
			if (imp.default) {
				importedSymbols.add(imp.default);
			}
		});
	});

	// Find unused
	Object.entries(exportedSymbols).forEach(([key, data]) => {
		if (!importedSymbols.has(data.name)) {
			analysis.unusedExports.push(data);
		}
	});

	console.log(`📊 Found ${analysis.unusedExports.length} potentially unused exports`);
	analysis.unusedExports.slice(0, 10).forEach(exp => {
		console.log(`   - ${exp.name} in ${exp.file}:${exp.line}`);
	});
	if (analysis.unusedExports.length > 10) {
		console.log(`   ... and ${analysis.unusedExports.length - 10} more`);
	}
}

/**
 * Main execution
 */
async function main() {
	try {
		let targetFiles = [];

		if (fileArg) {
			// Analyze single file
			const absPath = path.resolve(path.join(__dirname, '..', fileArg));
			const sourceFile = project.getSourceFile(absPath);
			if (sourceFile) {
				targetFiles.push(sourceFile);
			} else {
				console.error(`❌ File not found: ${absPath}`);
				process.exit(1);
			}
		} else if (dirArg) {
			// Analyze directory
			const absPath = path.resolve(path.join(__dirname, '..', dirArg));
			targetFiles = project.getSourceFiles(`${absPath}/**/*.ts`);
			console.log(`📂 Found ${targetFiles.length} TypeScript files in ${dirArg}\n`);
		} else {
			// Analyze all project files
			targetFiles = project.getSourceFiles();
			console.log(`📂 Analyzing entire project (${targetFiles.length} files)\n`);
		}

		// Analyze each file
		targetFiles.forEach(analyzeFile);

		// Post-analysis
		detectCircularDependencies();
		findUnusedExports();

		// Save results
		const outputPath = path.join(__dirname, '..', 'reports', 'latest', graphOutput);
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });
		fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

		console.log('\n═'.repeat(60));
		console.log('\n✅ AST Analysis Complete!\n');
		console.log('📊 Summary:');
		console.log(`   Files analyzed: ${analysis.stats.totalFiles}`);
		console.log(`   Total imports: ${analysis.stats.totalImports}`);
		console.log(`   Total exports: ${analysis.stats.totalExports}`);
		console.log(`   Unique symbols: ${analysis.stats.totalSymbols}`);
		console.log(`   Circular deps: ${analysis.stats.circularDeps}`);
		console.log(`   Unused exports: ${analysis.unusedExports.length}\n`);
		console.log(`📁 Results saved to: ${outputPath}\n`);
		console.log('═'.repeat(60) + '\n');

	} catch (error) {
		console.error(`\n❌ FATAL ERROR: ${error.message}`);
		console.error(error.stack);
		process.exit(1);
	}
}

main();
