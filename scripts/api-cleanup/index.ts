import { CleanupPipeline } from './pipeline';

/**
 * Main entry point for API cleanup tool
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  const pipeline = new CleanupPipeline({
    apiDir: 'sveltekit-frontend/src/routes/api',
    outputDir: 'scripts/api-cleanup/reports',
    buildPath: 'sveltekit-frontend',
    buildCommand: 'npm run build',
    createBackup: true,
    runBuild: true,
    exportFormats: ['json', 'markdown'],
  });

  switch (command) {
    case 'run':
      await pipeline.run();
      break;

    case 'scan-only':
      console.log('Running scan only...');
      const scanPipeline = new CleanupPipeline({
        ...pipeline.getConfig(),
        runBuild: false,
      });
      await scanPipeline.run();
      break;

    case 'help':
      console.log(`
API Route Cleanup Tool

Usage: npm run cleanup:scan [command]

Commands:
  run          Run full cleanup pipeline (default)
  scan-only    Run scan and categorization only
  help         Show this help message

Options:
  --no-backup  Skip creating backup
  --no-build   Skip build validation
  --core-only  Only process core routes
  --experimental-only  Only process experimental routes

Examples:
  npm run cleanup:scan
  npm run cleanup:scan scan-only
  npm run cleanup:scan help
      `);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "npm run cleanup:scan help" for usage information');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
