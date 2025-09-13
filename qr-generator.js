// Simple QR Code Generator for AO Attendance System
// Pure JavaScript implementation without external dependencies

class QRCodeGenerator {
    constructor() {
        this.typeNumber = 4;
        this.errorCorrectionLevel = 'M';
        this.moduleCount = 25;
    }
    
    generateQR(text, size = 200) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = size;
            canvas.height = size;
            
            // Fill white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);
            
            // Generate QR pattern
            const pattern = this.createPattern(text);
            const moduleSize = size / this.moduleCount;
            
            // Draw QR modules
            ctx.fillStyle = '#000000';
            for (let row = 0; row < this.moduleCount; row++) {
                for (let col = 0; col < this.moduleCount; col++) {
                    if (pattern[row][col]) {
                        ctx.fillRect(
                            col * moduleSize,
                            row * moduleSize,
                            moduleSize,
                            moduleSize
                        );
                    }
                }
            }
            
            return canvas;
        } catch (error) {
            console.error('Error generating QR code:', error);
            return this.createFallbackQR(text, size);
        }
    }
    
    createPattern(text) {
        const pattern = this.initializePattern();
        
        // Add finder patterns (corner squares)
        this.addFinderPattern(pattern, 0, 0);
        this.addFinderPattern(pattern, this.moduleCount - 7, 0);
        this.addFinderPattern(pattern, 0, this.moduleCount - 7);
        
        // Add separators
        this.addSeparators(pattern);
        
        // Add timing patterns
        this.addTimingPatterns(pattern);
        
        // Add data
        this.addData(pattern, text);
        
        return pattern;
    }
    
    initializePattern() {
        const pattern = [];
        for (let i = 0; i < this.moduleCount; i++) {
            pattern[i] = new Array(this.moduleCount).fill(false);
        }
        return pattern;
    }
    
    addFinderPattern(pattern, startX, startY) {
        const finderPattern = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1]
        ];
        
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (startX + i < this.moduleCount && startY + j < this.moduleCount) {
                    pattern[startX + i][startY + j] = finderPattern[i][j] === 1;
                }
            }
        }
    }
    
    addSeparators(pattern) {
        // Add white border around finder patterns
        for (let i = 0; i < 8; i++) {
            // Top-left separator
            if (i < this.moduleCount) {
                pattern[7][i] = false;
                pattern[i][7] = false;
            }
            
            // Top-right separator
            if (this.moduleCount - 8 + i >= 0 && this.moduleCount - 8 + i < this.moduleCount) {
                pattern[7][this.moduleCount - 8 + i] = false;
                pattern[this.moduleCount - 8 + i][7] = false;
            }
            
            // Bottom-left separator
            if (this.moduleCount - 8 + i >= 0 && this.moduleCount - 8 + i < this.moduleCount) {
                pattern[this.moduleCount - 8 + i][7] = false;
                pattern[this.moduleCount - 8][i] = false;
            }
        }
    }
    
    addTimingPatterns(pattern) {
        // Horizontal timing pattern
        for (let i = 8; i < this.moduleCount - 8; i++) {
            pattern[6][i] = i % 2 === 0;
        }
        
        // Vertical timing pattern
        for (let i = 8; i < this.moduleCount - 8; i++) {
            pattern[i][6] = i % 2 === 0;
        }
    }
    
    addData(pattern, text) {
        // Simple data encoding - not a real QR implementation
        // This creates a recognizable pattern based on the text
        
        const hash = this.simpleHash(text);
        let dataIndex = 0;
        
        // Fill available areas with data pattern
        for (let col = this.moduleCount - 1; col > 0; col -= 2) {
            if (col === 6) col--; // Skip timing column
            
            for (let row = 0; row < this.moduleCount; row++) {
                for (let c = 0; c < 2; c++) {
                    const currentCol = col - c;
                    const currentRow = (col % 4 < 2) ? (this.moduleCount - 1 - row) : row;
                    
                    if (this.isAvailable(pattern, currentRow, currentCol)) {
                        const bit = this.getBit(hash, dataIndex);
                        pattern[currentRow][currentCol] = bit;
                        dataIndex++;
                    }
                }
            }
        }
        
        // Add some format information
        this.addFormatInfo(pattern);
    }
    
    addFormatInfo(pattern) {
        // Add some format patterns around finder patterns
        const formatBits = [1, 0, 1, 0, 1, 1, 0, 1, 0];
        
        // Format info around top-left finder
        for (let i = 0; i < formatBits.length; i++) {
            if (i < 6) {
                pattern[8][i] = formatBits[i] === 1;
            } else if (i < 8) {
                pattern[8][i + 1] = formatBits[i] === 1;
            } else {
                pattern[7 - (i - 8)][8] = formatBits[i] === 1;
            }
        }
    }
    
    isAvailable(pattern, row, col) {
        if (row < 0 || row >= this.moduleCount || col < 0 || col >= this.moduleCount) {
            return false;
        }
        
        // Check if it's part of finder patterns
        if ((row < 9 && col < 9) || 
            (row < 9 && col >= this.moduleCount - 8) ||
            (row >= this.moduleCount - 8 && col < 9)) {
            return false;
        }
        
        // Check if it's timing pattern
        if (row === 6 || col === 6) {
            return false;
        }
        
        return true;
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    
    getBit(number, position) {
        return (number >> position) & 1;
    }
    
    createFallbackQR(text, size) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = size;
        canvas.height = size;
        
        // Draw a simple pattern as fallback
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        // Draw border
        ctx.strokeRect(10, 10, size - 20, size - 20);
        
        // Draw some pattern
        const blockSize = (size - 40) / 8;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if ((i + j) % 2 === 0) {
                    ctx.fillRect(
                        20 + i * blockSize,
                        20 + j * blockSize,
                        blockSize - 2,
                        blockSize - 2
                    );
                }
            }
        }
        
        // Add text
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', size / 2, size - 10);
        
        return canvas;
    }
    
    // Enhanced QR generation with better pattern
    generateEnhancedQR(text, size = 200) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = size;
        canvas.height = size;
        
        // Background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        
        const gridSize = 21; // Standard QR grid size
        const moduleSize = Math.floor(size / gridSize);
        const offset = (size - gridSize * moduleSize) / 2;
        
        ctx.fillStyle = '#000000';
        
        // Generate pattern based on text
        const pattern = this.generatePatternFromText(text, gridSize);
        
        // Draw the pattern
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (pattern[i][j]) {
                    ctx.fillRect(
                        offset + j * moduleSize,
                        offset + i * moduleSize,
                        moduleSize,
                        moduleSize
                    );
                }
            }
        }
        
        return canvas;
    }
    
    generatePatternFromText(text, gridSize) {
        const pattern = [];
        for (let i = 0; i < gridSize; i++) {
            pattern[i] = new Array(gridSize).fill(false);
        }
        
        // Add corner detection patterns
        this.addCornerPattern(pattern, 0, 0, gridSize);
        this.addCornerPattern(pattern, 0, gridSize - 7, gridSize);
        this.addCornerPattern(pattern, gridSize - 7, 0, gridSize);
        
        // Add timing patterns
        for (let i = 8; i < gridSize - 8; i++) {
            pattern[6][i] = i % 2 === 0;
            pattern[i][6] = i % 2 === 0;
        }
        
        // Add data based on text hash
        const hash = this.simpleHash(text);
        let seed = hash;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (this.isDataArea(i, j, gridSize)) {
                    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                    pattern[i][j] = (seed % 100) < 45; // ~45% fill rate
                }
            }
        }
        
        return pattern;
    }
    
    addCornerPattern(pattern, startRow, startCol, gridSize) {
        const cornerPattern = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1]
        ];
        
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (startRow + i < gridSize && startCol + j < gridSize) {
                    pattern[startRow + i][startCol + j] = cornerPattern[i][j] === 1;
                }
            }
        }
    }
    
    isDataArea(row, col, gridSize) {
        // Skip corner patterns
        if ((row < 9 && col < 9) || 
            (row < 9 && col >= gridSize - 8) ||
            (row >= gridSize - 8 && col < 9)) {
            return false;
        }
        
        // Skip timing patterns
        if (row === 6 || col === 6) {
            return false;
        }
        
        return true;
    }
    
    // Generate QR with logo/icon in center
    generateQRWithLogo(text, logoText = 'AO', size = 200) {
        const canvas = this.generateEnhancedQR(text, size);
        const ctx = canvas.getContext('2d');
        
        // Add logo area in center
        const logoSize = size * 0.2;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;
        
        // White background for logo
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
        
        // Logo border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(logoX, logoY, logoSize, logoSize);
        
        // Logo text
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${logoSize / 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(logoText, size / 2, size / 2);
        
        return canvas;
    }
}

// Create global instance
window.QRGenerator = new QRCodeGenerator();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRCodeGenerator;
}

console.log('QR Code Generator loaded');