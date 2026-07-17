/**
 * ExpenseFlow - Receipt Routes
 * Receipt management for expenses.
 */
const { Router } = require('express');
const { z } = require('zod');
const { REGEX } = require('../constants');
const receiptController = require('../controllers/receipt.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadReceipt } = require('../middleware/upload');

const expenseIdParamSchema = z.object({
  params: z.object({
    expenseId: z.string().regex(REGEX.OBJECT_ID, 'Invalid expense ID'),
    receiptId: z.string().regex(REGEX.OBJECT_ID, 'Invalid receipt ID').optional(),
  }),
});

const replaceReceiptSchema = z.object({
  params: z.object({
    expenseId: z.string().regex(REGEX.OBJECT_ID, 'Invalid expense ID'),
    receiptId: z.string().regex(REGEX.OBJECT_ID, 'Invalid receipt ID'),
  }),
});

const router = Router();

router.use(authenticate);

router.post('/:expenseId/receipt', validate(expenseIdParamSchema), uploadReceipt, receiptController.uploadReceipt);
router.patch('/:expenseId/receipt/:receiptId', validate(replaceReceiptSchema), uploadReceipt, receiptController.replaceReceipt);
router.delete('/:expenseId/receipt/:receiptId', validate(expenseIdParamSchema), receiptController.deleteReceipt);
router.get('/:expenseId/receipt/:receiptId', validate(expenseIdParamSchema), receiptController.getReceiptMetadata);
router.get('/:expenseId/receipts', validate(expenseIdParamSchema), receiptController.getExpenseReceipts);

module.exports = router;