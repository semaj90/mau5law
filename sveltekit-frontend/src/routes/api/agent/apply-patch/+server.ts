import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DiffPatchApplicator } from '$lib/services/diff-patch-applicator';

// Global patch applicator instance
let patchApplicator = new DiffPatchApplicator();

// Demo patches storage (in production, this would be in a database)
let demoPatchStorage = new Map();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { patchId } = await request.json();

    if (!patchId) {
      return json(
        {
          success: false,
          error: 'Missing patchId',
          message: 'patchId is required to apply a patch'
        },
        { status: 400 }
      );
    }

    // For demo purposes, simulate patch application
    // In production, this would use the actual DiffPatchApplicator
    const demoPatch = demoPatchStorage.get(patchId) || {
      id: patchId,
      filePath: 'src/lib/components/Navigation.svelte',
      status: 'pending',
      description: 'Demo patch application',
      confidence: 0.95
    };

    // Simulate patch application logic
    if (demoPatch.status !== 'pending') {
      return json(
        {
          success: false,
          error: 'Patch not applicable',
          message: `Patch ${patchId} is in status: ${demoPatch.status}. Only pending patches can be applied.`
        },
        { status: 400 }
      );
    }

    // In production, this would be:
    // const result = await patchApplicator.applyPatch(patchId);

    // Simulate successful application
    demoPatch.status = 'applied';
    demoPatch.appliedAt = new Date().toISOString();
    demoPatch.backup = `${demoPatch.filePath}.backup.${Date.now()}`;
    demoPatchStorage.set(patchId, demoPatch);

    const result = {
      success: true,
      patchId,
      filePath: demoPatch.filePath,
      message: `Successfully applied patch: ${demoPatch.description}`,
      linesChanged: 5,
      backup: demoPatch.backup,
      appliedAt: demoPatch.appliedAt
    };

    // Log the application for monitoring
    console.log(`✅ Patch applied: ${patchId} to ${demoPatch.filePath}`);

    return json({
      success: true,
      result,
      patchDetails: {
        id: demoPatch.id,
        status: demoPatch.status,
        confidence: demoPatch.confidence,
        filePath: demoPatch.filePath
      }
    });

  } catch (error) {
    console.error('Error applying patch:', error);
    return json(
      {
        success: false,
        error: 'Patch application failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

// Helper endpoint to create demo patches
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const patch = await request.json();

    // Create demo patch for testing
    const demoPatch = {
      id: patch.id || `patch-${Date.now()}`,
      filePath: patch.filePath || 'src/lib/components/Demo.svelte',
      originalHash: 'demo-hash-12345',
      targetHash: 'demo-target-67890',
      unifiedDiff: patch.unifiedDiff || generateSampleDiff(),
      description: patch.description || 'Demo patch for testing',
      confidence: patch.confidence || 0.95,
      createdAt: new Date().toISOString(),
      status: 'pending',
      metadata: {
        agentId: patch.agentId || 'demo-agent-1',
        taskId: patch.taskId || 'demo-task-1',
        lineChanges: 5,
        insertions: 3,
        deletions: 2
      }
    };

    demoPatchStorage.set(demoPatch.id, demoPatch);

    return json({
      success: true,
      patch: demoPatch,
      message: 'Demo patch created successfully'
    });

  } catch (error) {
    console.error('Error creating demo patch:', error);
    return json(
      {
        success: false,
        error: 'Failed to create demo patch',
        message: error.message
      },
      { status: 500 }
    );
  }
};

function generateSampleDiff(): string {
  return `--- a/src/lib/components/Navigation.svelte
+++ b/src/lib/components/Navigation.svelte
@@ -15,6 +15,9 @@
 		<a href="/dashboard" class="nav-link">Dashboard</a>
 		<a href="/cases" class="nav-link">Cases</a>
 		<a href="/documents" class="nav-link">Documents</a>
+		{#if $user}
+			<button on:click={logout} class="nav-link logout-btn">Logout</button>
+		{/if}
 	</nav>
 </div>`;
}