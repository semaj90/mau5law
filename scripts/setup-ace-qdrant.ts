#!/usr/bin/env tsx
/**
 * Setup script for ACE Qdrant Collection
 * Creates the ace_chunks collection if it doesn't exist
 * Usage: npm run ace:setup-qdrant
 */

import { QdrantService } from '../sveltekit-frontend/src/lib/services/ace-web/qdrant-service';

async function main() {
  console.log('========================================');
  console.log('ACE Qdrant Collection Setup');
  console.log('========================================\n');

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  console.log(`Qdrant URL: ${qdrantUrl}\n`);

  try {
    // Create service instance
    const qdrantService = new QdrantService(qdrantUrl);

    // Ensure collection exists
    console.log('Creating collection if it doesn\'t exist...');
    await qdrantService.ensureCollection();

    // Get collection info
    console.log('\nFetching collection info...');
    const info = await qdrantService.getCollectionInfo();

    console.log('\n✓ Collection setup complete!');
    console.log('\nCollection details:');
    console.log(`  - Name: ace_chunks`);
    console.log(`  - Vector size: ${info.config?.params?.vectors?.size || 384}`);
    console.log(`  - Distance: ${info.config?.params?.vectors?.distance || 'Cosine'}`);
    console.log(`  - Points count: ${info.points_count || 0}`);
    console.log(`  - Status: ${info.status || 'ready'}`);

    console.log('\n========================================');
    console.log('Setup Complete');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('  1. Verify setup: npm run ace:verify-qdrant');
    console.log('  2. Test ingestion: npm run ace:test-ingest');
    console.log('  3. Test search: npm run ace:test-search\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Setup failed:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Qdrant is running: docker-compose up -d qdrant');
    console.error('  2. Check Qdrant URL: echo $QDRANT_URL');
    console.error('  3. Test connection: curl http://localhost:6333/collections\n');
    process.exit(1);
  }
}

main();
