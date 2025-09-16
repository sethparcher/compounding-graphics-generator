class CompoundingGraphicsGenerator {
    constructor() {
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.direction = 'growing';
        this.alignment = 'top';
        this.backgroundColor = '#33ff00';
        this.photoSize = 100; // percentage
        this.cropX = 50; // percentage
        this.cropY = 50; // percentage
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.initializeEventListeners();
        this.initializeDefaults();
    }

    initializeEventListeners() {
        const imageUpload = document.getElementById('imageUpload');
        const directionSelect = document.getElementById('directionSelect');
        const alignmentSelect = document.getElementById('alignmentSelect');
        const colorButtons = document.querySelectorAll('.color-btn');
        const photoSizeSlider = document.getElementById('photoSize');
        const exportBtn = document.getElementById('exportBtn');

        console.log('Initializing event listeners...');
        console.log('Image upload element:', imageUpload);

        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                console.log('File input changed:', e.target.files);
                this.handleImageUpload(e);
            });
        } else {
            console.error('Image upload element not found!');
        }

        if (directionSelect) {
            directionSelect.addEventListener('change', (e) => {
                this.direction = e.target.value;
                this.generatePreview();
            });
        }

        if (alignmentSelect) {
            alignmentSelect.addEventListener('change', (e) => {
                this.alignment = e.target.value;
                this.generatePreview();
            });
        }

        colorButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove selected class from all buttons
                colorButtons.forEach(btn => btn.classList.remove('selected'));
                // Add selected class to clicked button
                e.target.classList.add('selected');
                // Update background color
                this.backgroundColor = e.target.dataset.color;
                this.generatePreview();
            });
        });

        if (photoSizeSlider) {
            photoSizeSlider.addEventListener('input', (e) => {
                this.photoSize = parseInt(e.target.value);
                document.getElementById('photoSizeValue').textContent = this.photoSize + '%';
                this.generatePreview();
            });
        }

        // Add canvas drag functionality
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        exportBtn.addEventListener('click', () => this.exportGraphic());
    }

    initializeDefaults() {
        // Set default selected color button
        const defaultColorBtn = document.querySelector(`[data-color="${this.backgroundColor}"]`);
        if (defaultColorBtn) {
            defaultColorBtn.classList.add('selected');
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        console.log('Selected file:', file);

        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File type:', file.type);
        console.log('File size:', file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('File read successfully');
            const img = new Image();
            img.onload = () => {
                console.log('Image loaded:', img.width, 'x', img.height);
                this.image = img;
                this.generatePreview();
                document.getElementById('exportBtn').disabled = false;
                document.getElementById('placeholder').style.display = 'none';
                this.canvas.style.display = 'block';
            };
            img.onerror = (error) => {
                console.error('Error loading image:', error);
            };
            img.src = e.target.result;
        };
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
        };
        reader.readAsDataURL(file);
    }

    calculateDimensions() {
        if (!this.image) return null;

        // Final canvas will always be 3:2 aspect ratio
        const canvasHeight = 400;
        const canvasWidth = (canvasHeight * 3) / 2; // 3:2 ratio

        // Calculate the size of the largest photo based on photoSize slider
        const largestHeight = canvasHeight;
        const baseLargestWidth = (largestHeight * this.photoSize) / 100;

        const sizes = [
            {
                width: baseLargestWidth,
                height: largestHeight,
                scale: 1.0,
                cropX: this.cropX,
                cropY: this.cropY
            },
            {
                width: baseLargestWidth * 0.7,
                height: largestHeight * 0.7,
                scale: 0.7,
                cropX: this.cropX,
                cropY: this.cropY
            },
            {
                width: baseLargestWidth * 0.4,
                height: largestHeight * 0.4,
                scale: 0.4,
                cropX: this.cropX,
                cropY: this.cropY
            }
        ];

        if (this.direction === 'shrinking') {
            sizes.reverse();
        }

        // Position photos within the fixed 3:2 canvas
        const totalPhotoWidth = sizes.reduce((sum, size) => sum + size.width, 0);
        const startX = (canvasWidth - totalPhotoWidth) / 2;

        let currentX = startX;
        sizes.forEach((size) => {
            size.x = currentX;

            // Largest photo (scale 1.0) always touches top and bottom
            if (size.scale === 1.0) {
                size.y = 0;
            } else {
                // Smaller photos follow alignment setting
                switch (this.alignment) {
                    case 'top':
                        size.y = 0;
                        break;
                    case 'bottom':
                        size.y = canvasHeight - size.height;
                        break;
                    case 'center':
                        size.y = (canvasHeight - size.height) / 2;
                        break;
                }
            }

            currentX += size.width;
        });

        return { sizes, canvasWidth, canvasHeight };
    }

    generatePreview() {
        if (!this.image) return;

        const dimensions = this.calculateDimensions();
        if (!dimensions) return;

        this.canvas.width = dimensions.canvasWidth;
        this.canvas.height = dimensions.canvasHeight;

        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        dimensions.sizes.forEach(size => {
            this.drawCroppedImage(this.ctx, this.image, size);
        });

        // Add visual feedback when dragging
        if (this.isDragging) {
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
            this.ctx.setLineDash([]);
        }
    }

    handleMouseDown(e) {
        if (!this.image) return;

        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastMouseX = e.clientX - rect.left;
        this.lastMouseY = e.clientY - rect.top;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.image) return;

        const rect = this.canvas.getBoundingClientRect();
        const currentMouseX = e.clientX - rect.left;
        const currentMouseY = e.clientY - rect.top;

        const deltaX = currentMouseX - this.lastMouseX;
        const deltaY = currentMouseY - this.lastMouseY;

        // Convert pixel movement to percentage movement
        // Invert the movement so dragging right moves the crop left (shows more right side of image)
        const sensitivityX = 20; // Adjust sensitivity as needed
        const sensitivityY = 20;

        this.cropX = Math.max(0, Math.min(100, this.cropX - (deltaX / sensitivityX)));
        this.cropY = Math.max(0, Math.min(100, this.cropY - (deltaY / sensitivityY)));

        this.lastMouseX = currentMouseX;
        this.lastMouseY = currentMouseY;

        this.generatePreview();
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    drawCroppedImage(ctx, image, size) {
        // Calculate the aspect ratio of the target display area
        const displayAspectRatio = size.width / size.height;
        const imageAspectRatio = image.width / image.height;

        let sourceWidth, sourceHeight, sourceX, sourceY;

        if (imageAspectRatio > displayAspectRatio) {
            // Image is wider than display area - crop horizontally
            sourceHeight = image.height;
            sourceWidth = sourceHeight * displayAspectRatio;
            sourceY = 0;
            // Use cropX to determine horizontal position
            sourceX = (image.width - sourceWidth) * (size.cropX / 100);
        } else {
            // Image is taller than display area - crop vertically
            sourceWidth = image.width;
            sourceHeight = sourceWidth / displayAspectRatio;
            sourceX = 0;
            // Use cropY to determine vertical position
            sourceY = (image.height - sourceHeight) * (size.cropY / 100);
        }

        // Ensure source coordinates are within image bounds
        sourceX = Math.max(0, Math.min(sourceX, image.width - sourceWidth));
        sourceY = Math.max(0, Math.min(sourceY, image.height - sourceHeight));

        ctx.drawImage(
            image,
            sourceX, sourceY, sourceWidth, sourceHeight,
            size.x, size.y, size.width, size.height
        );
    }

    exportGraphic() {
        if (!this.image) return;

        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');

        const dimensions = this.calculateDimensions();
        if (!dimensions) return;

        exportCanvas.width = dimensions.canvasWidth;
        exportCanvas.height = dimensions.canvasHeight;

        exportCtx.fillStyle = this.backgroundColor;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        dimensions.sizes.forEach(size => {
            this.drawCroppedImage(exportCtx, this.image, size);
        });

        const link = document.createElement('a');
        link.download = `compounding-graphic-${this.direction}-${this.alignment}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CompoundingGraphicsGenerator...');
    try {
        const generator = new CompoundingGraphicsGenerator();
        console.log('Generator initialized successfully:', generator);
    } catch (error) {
        console.error('Error initializing generator:', error);
    }
});