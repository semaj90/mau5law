import { describe, it, expect } from 'vitest'
import { setupTest, cleanupTest } from '$lib/test-utils/setup';;

describe('DiffApplier', () => {
  beforeEach(async () => {
    await setupTest();
  });

  afterEach(async () => {
    await cleanupTest();
  });

 it('TODO: add file-system harness test (temp dir) verifying hash mismatch blocks apply', () => {
 expect(true).toBe(true);
 });
});
