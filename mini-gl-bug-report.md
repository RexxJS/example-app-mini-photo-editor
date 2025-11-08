<!--
Copyright Paul Hammant
-->

# Bug Report for mini-gl

## `loadImage()` ignores ImageData parameter and reloads original image instead

**Version**: @xdadda/mini-gl@0.1.14

**Repository**: https://github.com/xdadda/mini-gl

### Description

When calling `loadImage(imageData)` with an ImageData object parameter, the function appears to ignore the provided data and reload the original image texture instead. This prevents using `loadImage()` to replace the current texture with processed pixel data.

### Expected Behavior

```javascript
const processedData = new ImageData(modifiedPixels, width, height);
_minigl.loadImage(processedData);  // Should load the modified pixel data
_minigl.paintCanvas();
const pixels = _minigl.readPixels(); // Should return the modified pixels
```

### Actual Behavior

```javascript
const processedData = new ImageData(modifiedPixels, width, height);
_minigl.loadImage(processedData);  // Appears to ignore processedData
_minigl.paintCanvas();
const pixels = _minigl.readPixels(); // Returns original image pixels instead
```

### Reproduction Steps

1. Initialize mini-gl with an image:
```javascript
const img = new Image();
img.src = 'test-image.jpg';
await img.decode();
const gl = minigl(canvasElement, img, 'srgb');
```

2. Read the current pixels:
```javascript
gl.paintCanvas();
const originalPixels = gl.readPixels();
const originalData = new ImageData(new Uint8ClampedArray(originalPixels), gl.width, gl.height);
```

3. Modify the pixel data (e.g., convert to black):
```javascript
const modifiedData = new ImageData(gl.width, gl.height);
for (let i = 0; i < modifiedData.data.length; i += 4) {
  modifiedData.data[i] = 0;     // R
  modifiedData.data[i+1] = 0;   // G
  modifiedData.data[i+2] = 0;   // B
  modifiedData.data[i+3] = 255; // A
}
```

4. Try to load the modified data:
```javascript
gl.loadImage(modifiedData);  // Should replace texture with black image
gl.paintCanvas();
const resultPixels = gl.readPixels();
```

5. Check the result:
```javascript
// Expected: resultPixels should be all [0,0,0,255]
// Actual: resultPixels still contains original image data
console.log(resultPixels.slice(0, 4)); // Shows original pixel values, not [0,0,0,255]
```

### Evidence from Real-World Usage

In the mini-photo-editor app, when applying Pillow filters via PyOdide:

```javascript
// Pillow successfully processes image - logs confirm:
console.log('✅ Got processed data - center pixel:', [0, 0, 0, 255])  // ✅ Pillow returned black

// But after loadImage():
_minigl.loadImage(processedData);
_minigl.paintCanvas();
const verify = _minigl.readPixels();
console.log('🔍 Verification - center pixel:', [49, 51, 50, 255])  // ❌ Still original pixel!
```

**Console output from actual test run:**
```
Browser: ✅ Got processed data: 365 x 273 first pixel: [192, 192, 192, 255]
Browser: ✅ Got processed data - center pixel: [0, 0, 0, 255]
Browser: 🔄 About to call loadImage with processed data...
Browser: 🖼️ Image replaced after posterize
Browser: 🔍 Verification read after loadImage - first pixel: [213, 213, 211, 255]
Browser: 🔍 Verification read after loadImage - center pixel: [49, 51, 50, 255]
```

Notice:
- Processed data center pixel: `[0, 0, 0, 255]` (correct - posterized to black)
- After `loadImage()` center pixel: `[49, 51, 50, 255]` (incorrect - still original image)

### Additional Context

- This works correctly in the same codebase for the heal/inpaint feature (line 418 in app.js of mini-photo-editor):
  ```javascript
  const newimgdata = new ImageData(new Uint8ClampedArray(data.buffer), w, h)
  _minigl.loadImage(newimgdata)  // This works!
  ```
- The heal feature uses the same `_minigl.loadImage(newimgdata)` call successfully
- Difference might be related to when/how loadImage is called or what other operations happen before/after
- The issue only manifests when trying to replace the entire image texture with processed data
- First pixel (top-left corner) DOES change, but center pixels do not - suggesting partial texture update?

### Questions

1. Is `loadImage(imageData)` the correct method to replace the texture with processed pixel data?
2. Is there a different method that should be used instead?
3. Does `loadImage()` have a flag or option to force it to use the provided ImageData instead of the original image source?
4. Why would corner pixels update but center pixels remain unchanged?

### Workaround Needed

Need a way to reliably replace the current texture with ImageData, or clarification on the correct API to use for this purpose.

### Environment

- Browser: Chromium (via Playwright)
- mini-gl version: 0.1.14
- Context: WebGL2
- Image size: 365x273 pixels
- Color space: sRGB
