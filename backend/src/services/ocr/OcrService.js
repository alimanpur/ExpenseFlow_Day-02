/**
 * ExpenseFlow - OCR Service Interface
 * Swappable OCR provider abstraction for receipt text extraction.
 */

class OcrServiceInterface {
  async extractText(_imagePath) {
    throw new Error('Method not implemented');
  }

  async extractMetadata(_imagePath) {
    throw new Error('Method not implemented');
  }

  async validateReceipt(_imagePath) {
    throw new Error('Method not implemented');
  }
}

module.exports = OcrServiceInterface;
