/**
 * ExpenseFlow - Receipt Service
 * Business logic for receipt upload, replacement, deletion, and metadata retrieval.
 */
const { Receipt, Expense } = require('../models');
const ApiError = require('../utils/ApiError');
const { getStorageService } = require('../services/storage');
const { getOcrService } = require('../services/ocr');

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

class ReceiptService {
  constructor() {
    this.storage = getStorageService();
    this.ocr = getOcrService();
  }

  async uploadReceipt(expenseId, userId, file) {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    const member = await require('../models').Member.findOne({
      user: userId,
      circle: expense.circle,
      isActive: true,
    });
    if (!member) {
      throw ApiError.forbidden('You are not a member of this circle');
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.mimetype)) {
      throw ApiError.badRequest(`File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_RECEIPT_TYPES.join(', ')}`);
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      throw ApiError.badRequest(`File too large. Maximum size is ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`);
    }

    const folder = `receipts/${expenseId}`;
    const uploadResult = await this.storage.upload(file, folder);

    const receipt = await Receipt.create({
      expense: expenseId,
      uploadedBy: userId,
      originalFilename: file.originalname,
      storedFilename: uploadResult.filename,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: uploadResult.path,
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
    });

    return receipt;
  }

  async replaceReceipt(expenseId, receiptId, userId, file) {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    const member = await require('../models').Member.findOne({
      user: userId,
      circle: expense.circle,
      isActive: true,
    });
    if (!member) {
      throw ApiError.forbidden('You are not a member of this circle');
    }

    const existingReceipt = await Receipt.findOne({
      _id: receiptId,
      expense: expenseId,
      isDeleted: false,
    });
    if (!existingReceipt) {
      throw ApiError.notFound('Receipt not found');
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.mimetype)) {
      throw ApiError.badRequest(`File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_RECEIPT_TYPES.join(', ')}`);
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      throw ApiError.badRequest(`File too large. Maximum size is ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`);
    }

    await this.storage.delete(existingReceipt.filePath);

    const folder = `receipts/${expenseId}`;
    const uploadResult = await this.storage.upload(file, folder);

    existingReceipt.originalFilename = file.originalname;
    existingReceipt.storedFilename = uploadResult.filename;
    existingReceipt.mimeType = file.mimetype;
    existingReceipt.fileSize = file.size;
    existingReceipt.filePath = uploadResult.path;
    existingReceipt.storageProvider = process.env.STORAGE_PROVIDER || 'local';
    existingReceipt.ocrStatus = 'pending';
    existingReceipt.ocrText = '';
    existingReceipt.ocrMetadata = {};

    await existingReceipt.save();

    return existingReceipt;
  }

  async deleteReceipt(expenseId, receiptId, userId) {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    const member = await require('../models').Member.findOne({
      user: userId,
      circle: expense.circle,
      isActive: true,
    });
    if (!member) {
      throw ApiError.forbidden('You are not a member of this circle');
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      expense: expenseId,
      isDeleted: false,
    });
    if (!receipt) {
      throw ApiError.notFound('Receipt not found');
    }

    await this.storage.delete(receipt.filePath);
    await receipt.softDelete(userId);

    return receipt;
  }

  async getReceiptMetadata(expenseId, receiptId, userId) {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    const member = await require('../models').Member.findOne({
      user: userId,
      circle: expense.circle,
      isActive: true,
    });
    if (!member) {
      throw ApiError.forbidden('You are not a member of this circle');
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      expense: expenseId,
      isDeleted: false,
    }).select('-__v');
    if (!receipt) {
      throw ApiError.notFound('Receipt not found');
    }

    return receipt;
  }

  async getExpenseReceipts(expenseId, userId) {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    const member = await require('../models').Member.findOne({
      user: userId,
      circle: expense.circle,
      isActive: true,
    });
    if (!member) {
      throw ApiError.forbidden('You are not a member of this circle');
    }

    const receipts = await Receipt.find({
      expense: expenseId,
      isDeleted: false,
    }).select('-__v').sort({ createdAt: -1 });

    return receipts;
  }

  async processOcr(receiptId) {
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      throw ApiError.notFound('Receipt not found');
    }

    receipt.ocrStatus = 'processing';
    await receipt.save();

    try {
      const text = await this.ocr.extractText(receipt.filePath);
      const metadata = await this.ocr.extractMetadata(receipt.filePath);
      const validation = await this.ocr.validateReceipt(receipt.filePath);

      receipt.ocrText = text;
      receipt.ocrMetadata = { ...metadata, validation };
      receipt.ocrStatus = 'completed';
      await receipt.save();

      return receipt;
    } catch (error) {
      receipt.ocrStatus = 'failed';
      await receipt.save();
      throw error;
    }
  }
}

module.exports = new ReceiptService();
