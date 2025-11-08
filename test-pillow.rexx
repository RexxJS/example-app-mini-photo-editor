/* Test Pillow Filter via RexxJS Control Bus
 * Copyright Paul Hammant
 */
SAY "=== Pillow Filter Test ==="
SAY ""

/* Check PyOdide status */
SAY "Checking PyOdide status..."
ADDRESS PHOTOEDITOR "check-pyodide" with result
SAY "PyOdide status:" result
SAY ""

/* Open test image */
SAY "Loading test image..."
ADDRESS PHOTOEDITOR "open-image /home/paul/scm/rexxjs/example-app-mini-photo-editor/Testcard_F.jpg" with result
SAY "Load result:" result
SAY ""

/* Wait a bit for image to load */
CALL SysSleep 2

/* Get canvas data before filter */
SAY "Getting canvas sample BEFORE filter..."
ADDRESS PHOTOEDITOR "get-canvas-data 5" with result
SAY "Before pixels:" result
SAY ""

/* Apply posterize filter */
SAY "Applying posterize filter..."
ADDRESS PHOTOEDITOR "apply-pillow-filter posterize" with result
SAY "Filter result:" result
SAY ""

/* Wait for filter to process */
CALL SysSleep 3

/* Get canvas data after filter */
SAY "Getting canvas sample AFTER filter..."
ADDRESS PHOTOEDITOR "get-canvas-data 5" with result
SAY "After pixels:" result
SAY ""

/* Get full canvas as base64 */
SAY "Getting canvas as base64..."
ADDRESS PHOTOEDITOR "get-canvas" with result
dataUrl = result
SAY "Canvas data URL length:" LENGTH(dataUrl)
SAY "First 100 chars:" SUBSTR(dataUrl, 1, 100)
SAY ""

/* Get debug log */
SAY "=== Debug Log ==="
ADDRESS PHOTOEDITOR "get-debug-log" with result
SAY result
SAY ""

SAY "=== Test Complete ==="
EXIT
