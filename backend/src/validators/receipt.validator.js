/**
 * ExpenseFlow - Receipt Validators
 * Zod schemas for receipt upload request validation.
 */
const { z } = require('zod');
const { REGEX } = require('../constants');

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

const uploadReceiptSchema = z.object({
  params: z.object({
    expenseId: z.string().regex(REGEX.OBJECT_ID, 'Invalid expense ID'),
  }),
});

module.exports = {
  expenseIdParamSchema,
  replaceReceiptSchema,
  uploadReceiptSchema,
};
