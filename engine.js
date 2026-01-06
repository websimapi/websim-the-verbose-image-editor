/**
 * The Image Processing Engine
 * Handles the raw pixel manipulation tasks demanded by the user.
 */

export class ImageEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.image = null;
        this.fileName = 'edited_image.png';
    }

    loadImage(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = reject;
            img.src = source;
        });
    }

    /**
     * Rotates the image by a specific angle.
     * @param {number} degrees 
     */
    rotate(degrees) {
        if (!this.image) return;
        
        // Create a temporary canvas to handle the rotation geometry
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const angleInRadians = degrees * Math.PI / 180;
        const sin = Math.abs(Math.sin(angleInRadians));
        const cos = Math.abs(Math.cos(angleInRadians));
        
        // Calculate new bounding box
        const newWidth = this.canvas.width * cos + this.canvas.height * sin;
        const newHeight = this.canvas.width * sin + this.canvas.height * cos;
        
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        
        tempCtx.translate(newWidth / 2, newHeight / 2);
        tempCtx.rotate(angleInRadians);
        tempCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);
        
        // Update main canvas
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.updateImageFromCanvas();
    }

    /**
     * Adjusts brightness/luminosity.
     * @param {number} percent - Percentage change (e.g., 15 for +15%, -10 for -10%)
     */
    adjustBrightness(percent) {
        if (!this.image) return;
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const factor = 1 + (percent / 100);

        for (let i = 0; i < data.length; i += 4) {
            data[i] = this.clamp(data[i] * factor);     // R
            data[i+1] = this.clamp(data[i+1] * factor); // G
            data[i+2] = this.clamp(data[i+2] * factor); // B
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        this.updateImageFromCanvas();
    }

    /**
     * Crops the image.
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    crop(x, y, w, h) {
        if (!this.image) return;

        // Bounds checking
        x = Math.max(0, x);
        y = Math.max(0, y);
        w = Math.min(w, this.canvas.width - x);
        h = Math.min(h, this.canvas.height - y);

        if (w <= 0 || h <= 0) throw new Error("Resulting crop dimensions are invalid.");

        const imageData = this.ctx.getImageData(x, y, w, h);
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.putImageData(imageData, 0, 0);
        this.updateImageFromCanvas();
    }

    /**
     * Applies a Gaussian blur (simplified box blur for performance in this context).
     * @param {number} radius 
     */
    blur(radius) {
        if (!this.image) return;
        
        // Using CSS filter for performance and simplicity in Canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.filter = `blur(${radius}px)`;
        tempCtx.drawImage(this.canvas, 0, 0);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.updateImageFromCanvas();
    }

    /**
     * Downloads the current state.
     */
    save() {
        if (!this.image) return;
        const link = document.createElement('a');
        link.download = `verbosely_edited_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    updateImageFromCanvas() {
        const url = this.canvas.toDataURL();
        const img = new Image();
        img.src = url;
        this.image = img;
    }

    clamp(val) {
        return Math.max(0, Math.min(255, val));
    }
}