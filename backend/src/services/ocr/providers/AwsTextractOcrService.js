/**
 * ExpenseFlow - AWS Textract OCR Service
 * AWS Textract integration for receipt text extraction.
 */
const OcrServiceInterface = require('../OcrService');

class AwsTextractOcrService extends OcrServiceInterface {
  async extractText(_imagePath) {
    throw new Error('AwsTextractOcrService is not yet implemented');
  }

  async extractMetadata(_imagePath) {
    throw new Error('AwsTextractOcrService is not yet implemented');
  }

  async validateReceipt(_imagePath) {
    throw new Error('AwsTextractOcrService is not yet implemented');
  }
}

module.exports = AwsTextractOcrService;
