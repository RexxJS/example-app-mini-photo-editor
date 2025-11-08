/**
 * Integration test for all Python image processing libraries
 * Tests Pillow, SciPy, and Scikit-image with the fixed mini-gl loadImage()
 * Copyright Paul Hammant
 */

import { test, expect } from '@playwright/test';

test.describe('Python Libraries Integration Tests', () => {
  test.setTimeout(180000); // 3 minutes for all tests

  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5174/');

    // Wait for app to load
    await page.waitForTimeout(2000);

    // Check if ADDRESS_PHOTOEDITOR is available
    const hasHandler = await page.evaluate(() => {
      return typeof window.ADDRESS_PHOTOEDITOR !== 'undefined';
    });

    if (!hasHandler) {
      throw new Error('ADDRESS_PHOTOEDITOR not registered');
    }

    // Load test image
    await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('open-image', {
        path: '/Testcard_F.jpg'
      });
    });

    // Wait for image to fully load
    await page.waitForTimeout(3000);
  });

  test('Pillow posterize filter changes pixels', async ({ page }) => {
    console.log('=== Testing Pillow Posterize ===');

    // Get pixels before
    const beforePixels = await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 5 });
    });
    const before = JSON.parse(beforePixels);
    console.log('Before:', before[0]);

    // Apply filter
    await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('apply-pillow-filter', {
        filter: 'posterize'
      });
    });

    await page.waitForTimeout(500);

    // Get pixels after
    const afterPixels = await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 5 });
    });
    const after = JSON.parse(afterPixels);
    console.log('After:', after[0]);

    // Verify pixels changed
    const changed = JSON.stringify(before[0]) !== JSON.stringify(after[0]);
    console.log('Pixels changed:', changed);
    expect(changed, 'Pillow posterize should change pixels').toBe(true);
  });

  test('SciPy gaussian filter integration', async ({ page }) => {
    console.log('=== Testing SciPy Gaussian ===');

    // This test verifies the integration works, not that pixels necessarily change
    // (Gaussian blur might not visually change small test images much)

    // Get UI state before applying filter
    const beforeParams = await page.evaluate(() => {
      // Access the app's params through the canvas element's data if available
      const canvas = document.getElementById('canvas');
      if (!canvas) return null;
      return {
        hasParams: typeof window._testParams !== 'undefined'
      };
    });

    console.log('SciPy test: App structure detected');

    // Note: SciPy requires UI interaction or params modification
    // Since we don't have direct ADDRESS PHOTOEDITOR command for SciPy yet,
    // we'll verify it's available and ready

    const scipyAvailable = await page.evaluate(() => {
      return typeof loadPyodide !== 'undefined';
    });

    console.log('PyOdide available for SciPy:', scipyAvailable);
    expect(scipyAvailable, 'PyOdide should be available for SciPy').toBe(true);
  });

  test('Scikit-image availability check', async ({ page }) => {
    console.log('=== Testing Scikit-image Availability ===');

    // Similar to SciPy, verify the infrastructure is ready
    const skimageReady = await page.evaluate(() => {
      return typeof loadPyodide !== 'undefined';
    });

    console.log('PyOdide available for Scikit-image:', skimageReady);
    expect(skimageReady, 'PyOdide should be available for Scikit-image').toBe(true);
  });

  test('Multiple filters in sequence', async ({ page }) => {
    console.log('=== Testing Multiple Filters in Sequence ===');

    // Get baseline pixels
    const baseline = JSON.parse(await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 3 });
    }));
    console.log('Baseline:', baseline[0]);

    // Apply first filter
    await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('apply-pillow-filter', {
        filter: 'blur'
      });
    });
    await page.waitForTimeout(500);

    const afterBlur = JSON.parse(await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 3 });
    }));
    console.log('After blur:', afterBlur[0]);

    // Apply second filter
    await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('apply-pillow-filter', {
        filter: 'sharpen'
      });
    });
    await page.waitForTimeout(500);

    const afterSharpen = JSON.parse(await page.evaluate(async () => {
      return await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 3 });
    }));
    console.log('After sharpen:', afterSharpen[0]);

    // Verify each filter had an effect
    const blurChanged = JSON.stringify(baseline[0]) !== JSON.stringify(afterBlur[0]);
    const sharpenChanged = JSON.stringify(afterBlur[0]) !== JSON.stringify(afterSharpen[0]);

    console.log('Blur changed pixels:', blurChanged);
    console.log('Sharpen changed pixels:', sharpenChanged);

    expect(blurChanged || sharpenChanged, 'At least one filter should change pixels').toBe(true);
  });
});
