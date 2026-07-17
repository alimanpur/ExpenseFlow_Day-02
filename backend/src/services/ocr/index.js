/**
 * ExpenseFlow - OCR Service Factory
 * Returns the configured OCR service implementation.
 */
const NoopOcrService = require('./NoopOcrService');

function getOcrService() {
  const provider = (process.env.OCR_PROVIDER || 'noop').toLowerCase();

  switch (provider) {
    case 'google':
      return new (require('./providers/GoogleVisionOcrService'))();
    case 'aws':
      return new (require('./providers/AwsTextractOcrService'))();
    case 'azure':
      return new (require('./providers/AzureOcrService'))();
    case 'noop':
    default:
      return new NoopOcrService();
  }
}

module.exports = { getOcrService };
