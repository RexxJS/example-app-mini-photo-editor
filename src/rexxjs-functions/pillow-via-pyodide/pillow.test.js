/**
 * Copyright Paul Hammant
 *
 * Jest test for Pillow posterize function
 * Tests that posterize actually changes pixel data
 */

import { loadPyodide } from 'pyodide';

describe('Pillow posterize filter', () => {
  let pyodide;

  beforeAll(async () => {
    // Load PyOdide and Pillow
    pyodide = await loadPyodide();
    await pyodide.loadPackage(['Pillow', 'numpy']);

    // Import required modules
    await pyodide.runPythonAsync(`
from PIL import Image, ImageOps
import numpy as np
    `);
  }, 60000); // 60 second timeout for PyOdide loading

  test('posterize should change pixel values', async () => {
    // Create a simple test image with known pixel values
    const width = 4;
    const height = 4;
    const testData = new Uint8ClampedArray(width * height * 4);

    // Fill with varying grayscale values
    for (let i = 0; i < width * height; i++) {
      testData[i * 4] = (i * 16) % 256;       // R
      testData[i * 4 + 1] = (i * 16) % 256;   // G
      testData[i * 4 + 2] = (i * 16) % 256;   // B
      testData[i * 4 + 3] = 255;              // A
    }

    console.log('Original pixel data (first 4 pixels):');
    for (let i = 0; i < 4; i++) {
      console.log(`  Pixel ${i}: [${testData[i*4]}, ${testData[i*4+1]}, ${testData[i*4+2]}, ${testData[i*4+3]}]`);
    }

    // Convert to Python
    pyodide.globals.set('img_width', width);
    pyodide.globals.set('img_height', height);
    pyodide.globals.set('img_data', Array.from(testData));

    await pyodide.runPythonAsync(`
# Convert to numpy array and PIL Image
img_array = np.array(img_data, dtype=np.uint8).reshape((img_height, img_width, 4))
pil_image = Image.fromarray(img_array, mode='RGBA')

# Convert RGBA to RGB for posterize
rgb = Image.new('RGB', pil_image.size, (255, 255, 255))
rgb.paste(pil_image, mask=pil_image.split()[3])

# Apply posterize with 2 bits
posterized = ImageOps.posterize(rgb, 2)

# Convert back to RGBA
posterized = posterized.convert('RGBA')

# Convert back to array
result_array = np.array(posterized)
result_data = result_array.flatten().tolist()
    `);

    // Get result
    const resultData = pyodide.globals.get('result_data').toJs();
    const resultArray = new Uint8ClampedArray(resultData);

    console.log('\\nPosterized pixel data (first 4 pixels):');
    for (let i = 0; i < 4; i++) {
      console.log(`  Pixel ${i}: [${resultArray[i*4]}, ${resultArray[i*4+1]}, ${resultArray[i*4+2]}, ${resultArray[i*4+3]}]`);
    }

    // Check that pixels changed
    let pixelsChanged = 0;
    let pixelsSame = 0;

    for (let i = 0; i < width * height; i++) {
      const origR = testData[i * 4];
      const origG = testData[i * 4 + 1];
      const origB = testData[i * 4 + 2];

      const newR = resultArray[i * 4];
      const newG = resultArray[i * 4 + 1];
      const newB = resultArray[i * 4 + 2];

      if (origR !== newR || origG !== newG || origB !== newB) {
        pixelsChanged++;
      } else {
        pixelsSame++;
      }
    }

    console.log(`\\nPixels changed: ${pixelsChanged}/${width * height}`);
    console.log(`Pixels unchanged: ${pixelsSame}/${width * height}`);

    // Posterize should change at least some pixels
    expect(pixelsChanged).toBeGreaterThan(0);

    // Check specific expected values for posterize with 2 bits
    // With 2 bits, values should be quantized to: 0, 85, 170, 255
    // Original values: 0, 16, 32, 48, 64, 80, 96, 112...
    // Should become:   0, 0,  0,  0,  85, 85, 85, 85...

    // Pixel 0: (0,0,0) should stay (0,0,0)
    expect(resultArray[0]).toBe(0);
    expect(resultArray[1]).toBe(0);
    expect(resultArray[2]).toBe(0);

    // Pixel 4: (64,64,64) should become (85,85,85)
    expect(resultArray[16]).toBe(85);
    expect(resultArray[17]).toBe(85);
    expect(resultArray[18]).toBe(85);
  }, 30000); // 30 second timeout
});
