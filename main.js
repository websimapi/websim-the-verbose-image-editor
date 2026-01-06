import { ImageEngine } from './engine.js';

class VerboseController {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.engine = new ImageEngine(this.canvas);
        this.input = document.getElementById('commandInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.logContainer = document.getElementById('logContainer');
        this.fileInput = document.getElementById('fileInput');
        this.placeholder = document.getElementById('placeholderText');

        this.notificationSound = new Audio('notification.mp3');
        this.errorSound = new Audio('rejection.mp3');

        this.init();
    }

    init() {
        this.submitBtn.addEventListener('click', () => this.processInput());
        
        // Allow Enter key to submit if Shift is pressed (standard for textareas)
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.processInput();
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.engine.loadImage(evt.target.result)
                        .then(() => {
                            this.placeholder.style.display = 'none';
                            this.logSystem("The file has been successfully ingested into the visual memory buffer. You may now commence manipulation.");
                            this.playSuccess();
                        })
                        .catch(() => this.logError("An error occurred during file ingestion."));
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // Load default image for demo purposes
        this.engine.loadImage('sample_image.png').then(() => {
            this.placeholder.style.display = 'none';
        });
    }

    processInput() {
        const text = this.input.value.trim();
        if (!text) return;

        this.logUser(text);
        this.input.value = '';

        // 1. Check Verbosity (Word Count)
        const wordCount = text.split(/\s+/).length;
        if (wordCount < 10) {
            this.playError();
            this.logError("I'm afraid your instruction was rather curt. Please expound upon your desires with at least ten words to ensure clarity of intent.");
            return;
        }

        // 2. Parse Intent
        const lowerText = text.toLowerCase();
        let actionTaken = false;

        try {
            if (this.isLoadRequest(lowerText)) {
                this.logSystem("I understand you wish to import external data. Opening the system file selection dialogue now...");
                this.fileInput.click();
                actionTaken = true;
            } else if (this.isSaveRequest(lowerText)) {
                this.logSystem("serializing pixel data to PNG format and initiating transfer to local storage...");
                this.engine.save();
                actionTaken = true;
            } else if (this.isRotateRequest(lowerText)) {
                const degrees = this.extractNumber(lowerText, 90); // Default 90 if not found
                const isCounter = lowerText.includes('counter') || lowerText.includes('anti');
                const finalDegrees = isCounter ? -degrees : degrees;
                
                this.engine.rotate(finalDegrees);
                this.logSystem(`Rotation algorithm applied: ${Math.abs(finalDegrees)} degrees ${isCounter ? 'counter-clockwise' : 'clockwise'}.`);
                actionTaken = true;
            } else if (this.isBrightnessRequest(lowerText)) {
                const amount = this.extractNumber(lowerText, 10);
                const isDecrease = lowerText.includes('decrease') || lowerText.includes('darken') || lowerText.includes('reduce');
                const finalAmount = isDecrease ? -amount : amount;
                
                this.engine.adjustBrightness(finalAmount);
                this.logSystem(`Luminosity values shifted by ${finalAmount} percent.`);
                actionTaken = true;
            } else if (this.isBlurRequest(lowerText)) {
                const radius = this.extractNumber(lowerText, 5);
                this.engine.blur(radius);
                this.logSystem(`Gaussian blur convolution applied with a kernel radius of ${radius} pixels.`);
                actionTaken = true;
            } else if (this.isCropRequest(lowerText)) {
                // Crop is tricky, needs 4 numbers.
                const nums = this.extractAllNumbers(lowerText);
                if (nums.length >= 4) {
                    // Assuming order: x, y, width, height or x, y, x2, y2 based on prompt context, 
                    // but let's stick to the prompt example: x, y, width, height
                    // Prompt: "horizontal coordinate 150... vertical coordinate 200... extending rightward for 400... downward for 300"
                    
                    // Simple heuristic: first two are coords, next two are dimensions
                    const [x, y, w, h] = nums;
                    this.engine.crop(x, y, w, h);
                    this.logSystem(`Canvas cropped to region starting at (${x}, ${y}) with dimensions ${w}x${h}.`);
                    actionTaken = true;
                } else {
                    throw new Error("Insufficient numerical data for cropping operation. Please specify x, y, width, and height.");
                }
            } else {
                this.playError();
                this.logError("I processed your statement but failed to identify a compatible image manipulation protocol. Please rephrase with standard terminology.");
            }

            if (actionTaken) {
                this.playSuccess();
            }

        } catch (e) {
            this.playError();
            this.logError(`An operational anomaly occurred: ${e.message}`);
        }
    }

    // --- NLP Helpers ---

    isLoadRequest(text) {
        return (text.includes('load') || text.includes('import') || text.includes('open')) && 
               (text.includes('image') || text.includes('file') || text.includes('picture'));
    }

    isSaveRequest(text) {
        return (text.includes('save') || text.includes('download') || text.includes('serialize') || text.includes('export'));
    }

    isRotateRequest(text) {
        return text.includes('rotate') || text.includes('turn') || text.includes('orientation');
    }

    isBrightnessRequest(text) {
        return text.includes('brightness') || text.includes('luminosity') || text.includes('lighten') || text.includes('darken');
    }

    isBlurRequest(text) {
        return text.includes('blur') || text.includes('soften') || text.includes('fuzzy');
    }

    isCropRequest(text) {
        return text.includes('crop') || text.includes('cut') || text.includes('remove pixel') || text.includes('trim');
    }

    extractNumber(text, defaultVal) {
        // Match integers or floats
        const match = text.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[0]) : defaultVal;
    }

    extractAllNumbers(text) {
        const matches = text.match(/(\d+(\.\d+)?)/g);
        return matches ? matches.map(n => parseFloat(n)) : [];
    }

    // --- Logging & Feedback ---

    logUser(msg) {
        this.addLogEntry(msg, 'user');
    }

    logSystem(msg) {
        this.addLogEntry("System: " + msg, 'system');
    }

    logError(msg) {
        this.addLogEntry("Error: " + msg, 'error');
    }

    addLogEntry(text, type) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.textContent = `[${time}]`;
        
        entry.appendChild(timeSpan);
        entry.appendChild(document.createTextNode(text));
        
        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    playSuccess() {
        this.notificationSound.currentTime = 0;
        this.notificationSound.play().catch(e => console.log('Audio play failed', e));
    }

    playError() {
        this.errorSound.currentTime = 0;
        this.errorSound.play().catch(e => console.log('Audio play failed', e));
    }
}

// Start the application
new VerboseController();