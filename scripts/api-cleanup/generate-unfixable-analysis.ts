import fs from 'fs';
import path from 'path';
import { UnfixableRoutesAnalyzer } from './unfixable-routes-analyzer';

/**
 * Generate comprehensive analysis of unfixable routes
 * Identifies which ones are needed and attempts recovery
 */

async function main() {
  console.log('\n🔍 Unfixable Routes Analysis & Recovery\n');
  console.log('═'.repeat(80));

  const analyzer = new UnfixableRoutesAnalyzer('sveltekit-frontend/src/routes/api');

  // Get list of disabled routes from cleanup reports
  const reportsDir = 'scripts/api-cleanup/reports';
  const disableLogPath = path.join(reportsDir, 'disable-log.json');

  if (!fs.existsSync(disableLogPath)) {
    console.log('❌ Disable log not found. Run cleanup pipeline first:');
    console.log('   npm run cleanup:scan\n');
    process.exit(1);
  }

  // Read disable log
  const disableLog = JSON.parse(fs.readFileSync(disableLogPath, 'utf-8'));
  const disabledRoutes = disableLog.disables
    .filter((d: any) => d.status === 'success')
    .map((d: any) => d.filePath);

  console.log(`📊 Found ${disabledRoutes.length} disabled routes\n`);

  // Analyze routes
  const result = analyzer.analyzeUnfixableRoutes(disabledRoutes);

  // Export results
  const resultsPath = path.join(reportsDir, 'unfixable-analysis.json');
  analyzer.exportResults(resultsPath, result);

  // Generate recovery guide
  const guide = analyzer.generateRecoveryGuide(result);
  const guidePath = path.join(reportsDir, 'unfixable-recovery-guide.md');
  fs.writeFileSync(guidePath, guide, 'utf-8');

  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📋 ANALYSIS SUMMARY\n');

  console.log(`Total Unfixable Routes: ${result.totalUnfixable}`);
  console.log(`  • Needed (Core): ${result.neededRoutes.length}`);
  console.log(`  • Not Needed: ${result.notNeededRoutes.length}\n`);

  console.log(`Recovery Attempts: ${result.recoveryAttempts.total}`);
  console.log(`  • Successful: ${result.recoveryAttempts.successful}`);
  console.log(`  • Failed: ${result.recoveryAttempts.failed}\n`);

  console.log('Recommendations:');
  for (const rec of result.recommendations) {
    console.log(`  ${rec}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📁 Output Files:');
  console.log(`  • Analysis: ${resultsPath}`);
  console.log(`  • Recovery Guide: ${guidePath}\n`);

  // Print needed routes that still need fixes
  const needsManualFix = result.neededRoutes.filter((r) => !r.recoverySuccess);
  if (needsManualFix.length > 0) {
    console.log(`\n⚠️  Routes Needing Manual Fixes (${needsManualFix.length}):\n`);
    for (const route of needsManualFix.slice(0, 20)) {
      console.log(`  • ${route.path}`);
    }
    if (needsManualFix.length > 20) {
      console.log(`  ... and ${needsManualFix.length - 20} more\n`);
    }
  }

  // Print recovery successes
  const recovered = result.neededRoutes.filter((r) => r.recoverySuccess);
  if (recovered.length > 0) {
    console.log(`\n✅ Successfully Recovered Routes (${recovered.length}):\n`);
    for (const route of recovered.slice(0, 20)) {
      console.log(`  • ${route.path} (${route.recoveryStrategy})`);
    }
    if (recovered.length > 20) {
      console.log(`  ... and ${recovered.length - 20} more\n`);
    }
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
