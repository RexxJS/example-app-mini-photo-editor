/**
 * RexxJS Control Handler - ADDRESS PHOTOEDITOR integration
 * Copyright Paul Hammant
 *
 * This module sets up window.ADDRESS_PHOTOEDITOR for RexxJS scripts to control
 * the photo editor application.
 *
 * Usage from RexxJS:
 *   ADDRESS PHOTOEDITOR "open-image /path/to/image.jpg"
 *   ADDRESS PHOTOEDITOR "apply-pillow-filter posterize"
 *   ADDRESS PHOTOEDITOR "get-canvas"
 */

class RexxJSControlHandler {
    constructor(appContext) {
        this.app = appContext;
        this.debugLog = [];
        this.setupDebugElement();
    }

    /**
     * Create invisible debug log element
     */
    setupDebugElement() {
        if (typeof document !== 'undefined') {
            let debugEl = document.getElementById('rexx-debug-log');
            if (!debugEl) {
                debugEl = document.createElement('div');
                debugEl.id = 'rexx-debug-log';
                debugEl.style.cssText = 'display:none;white-space:pre;';
                document.body.appendChild(debugEl);
            }
            this.debugElement = debugEl;
        }
    }

    /**
     * Log message to debug element and console
     */
    log(message) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}`;
        this.debugLog.push(logLine);
        console.log('RexxJS:', message);

        if (this.debugElement) {
            this.debugElement.textContent = this.debugLog.slice(-100).join('\n');
        }
    }

    /**
     * Main command handler - called by RexxJS via ADDRESS PHOTOEDITOR
     */
    async run(command, params) {
        this.log(`Command: ${command} ${JSON.stringify(params || {})}`);

        const cmd = command.toLowerCase().trim();

        try {
            switch(cmd) {
                case 'open-image':
                    return await this.openImage(params);

                case 'get-canvas':
                    return await this.getCanvas(params);

                case 'get-canvas-data':
                    return await this.getCanvasData(params);

                case 'apply-pillow-filter':
                    return await this.applyPillowFilter(params);

                case 'list-pillow-filters':
                    return await this.listPillowFilters();

                case 'reset-pillow':
                    return await this.resetPillow();

                case 'check-pyodide':
                    return await this.checkPyodide();

                case 'get-debug-log':
                    return this.debugLog.join('\n');

                case 'clear-debug-log':
                    this.debugLog = [];
                    if (this.debugElement) this.debugElement.textContent = '';
                    return 'OK';

                default:
                    throw new Error(`Unknown command: ${cmd}`);
            }
        } catch (error) {
            this.log(`ERROR: ${error.message}`);
            throw error;
        }
    }

    /**
     * Open image from path
     */
    async openImage(params) {
        const path = params.path || params.code; // RexxJS might pass as 'code'
        if (!path) throw new Error('Missing image path');

        this.log(`Opening image: ${path}`);

        // Check if we're in Tauri
        if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
            const { readBinaryFile } = await import('@tauri-apps/plugin-fs');

            try {
                const arrayBuffer = await readBinaryFile(path);
                const blob = new Blob([arrayBuffer]);
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                await img.decode();

                // Trigger image load in app
                if (this.app.openInput) {
                    await this.app.openInput(arrayBuffer, path.split('/').pop(), path);
                    // Wait for reactive effects to complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Manually trigger updateGL if available
                    if (this.app.updateGL) {
                        await this.app.updateGL();
                    }
                    this.log(`Image loaded successfully: ${img.width}x${img.height}`);
                    return `OK - Image loaded: ${img.width}x${img.height}`;
                } else {
                    throw new Error('App openInput method not available');
                }
            } catch (error) {
                this.log(`Failed to load image: ${error.message}`);
                throw new Error(`Failed to load image: ${error.message}`);
            }
        } else {
            // Web mode - use fetch
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const blob = new Blob([arrayBuffer]);
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                await img.decode();

                if (this.app.openInput) {
                    await this.app.openInput(arrayBuffer, path.split('/').pop(), path);
                    // Wait for reactive effects to complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Manually trigger updateGL if available
                    if (this.app.updateGL) {
                        await this.app.updateGL();
                    }
                    this.log(`Image loaded successfully: ${img.width}x${img.height}`);
                    return `OK - Image loaded: ${img.width}x${img.height}`;
                } else {
                    throw new Error('App openInput method not available');
                }
            } catch (error) {
                this.log(`Failed to load image: ${error.message}`);
                throw new Error(`Failed to load image: ${error.message}`);
            }
        }
    }

    /**
     * Get canvas as base64 data URL
     */
    async getCanvas(params) {
        const canvas = document.getElementById('canvas');
        if (!canvas) throw new Error('Canvas not found');

        this.log(`Getting canvas as base64 (${canvas.width}x${canvas.height})`);

        // For WebGL canvas, we need to read pixels and create a 2D canvas
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (gl) {
            // Create temporary 2D canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');

            // Read pixels from WebGL
            const pixels = new Uint8Array(canvas.width * canvas.height * 4);
            gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            // Create ImageData and put on 2D canvas (flip Y because WebGL is bottom-up)
            const imageData = new ImageData(new Uint8ClampedArray(pixels), canvas.width, canvas.height);

            // Flip vertically
            ctx.scale(1, -1);
            ctx.translate(0, -canvas.height);
            ctx.putImageData(imageData, 0, 0);

            const dataUrl = tempCanvas.toDataURL('image/png');
            this.log(`Canvas captured: ${dataUrl.length} bytes`);
            return dataUrl;
        } else {
            // Regular 2D canvas
            const dataUrl = canvas.toDataURL('image/png');
            this.log(`Canvas captured: ${dataUrl.length} bytes`);
            return dataUrl;
        }
    }

    /**
     * Get canvas pixel data as array (for inspection)
     */
    async getCanvasData(params) {
        const canvas = document.getElementById('canvas');
        if (!canvas) throw new Error('Canvas not found');

        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (!gl) throw new Error('WebGL context not found');

        // IMPORTANT: Call paintCanvas() first to ensure framebuffer is rendered
        if (this.app.params && this.app.params._minigl) {
            this.app.params._minigl.paintCanvas();
        }

        // Read sample from CENTER of canvas (not corner)
        const sampleSize = parseInt(params.sample || params.code || 10);
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);

        const pixels = new Uint8Array(sampleSize * 4);
        gl.readPixels(centerX, centerY, sampleSize, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        const result = [];
        for (let i = 0; i < sampleSize; i++) {
            result.push([
                pixels[i*4],
                pixels[i*4+1],
                pixels[i*4+2],
                pixels[i*4+3]
            ]);
        }

        this.log(`Canvas sample at center (${centerX},${centerY}), ${sampleSize} pixels: ${JSON.stringify(result[0])}`);
        return JSON.stringify(result);
    }

    /**
     * Apply Pillow filter
     */
    async applyPillowFilter(params) {
        const filterType = params.filter || params.code;
        if (!filterType) throw new Error('Missing filter type');

        this.log(`Applying Pillow filter: ${filterType}`);

        // Access app params
        if (!this.app.params) throw new Error('App params not available');

        // Set filter
        this.app.params.pillow.filterType = filterType;
        this.app.params.pillow.filterLabel = filterType.charAt(0).toUpperCase() + filterType.slice(1);
        this.app.params.pillow.$skip = false;

        // Trigger update
        if (this.app.updateGL) {
            await this.app.updateGL();
            this.log(`Filter applied: ${filterType}`);
            return `OK - Filter applied: ${filterType}`;
        } else {
            throw new Error('App updateGL method not available');
        }
    }

    /**
     * List available Pillow filters
     */
    async listPillowFilters() {
        const filters = [
            'blur', 'sharpen', 'emboss', 'find_edges',
            'contour', 'detail', 'smooth', 'edge_enhance',
            'autocontrast', 'equalize', 'posterize', 'solarize'
        ];

        this.log(`Available Pillow filters: ${filters.join(', ')}`);
        return filters.join(', ');
    }

    /**
     * Reset Pillow filter
     */
    async resetPillow() {
        this.log('Resetting Pillow filter');

        if (!this.app.params) throw new Error('App params not available');

        this.app.params.pillow.filterType = null;
        this.app.params.pillow.filterLabel = null;
        this.app.params.pillow.$skip = false;

        if (this.app.updateGL) {
            await this.app.updateGL();
            this.log('Pillow filter reset');
            return 'OK - Pillow filter reset';
        } else {
            throw new Error('App updateGL method not available');
        }
    }

    /**
     * Check PyOdide status
     */
    async checkPyodide() {
        const status = {
            loadPyodide: typeof loadPyodide !== 'undefined',
            pyodideHandler: typeof window.ADDRESS_PYODIDE_HANDLER !== 'undefined',
            rexxBundle: typeof RexxInterpreter !== 'undefined'
        };

        this.log(`PyOdide status: ${JSON.stringify(status)}`);
        return JSON.stringify(status);
    }
}

/**
 * Setup function - called from main app
 */
export function setupRexxJSControl(appContext) {
    const handler = new RexxJSControlHandler(appContext);

    // Register as ADDRESS PHOTOEDITOR handler
    if (typeof window !== 'undefined') {
        window.ADDRESS_PHOTOEDITOR = {
            run: handler.run.bind(handler)
        };

        console.log('✅ RexxJS PHOTOEDITOR handler registered');
        console.log('Usage: ADDRESS PHOTOEDITOR "command params"');
    }

    return handler;
}

export default RexxJSControlHandler;
