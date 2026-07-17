/**
 * ExpenseFlow - Receipt Controller
 * HTTP request handlers for receipt management.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { receiptService } = require('../services');

const uploadReceipt = catchAsync(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const newReceipt = await receiptService.uploadReceipt(req.params.expenseId, req.userId, req.file);
  ApiResponse.created('Receipt uploaded', newReceipt).send(res);
});

const replaceReceipt = catchAsync(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const updatedReceipt = await receiptService.replaceReceipt(req.params.expenseId, req.params.receiptId, req.userId, req.file);
  ApiResponse.success('Receipt replaced', updatedReceipt).send(res);
});

const deleteReceipt = catchAsync(async (req, res) => {
  await receiptService.deleteReceipt(req.params.expenseId, req.params.receiptId, req.userId);
  ApiResponse.success('Receipt deleted').send(res);
});

const getReceiptMetadata = catchAsync(async (req, res) => {
  const metadata = await receiptService.getReceiptMetadata(req.params.expenseId, req.params.receiptId, req.userId);
  ApiResponse.success('Receipt metadata retrieved', metadata).send(res);
});

const getExpenseReceipts = catchAsync(async (req, res) => {
  const receipts = await receiptService.getExpenseReceipts(req.params.expenseId, req.userId);
  ApiResponse.success('Receipts retrieved', receipts).send(res);
});

module.exports = {
  uploadReceipt,
  replaceReceipt,
  deleteReceipt,
  getReceiptMetadata,
  getExpenseReceipts,
};
