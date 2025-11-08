/**
 * Debug test for Pillow posterize filter rendering issue
 * Copyright Paul Hammant
 */

import { test, expect } from '@playwright/test';

test('debug pillow posterize filter', async ({ page }) => {
  test.setTimeout(120000);

  // Navigate to app
  await page.goto('http://localhost:5174/');

  // Wait for app to load
  await page.waitForTimeout(2000);

  // Check if ADDRESS_PHOTOEDITOR is available
  const hasHandler = await page.evaluate(() => {
    return typeof window.ADDRESS_PHOTOEDITOR !== 'undefined';
  });

  console.log('ADDRESS_PHOTOEDITOR available:', hasHandler);

  if (!hasHandler) {
    throw new Error('ADDRESS_PHOTOEDITOR not registered');
  }

  // 1. Load test image
  console.log('Loading test image...');
  const loadResult = await page.evaluate(async () => {
    return await window.ADDRESS_PHOTOEDITOR.run('open-image', {
      path: '/Testcard_F.jpg'
    });
  });
  console.log('Load result:', loadResult);

  // Wait for image to load
  await page.waitForTimeout(3000);

  // 2. Get pixels BEFORE filter
  console.log('Getting pixels BEFORE filter...');
  const beforePixels = await page.evaluate(async () => {
    return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 10 });
  });
  console.log('Before pixels:', beforePixels);

  // 3. Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    // Log all console messages from the browser
    console.log(`  Browser: ${text}`);
  });

  // 4. Apply posterize filter
  console.log('Applying posterize filter...');
  const filterResult = await page.evaluate(async () => {
    return await window.ADDRESS_PHOTOEDITOR.run('apply-pillow-filter', {
      filter: 'posterize'
    });
  });
  console.log('Filter result:', filterResult);

  // 5. Read pixels IMMEDIATELY after filter (no wait)
  console.log('Getting pixels IMMEDIATELY after filter...');
  const immediatePixels = await page.evaluate(async () => {
    return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 10 });
  });
  console.log('Immediate pixels:', immediatePixels);

  // Wait for filter to process
  await page.waitForTimeout(5000);

  // 6. Get pixels AFTER waiting
  console.log('Getting pixels AFTER 5 second wait...');
  const afterPixels = await page.evaluate(async () => {
    return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 10 });
  });
  console.log('After wait pixels:', afterPixels);

  // 5. Compare pixels
  const before = JSON.parse(beforePixels);
  const after = JSON.parse(afterPixels);

  console.log('\n=== Pixel Comparison ===');
  console.log('First pixel BEFORE:', before[0]);
  console.log('First pixel AFTER: ', after[0]);

  const changed = JSON.stringify(before[0]) !== JSON.stringify(after[0]);
  console.log('Pixels changed:', changed);

  // 6. Get debug log
  const debugLog = await page.evaluate(async () => {
    return await window.ADDRESS_PHOTOEDITOR.run('get-debug-log', {});
  });
  console.log('\n=== Debug Log ===');
  console.log(debugLog);

  // 7. Get canvas screenshot
  const canvas = await page.locator('#canvas');
  await canvas.screenshot({ path: 'tests/screenshots/pillow-posterize-result.png' });
  console.log('Screenshot saved to tests/screenshots/pillow-posterize-result.png');

  // 8. Extract and analyze the canvas data
  const canvasAnalysis = await page.evaluate(() => {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) return { error: 'No WebGL context' };

    // Read pixels directly from WebGL
    const width = canvas.width;
    const height = canvas.height;
    const pixels = new Uint8Array(100 * 4); // Sample first 100 pixels

    gl.readPixels(0, 0, 100, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Get first 5 pixels
    const sample = [];
    for (let i = 0; i < 5; i++) {
      sample.push([
        pixels[i * 4],
        pixels[i * 4 + 1],
        pixels[i * 4 + 2],
        pixels[i * 4 + 3]
      ]);
    }

    return {
      width,
      height,
      firstPixels: sample
    };
  });

  console.log('\n=== Direct WebGL Canvas Analysis ===');
  console.log('Canvas size:', canvasAnalysis.width, 'x', canvasAnalysis.height);
  console.log('Direct WebGL pixels:', canvasAnalysis.firstPixels);

  // Summary
  console.log('\n=== Test Summary ===');
  console.log('✅ Image loaded successfully');
  console.log(`${changed ? '✅' : '❌'} Pixels ${changed ? 'CHANGED' : 'DID NOT CHANGE'} after filter`);
  console.log('📸 Screenshot saved for visual inspection');

  // Assert that pixels changed
  expect(changed, 'Pixels should change after applying posterize filter').toBe(true);
});
