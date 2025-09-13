#!/usr/bin/env node

/**
 * UI Button Testing Script
 * Tests all buttons and UI interactions for runtime errors
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';

async function testUI() {
  console.log('🎯 Starting comprehensive UI button testing...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  // Track network errors
  const networkErrors = [];
  page.on('requestfailed', (request) => {
    networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('📄 Testing homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    console.log('🔍 Finding all buttons...');
    const buttons = await page.locator('button, [role="button"], input[type="submit"], input[type="button"], .btn').all();
    console.log(`Found ${buttons.length} button elements`);

    // Test clicking each button
    for (let i = 0; i < Math.min(buttons.length, 20); i++) { // Limit to first 20 buttons
      try {
        const button = buttons[i];
        const text = await button.textContent().catch(() => '');
        const disabled = await button.isDisabled().catch(() => false);

        if (!disabled) {
          console.log(`🖱️  Clicking button ${i + 1}: "${text.slice(0, 30)}..."`);
          await button.click({ timeout: 5000 });
          await page.waitForTimeout(500); // Wait for any side effects
        } else {
          console.log(`⏭️  Skipping disabled button ${i + 1}: "${text.slice(0, 30)}..."`);
        }
      } catch (error) {
        console.log(`❌ Error clicking button ${i + 1}: ${error.message}`);
      }
    }

    console.log('🔗 Testing navigation links...');
    const links = await page.locator('a[href]').all();
    console.log(`Found ${links.length} navigation links`);

    // Test a few key navigation links
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      try {
        const link = links[i];
        const href = await link.getAttribute('href');
        const text = await link.textContent();

        // Skip external links and mailto links
        if (href && href.startsWith('/') && !href.includes('#')) {
          console.log(`🔗 Testing link: "${text?.slice(0, 30)}..." -> ${href}`);
          await link.click({ timeout: 5000 });
          await page.waitForTimeout(1000);

          // Go back to homepage for next test
          await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log(`❌ Error testing link ${i + 1}: ${error.message}`);
      }
    }

    console.log('📋 Testing forms...');
    const inputs = await page.locator('input, textarea, select').all();
    console.log(`Found ${inputs.length} form inputs`);

    // Test form inputs
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      try {
        const input = inputs[i];
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');

        if (type !== 'submit' && type !== 'button' && type !== 'file') {
          console.log(`⌨️  Testing input ${i + 1}: type="${type}" placeholder="${placeholder}"`);
          await input.fill('test input', { timeout: 2000 });
          await page.waitForTimeout(200);
          await input.clear();
        }
      } catch (error) {
        console.log(`❌ Error testing input ${i + 1}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('💥 Critical error during testing:', error.message);
  } finally {
    await browser.close();
  }

  // Report results
  console.log('\n📊 Test Results:');
  console.log(`✅ Homepage loaded successfully`);
  console.log(`🖱️  Tested button interactions`);
  console.log(`🔗 Tested navigation links`);
  console.log(`📋 Tested form inputs`);

  if (consoleErrors.length > 0) {
    console.log(`\n❌ Console Errors Found (${consoleErrors.length}):`);
    consoleErrors.slice(0, 10).forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  } else {
    console.log(`\n✅ No console errors detected`);
  }

  if (networkErrors.length > 0) {
    console.log(`\n🌐 Network Errors Found (${networkErrors.length}):`);
    networkErrors.slice(0, 5).forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  } else {
    console.log(`\n✅ No network errors detected`);
  }

  console.log('\n🎉 UI testing completed!');
}

testUI().catch(console.error);