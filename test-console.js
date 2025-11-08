/**
 * Paste this script into the browser console at http://localhost:5174/
 * to test the Pillow filter functionality
 * Copyright Paul Hammant
 */

async function testPillowFilter() {
    console.log('=== Pillow Filter Test ===\n');

    // Check if ADDRESS_PHOTOEDITOR is available
    if (!window.ADDRESS_PHOTOEDITOR) {
        console.error('❌ ADDRESS_PHOTOEDITOR not found!');
        console.log('Make sure the photo editor app is loaded.');
        return;
    }
    console.log('✅ ADDRESS_PHOTOEDITOR found\n');

    try {
        // 1. Check PyOdide status
        console.log('1️⃣ Checking PyOdide status...');
        const status = await window.ADDRESS_PHOTOEDITOR.run('check-pyodide', {});
        console.log('   Status:', status);
        console.log('');

        // 2. Open test image
        console.log('2️⃣ Opening test image...');
        const openResult = await window.ADDRESS_PHOTOEDITOR.run('open-image', {
            path: '/Testcard_F.jpg'
        });
        console.log('   Result:', openResult);
        console.log('');

        // Wait for image to load and render
        console.log('⏳ Waiting 2 seconds for image to load...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Get canvas pixels BEFORE filter
        console.log('3️⃣ Getting canvas pixels BEFORE filter...');
        const before = await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 10 });
        console.log('   Before:', before);
        console.log('');

        // 4. Apply posterize filter
        console.log('4️⃣ Applying posterize filter...');
        const filterResult = await window.ADDRESS_PHOTOEDITOR.run('apply-pillow-filter', {
            filter: 'posterize'
        });
        console.log('   Result:', filterResult);
        console.log('');

        // Wait for filter to process
        console.log('⏳ Waiting 3 seconds for filter to process...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Get canvas pixels AFTER filter
        console.log('5️⃣ Getting canvas pixels AFTER filter...');
        const after = await window.ADDRESS_PHOTOEDITOR.run('get-canvas-data', { sample: 10 });
        console.log('   After:', after);
        console.log('');

        // 6. Compare pixels
        console.log('6️⃣ Comparing pixels...');
        const beforePixels = JSON.parse(before);
        const afterPixels = JSON.parse(after);
        console.log('   First pixel before:', beforePixels[0]);
        console.log('   First pixel after: ', afterPixels[0]);

        const changed = JSON.stringify(beforePixels[0]) !== JSON.stringify(afterPixels[0]);
        if (changed) {
            console.log('   ✅ Pixels CHANGED - Filter had effect!');
        } else {
            console.log('   ❌ Pixels UNCHANGED - Filter had NO effect!');
        }
        console.log('');

        // 7. Get canvas as base64 image
        console.log('7️⃣ Getting canvas as base64 image...');
        const dataUrl = await window.ADDRESS_PHOTOEDITOR.run('get-canvas', {});
        console.log('   Data URL length:', dataUrl.length, 'bytes');
        console.log('   First 100 chars:', dataUrl.substring(0, 100));
        console.log('');

        // Display image in new window
        console.log('8️⃣ Opening canvas in new window...');
        const win = window.open('', 'Canvas Preview', 'width=800,height=600');
        win.document.write(`
            <html>
            <head><title>Canvas Preview</title></head>
            <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;">
                <img src="${dataUrl}" style="max-width:100%;max-height:100vh;">
            </body>
            </html>
        `);
        console.log('   ✅ Preview window opened');
        console.log('');

        // 9. Get debug log
        console.log('9️⃣ Getting debug log...');
        const debugLog = await window.ADDRESS_PHOTOEDITOR.run('get-debug-log', {});
        console.log('=== Debug Log ===');
        console.log(debugLog);
        console.log('');

        console.log('=== ✅ Test Complete ===');

        // Return summary
        return {
            pixelsChanged: changed,
            beforePixels: beforePixels[0],
            afterPixels: afterPixels[0],
            dataUrlLength: dataUrl.length,
            debugLog: debugLog
        };

    } catch(error) {
        console.error('❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

// Run the test
console.log('Starting Pillow filter test...');
console.log('This will take about 5-10 seconds.\n');
testPillowFilter().then(result => {
    console.log('\n=== Test Summary ===');
    console.log('Pixels changed:', result.pixelsChanged);
    console.log('Before pixel:', result.beforePixels);
    console.log('After pixel:', result.afterPixels);
}).catch(err => {
    console.error('Test failed:', err);
});
