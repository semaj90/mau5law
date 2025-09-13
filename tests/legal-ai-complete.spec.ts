/**
 * Comprehensive Legal AI System Test Suite
 * Tests all components: Evidence Board, API Integration, Worker Pool, Canvas, Timeline, RAG Chat
 */

import { test, expect } from '@playwright/test';

test.describe('Legal AI System - Complete Integration Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the demo page
    await page.goto('/demo/legal-workflow');
    await page.waitForLoadState('networkidle');
  });

  test('1. Evidence Board Demo - Full Workflow', async ({ page }) => {
    console.log('🧪 Testing Evidence Board Demo...');

    // Check initial state
    await expect(page.locator('h1')).toContainText('Legal AI Complete Workflow Demo');

    // Verify workflow steps are displayed
    const steps = page.locator('.step-card');
    await expect(steps).toHaveCount(5);

    // Check step descriptions
    await expect(page.locator('[data-step="1"]')).toContainText('Create legal case with embeddings');
    await expect(page.locator('[data-step="2"]')).toContainText('Upload multimodal evidence files');
    await expect(page.locator('[data-step="3"]')).toContainText('Position evidence on Fabric.js canvas');
    await expect(page.locator('[data-step="4"]')).toContainText('Reconstruct chronological timeline');
    await expect(page.locator('[data-step="5"]')).toContainText('RAG chat with case context');
  });

  test('2. API Integration Points - Workflow Execution', async ({ page }) => {
    console.log('🔗 Testing API Integration Points...');

    // Start the complete workflow
    const startButton = page.locator('button:has-text("Start Complete Workflow")');
    await expect(startButton).toBeVisible();

    await startButton.click();

    // Wait for workflow to start
    await expect(page.locator('button:has-text("Running Demo")')).toBeVisible();

    // Monitor step progression
    await page.waitForFunction(() => {
      const stepCards = document.querySelectorAll('.step-card');
      return Array.from(stepCards).some(card =>
        card.textContent?.includes('✅') || card.textContent?.includes('⚡')
      );
    }, { timeout: 30000 });

    console.log('✅ API workflow started successfully');
  });

  test('3. Connection Enhancements - Worker Pool Processing', async ({ page }) => {
    console.log('⚡ Testing Connection Enhancements...');

    // Start workflow and monitor worker pool activity
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for evidence upload step (step 2) which uses worker pool
    await page.waitForFunction(() => {
      const step2 = document.querySelector('[data-step="2"]');
      return step2?.textContent?.includes('✅') || step2?.textContent?.includes('⚡');
    }, { timeout: 45000 });

    // Check for evidence processing results
    const evidenceResults = page.locator('.evidence-details');
    await expect(evidenceResults).toBeVisible({ timeout: 30000 });

    console.log('✅ Worker pool processing verified');
  });

  test('4. New Case Workflow - Complete Lifecycle', async ({ page }) => {
    console.log('📋 Testing New Case Workflow...');

    // Customize chat query
    const chatInput = page.locator('#chat-query');
    await chatInput.fill('Analyze the digital evidence for timeline inconsistencies');

    // Start complete workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for all 5 steps to complete
    await page.waitForFunction(() => {
      const completedSteps = document.querySelectorAll('.step-card .title:has-text("✅")');
      return completedSteps.length === 5;
    }, { timeout: 120000 }); // 2 minutes for full workflow

    // Verify final summary appears
    await expect(page.locator('.demo-summary')).toBeVisible();
    await expect(page.locator('.demo-summary')).toContainText('Workflow Demo Complete');

    // Check all components were tested
    await expect(page.locator('.demo-summary')).toContainText('Case creation with embedded metadata');
    await expect(page.locator('.demo-summary')).toContainText('Multimodal evidence processing');
    await expect(page.locator('.demo-summary')).toContainText('Fabric.js canvas positioning');
    await expect(page.locator('.demo-summary')).toContainText('Timeline reconstruction');
    await expect(page.locator('.demo-summary')).toContainText('RAG chat with case context');

    console.log('✅ Complete case workflow verified');
  });

  test('5. Canvas Integration - Fabric.js Evidence Positioning', async ({ page }) => {
    console.log('🎨 Testing Canvas Integration...');

    // Start workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for canvas positioning step (step 3)
    await page.waitForFunction(() => {
      const step3 = document.querySelector('[data-step="3"]');
      return step3?.textContent?.includes('✅');
    }, { timeout: 60000 });

    // Verify canvas positioning results
    const step3Card = page.locator('[data-step="3"]');
    await expect(step3Card).toContainText('COMPLETED');

    console.log('✅ Canvas positioning verified');
  });

  test('6. Timeline Reconstruction - Chronological Evidence', async ({ page }) => {
    console.log('⏱️ Testing Timeline Reconstruction...');

    // Start workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for timeline generation (step 4)
    await page.waitForFunction(() => {
      const step4 = document.querySelector('[data-step="4"]');
      return step4?.textContent?.includes('✅');
    }, { timeout: 80000 });

    // Check timeline details
    const timelineDetails = page.locator('.timeline-details');
    await expect(timelineDetails).toBeVisible();
    await expect(timelineDetails).toContainText('Timeline Events');

    console.log('✅ Timeline reconstruction verified');
  });

  test('7. RAG Chat Integration - AI-Powered Analysis', async ({ page }) => {
    console.log('💬 Testing RAG Chat Integration...');

    // Customize query before starting
    await page.locator('#chat-query').fill('What are the key pieces of digital evidence?');

    // Start workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for RAG chat step (step 5)
    await page.waitForFunction(() => {
      const step5 = document.querySelector('[data-step="5"]');
      return step5?.textContent?.includes('✅');
    }, { timeout: 100000 });

    // Verify chat response
    const chatDetails = page.locator('.chat-details');
    await expect(chatDetails).toBeVisible();
    await expect(chatDetails).toContainText('AI Response');
    await expect(chatDetails).toContainText('What are the key pieces of digital evidence?');

    console.log('✅ RAG chat integration verified');
  });

  test('8. Error Handling - Workflow Resilience', async ({ page }) => {
    console.log('🛡️ Testing Error Handling...');

    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Start workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for completion or errors
    await page.waitForFunction(() => {
      const summary = document.querySelector('.demo-summary');
      const errorSteps = document.querySelectorAll('.step-card .title:has-text("❌")');
      return summary || errorSteps.length > 0;
    }, { timeout: 120000 });

    // Check if workflow completed successfully or failed gracefully
    const hasErrors = await page.locator('.step-card .title:has-text("❌")').count() > 0;
    const hasSuccess = await page.locator('.demo-summary').isVisible();

    if (hasErrors) {
      console.log('⚠️ Some steps failed, but errors were handled gracefully');
      // Verify error display
      const errorSteps = page.locator('.step-error');
      await expect(errorSteps.first()).toBeVisible();
    } else if (hasSuccess) {
      console.log('✅ Workflow completed successfully without errors');
    }

    // Should not have unhandled console errors
    expect(consoleErrors.filter(err => !err.includes('Failed to load'))).toHaveLength(0);
  });

  test('9. Performance - Workflow Timing', async ({ page }) => {
    console.log('⚡ Testing Performance...');

    const startTime = Date.now();

    // Start workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for completion
    await page.waitForFunction(() => {
      const summary = document.querySelector('.demo-summary');
      return summary !== null;
    }, { timeout: 180000 }); // 3 minutes max

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log(`⏱️ Total workflow duration: ${totalDuration}ms`);

    // Verify individual step durations are displayed
    const stepCards = page.locator('.step-card');
    for (let i = 0; i < 5; i++) {
      const card = stepCards.nth(i);
      await expect(card).toContainText('Duration:');
    }

    // Performance should be reasonable (under 3 minutes)
    expect(totalDuration).toBeLessThan(180000);

    console.log('✅ Performance test completed');
  });

  test('10. Production Readiness - Component Integration', async ({ page }) => {
    console.log('🚀 Testing Production Readiness...');

    // Start workflow
    await page.locator('button:has-text("Start Complete Workflow")').click();

    // Wait for completion
    await page.waitForFunction(() => {
      return document.querySelector('.demo-summary') !== null;
    }, { timeout: 120000 });

    // Verify all production components are confirmed
    const summary = page.locator('.demo-summary');
    await expect(summary).toContainText('Production-ready legal case management system');

    // Check each component verification
    const checkmarks = [
      'Case creation with embedded metadata',
      'Multimodal evidence processing',
      'Fabric.js canvas positioning',
      'Timeline reconstruction',
      'RAG chat with case context'
    ];

    for (const check of checkmarks) {
      await expect(summary).toContainText(check);
    }

    console.log('✅ Production readiness verified');
  });
});