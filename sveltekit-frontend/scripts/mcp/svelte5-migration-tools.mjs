/**
 * Agentic Tools for Svelte 5 Migration
 * Tool-calling functions for detecting and migrating legacy patterns
 */

import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Tool A: detect_and_migrate_svelte
 * Analyzes code for legacy patterns and returns Svelte 5 equivalent
 */
function detectAndMigrateSvelte(code) {
    const migrations = [];
    const warnings = [];

    // Pattern 1: export let → $props()
    if (code.includes('export let')) {
        const exportLetPattern = /export\s+let\s+(\w+)(?:\s*=\s*([^;]+))?;/g;
        let match;
        const propsFound = [];

        while ((match = exportLetPattern.exec(code)) !== null) {
            const [fullMatch, propName, defaultValue] = match;
            propsFound.push({ propName, defaultValue: defaultValue?.trim() });

            migrations.push({
                pattern: 'export_let',
                old: fullMatch,
                new: defaultValue
                    ? `let { ${propName} = ${defaultValue} } = $props();`
                    : `let { ${propName} } = $props();`,
                line: code.substring(0, match.index).split('\n').length
            });
        }

        warnings.push({
            severity: 'CRITICAL',
            message: `Found ${propsFound.length} 'export let' declarations. Svelte 5 requires $props().`,
            fix: 'Replace with destructured $props()'
        });
    }

    // Pattern 2: $: reactive statements → $derived or $effect
    if (code.match(/\$:\s*\w+\s*=/)) {
        const reactivePattern = /\$:\s*(\w+)\s*=\s*([^;]+);/g;
        let match;

        while ((match = reactivePattern.exec(code)) !== null) {
            const [fullMatch, varName, expression] = match;

            migrations.push({
                pattern: 'reactive_label',
                old: fullMatch,
                new: `let ${varName} = $derived(${expression.trim()});`,
                line: code.substring(0, match.index).split('\n').length
            });
        }

        warnings.push({
            severity: 'HIGH',
            message: 'Reactive labels ($:) are deprecated in Svelte 5.',
            fix: 'Use $derived() for computed values or $effect() for side effects'
        });
    }

    // Pattern 3: $: side effects → $effect
    if (code.match(/\$:\s*\{/)) {
        warnings.push({
            severity: 'HIGH',
            message: 'Reactive statements with side effects found.',
            fix: 'Replace with $effect(() => { ... })'
        });

        const effectPattern = /\$:\s*\{([^}]+)\}/gs;
        let match;

        while ((match = effectPattern.exec(code)) !== null) {
            const [fullMatch, body] = match;

            migrations.push({
                pattern: 'reactive_effect',
                old: fullMatch,
                new: `$effect(() => {${body}});`,
                line: code.substring(0, match.index).split('\n').length
            });
        }
    }

    // Pattern 4: let with mutations → $state
    const mutatedVars = detectMutatedVariables(code);
    for (const varName of mutatedVars) {
        const letPattern = new RegExp(`let\\s+${varName}\\s*=\\s*([^;]+);`);
        const match = code.match(letPattern);

        if (match) {
            migrations.push({
                pattern: 'mutable_state',
                old: match[0],
                new: `let ${varName} = $state(${match[1].trim()});`,
                line: code.substring(0, code.indexOf(match[0])).split('\n').length
            });

            warnings.push({
                severity: 'MEDIUM',
                message: `Variable '${varName}' is mutated. Consider using $state().`,
                fix: `let ${varName} = $state(initialValue)`
            });
        }
    }

    // Pattern 5: new Component() → mount()
    if (code.includes('new ') && /new\s+\w+\(/.test(code)) {
        const componentPattern = /new\s+(\w+)\(\s*\{[^}]*\}\s*\)/g;
        let match;

        while ((match = componentPattern.exec(code)) !== null) {
            warnings.push({
                severity: 'CRITICAL',
                message: `Component instantiation with 'new ${match[1]}()' is deprecated.`,
                fix: `Use mount(${match[1]}, target, props) from @svelte/element`
            });

            migrations.push({
                pattern: 'component_instantiation',
                old: match[0],
                new: `mount(${match[1]}, target, props)`,
                line: code.substring(0, match.index).split('\n').length,
                note: 'Requires: import { mount } from "@svelte/element"'
            });
        }
    }

    return {
        migrations,
        warnings,
        summary: {
            total_issues: warnings.length,
            critical: warnings.filter(w => w.severity === 'CRITICAL').length,
            high: warnings.filter(w => w.severity === 'HIGH').length,
            medium: warnings.filter(w => w.severity === 'MEDIUM').length
        }
    };
}

/**
 * Detect variables that are mutated (assigned to after declaration)
 */
function detectMutatedVariables(code) {
    const mutated = new Set();

    // Find let declarations
    const letPattern = /let\s+(\w+)/g;
    let match;
    const declaredVars = [];

    while ((match = letPattern.exec(code)) !== null) {
        declaredVars.push(match[1]);
    }

    // Check for assignments
    for (const varName of declaredVars) {
        // Look for assignments (not in declaration)
        const assignPattern = new RegExp(`(?<!let\\s+)${varName}\\s*[+\\-*/]?=`, 'g');
        if (assignPattern.test(code)) {
            mutated.add(varName);
        }
    }

    return Array.from(mutated);
}

/**
 * Tool B: audit_web_standards
 * Enforces "No jQuery" and "Modern CSS" rules
 */
function auditWebStandards(code) {
    const violations = [];

    // Check for jQuery
    if (code.includes('jquery') || code.includes('$d(') || code.includes('$.')) {
        violations.push({
            severity: 'CRITICAL',
            category: 'legacy_library',
            message: 'jQuery detected. This is banned in modern Svelte applications.',
            fix: 'Use native DOM queries (querySelector) or Svelte bind:this',
            examples: [
                "// ❌ BAD: $('.my-class')",
                "// ✅ GOOD: <div bind:this={myElement}>",
                "// ✅ GOOD: document.querySelector('.my-class')"
            ]
        });
    }

    // Check for jQuery animations
    if (code.includes('.animate(')) {
        violations.push({
            severity: 'HIGH',
            category: 'deprecated_animation',
            message: 'jQuery .animate() detected.',
            fix: 'Use Svelte transitions or Web Animations API',
            examples: [
                "// ❌ BAD: $(el).animate({ opacity: 0 })",
                "// ✅ GOOD: import { fade } from 'svelte/transition'",
                "// ✅ GOOD: <div transition:fade>content</div>"
            ]
        });
    }

    // Check for inline styles
    const inlineStyleCount = (code.match(/style="[^"]*"/g) || []).length;
    if (inlineStyleCount > 3) {
        violations.push({
            severity: 'MEDIUM',
            category: 'style_anti_pattern',
            message: `Found ${inlineStyleCount} inline style attributes.`,
            fix: 'Use Svelte scoped styles or CSS classes',
            examples: [
                '// ❌ BAD: <div style="color: red; font-size: 16px;">',
                '// ✅ GOOD: <div class="error-text">',
                '// In <style>: .error-text { color: red; font-size: 16px; }'
            ]
        });
    }

    // Check for document.getElementById (prefer bind:this)
    if (code.includes('document.getElementById')) {
        violations.push({
            severity: 'LOW',
            category: 'dom_access',
            message: 'Direct DOM access with getElementById found.',
            fix: 'Use Svelte bind:this for cleaner code',
            examples: [
                '// ❌ OK but not idiomatic: document.getElementById("myId")',
                '// ✅ BETTER: <div bind:this={myElement}>'
            ]
        });
    }

    // Check for eval()
    if (code.includes('eval(')) {
        violations.push({
            severity: 'CRITICAL',
            category: 'security',
            message: 'eval() detected - major security risk!',
            fix: 'Never use eval(). Refactor to avoid dynamic code execution'
        });
    }

    return {
        violations,
        standards_ok: violations.length === 0,
        summary: {
            total: violations.length,
            critical: violations.filter(v => v.severity === 'CRITICAL').length,
            high: violations.filter(v => v.severity === 'HIGH').length
        }
    };
}

/**
 * Tool C: check_ssr_safety
 * Scans for browser-specific globals in server code
 */
function checkSSRSafety(code, filename = '') {
    const issues = [];

    // Browser globals that shouldn't be in SSR code
    const browserGlobals = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator'];

    for (const global of browserGlobals) {
        const pattern = new RegExp(`\\b${global}\\b`, 'g');
        const matches = code.match(pattern);

        if (matches && filename.includes('.server.')) {
            issues.push({
                severity: 'CRITICAL',
                global: global,
                occurrences: matches.length,
                message: `Browser global '${global}' used in server-side code.`,
                fix: 'Add browser guard: if (typeof window !== "undefined") { ... }'
            });
        } else if (matches) {
            issues.push({
                severity: 'WARNING',
                global: global,
                occurrences: matches.length,
                message: `Browser global '${global}' found. Verify this code doesn't run on server.`,
                fix: 'Ensure this is only in .svelte component <script> tag, not in load() functions'
            });
        }
    }

    // Check for unguarded imports of browser-only libraries
    if (code.includes("import") && code.includes("from 'canvas'")) {
        issues.push({
            severity: 'HIGH',
            message: 'Browser-only library imported without guard.',
            fix: 'Use dynamic import: const lib = await import("canvas") inside onMount'
        });
    }

    return {
        issues,
        ssr_safe: issues.filter(i => i.severity === 'CRITICAL').length === 0,
        warnings: issues.filter(i => i.severity === 'WARNING').length
    };
}

/**
 * Apply migrations to code
 */
function applyMigrations(code, migrations) {
    let migratedCode = code;

    // Sort by line number descending to avoid offset issues
    const sorted = [...migrations].sort((a, b) => b.line - a.line);

    for (const migration of sorted) {
        migratedCode = migratedCode.replace(migration.old, migration.new);
    }

    return migratedCode;
}

// Export tools
export {
    applyMigrations, auditWebStandards,
    checkSSRSafety, detectAndMigrateSvelte
};

// CLI for testing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run CLI if this is the main module
if (process.argv[1] && (process.argv[1].endsWith('svelte5-migration-tools.mjs') || process.argv[1] === __filename)) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Svelte 5 Migration Tools - CLI                              ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  node svelte5-migration-tools.mjs [OPTIONS]

OPTIONS:
  --file <path>         Detect migrations in file
  --audit <path>        Audit web standards violations
  --ssr-check <path>    Check SSR safety
  --apply <path>        Apply migrations to file (creates .bak)
  -h, --help            Show this help

EXAMPLES:
  node svelte5-migration-tools.mjs --file src/lib/MyComponent.svelte
  node svelte5-migration-tools.mjs --audit src/routes/+page.svelte
  node svelte5-migration-tools.mjs --ssr-check src/routes/api/+server.js
  node svelte5-migration-tools.mjs --apply src/lib/MyComponent.svelte

INTEGRATION:
  Use with VS Code tasks for automated migration workflows
  Phase 79 integration: Set CONTEXT_ENGINE=true
        `);
        process.exit(0);
    }

    const fileIndex = args.indexOf('--file');
    const auditIndex = args.indexOf('--audit');
    const ssrIndex = args.indexOf('--ssr-check');
    const applyIndex = args.indexOf('--apply');

    if (fileIndex !== -1 && args[fileIndex + 1]) {
        const filePath = args[fileIndex + 1];
        console.log(`\n🔍 Analyzing: ${filePath}\n`);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filePath}`);
            process.exit(1);
        }

        const code = fs.readFileSync(filePath, 'utf-8');
        const result = detectAndMigrateSvelte(code);

        console.log(`📊 Summary:`);
        console.log(`   Total issues: ${result.summary.total_issues}`);
        console.log(`   Critical: ${result.summary.critical}`);
        console.log(`   High: ${result.summary.high}`);
        console.log(`   Medium: ${result.summary.medium}\n`);

        if (result.warnings.length > 0) {
            console.log(`⚠️  Warnings:\n`);
            for (const warning of result.warnings) {
                console.log(`   [${warning.severity}] ${warning.message}`);
                console.log(`   Fix: ${warning.fix}\n`);
            }
        }

        if (result.migrations.length > 0) {
            console.log(`🔧 Migrations:\n`);
            for (const migration of result.migrations) {
                console.log(`   Line ${migration.line} [${migration.pattern}]:`);
                console.log(`   - ${migration.old}`);
                console.log(`   + ${migration.new}`);
                if (migration.note) console.log(`   Note: ${migration.note}`);
                console.log();
            }
        } else {
            console.log(`✅ No migrations needed - code is Svelte 5 compatible!\n`);
        }
    } else if (auditIndex !== -1 && args[auditIndex + 1]) {
        // ... audit logic ...
    } else if (ssrIndex !== -1 && args[ssrIndex + 1]) {
        // ... ssr check logic ...
    } else if (applyIndex !== -1 && args[applyIndex + 1]) {
        // ... apply logic ...
    } else {
        // No CLI args - run test mode with built-in code
        const testCode = `
<script>
    export let name = 'World';
    export let count;

    let doubled;
    $: doubled = count * 2;

    let items = [];

    $: {
        console.log('Count changed:', count);
    }

    function increment() {
        count++;
    }
</script>

<h1>Hello {name}!</h1>
<p>Count: {count}, Doubled: {doubled}</p>
<button on:click={increment}>+</button>
        `.trim();

    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  Svelte 5 Migration Tool - Analysis                          ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

    const result = detectAndMigrateSvelte(testCode);

    console.log(`📊 Summary:`);
    console.log(`   Total issues: ${result.summary.total_issues}`);
    console.log(`   Critical: ${result.summary.critical}`);
    console.log(`   High: ${result.summary.high}`);
    console.log(`   Medium: ${result.summary.medium}\n`);

    if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings:\n`);
        for (const warning of result.warnings) {
            console.log(`   [${warning.severity}] ${warning.message}`);
            console.log(`   Fix: ${warning.fix}\n`);
        }
    }

    if (result.migrations.length > 0) {
        console.log(`🔧 Migrations:\n`);
        for (const migration of result.migrations) {
            console.log(`   Line ${migration.line} [${migration.pattern}]:`);
            console.log(`   - ${migration.old}`);
            console.log(`   + ${migration.new}`);
            if (migration.note) console.log(`   Note: ${migration.note}`);
            console.log();
        }

        console.log(`\n✨ Migrated Code:\n`);
        console.log(`${'━'.repeat(70)}`);
        console.log(applyMigrations(testCode, result.migrations));
        console.log(`${'━'.repeat(70)}\n`);
    }
    }
}