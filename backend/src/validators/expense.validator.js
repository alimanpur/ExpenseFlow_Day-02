/**
 * ExpenseFlow - Expense Validators
 * Zod schemas for expense request validation.
 */
const { z } = require('zod');
const { SPLIT_METHODS } = require('../constants');

const splitSchema = z.object({
   user: z.string().min(1, 'User ID is required'),
   amount: z.number().min(0, 'Split amount cannot be negative').optional(),
   percentage: z.number().min(0).max(100).optional(),
   shares: z.number().int().min(1).optional().default(1),
 });

const createExpenseSchema = z.object({
    body: z.object({
      circleId: z.string().min(1, 'Circle ID is required'),
      title: z
        .string()
        .min(2, 'Title must be at least 2 characters')
        .max(200, 'Title cannot exceed 200 characters')
        .trim(),
      description: z
        .string()
        .max(1000, 'Description cannot exceed 1000 characters')
        .trim()
        .optional()
        .default(''),
      amount: z
        .number()
        .min(0.01, 'Amount must be greater than 0'),
      currency: z
        .string()
        .length(3)
        .toUpperCase()
        .optional()
        .default('USD'),
      paidBy: z
        .string()
        .min(1, 'Payer ID is required')
        .optional(),
      splitMethod: z
        .enum(Object.values(SPLIT_METHODS))
        .optional()
        .default(SPLIT_METHODS.EQUAL),
      category: z
        .string()
        .optional()
        .nullable(),
      date: z
        .string()
        .optional(),
      splits: z
        .array(splitSchema)
        .min(1, 'At least one split is required'),
     isRecurring: z.boolean().optional().default(false),
     recurringConfig: z
       .object({
         frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
         interval: z.number().int().min(1).default(1),
         endDate: z.string().optional(),
       })
       .optional(),
     notes: z
       .string()
       .max(2000, 'Notes cannot exceed 2000 characters')
       .trim()
       .optional()
       .default(''),
     tags: z
       .array(z.string().trim().max(30))
       .max(10)
       .optional()
       .default([]),
   }),
 });

const updateExpenseSchema = z.object({
   body: z.object({
     title: z
       .string()
       .min(2)
       .max(200)
       .trim()
       .optional(),
     description: z
       .string()
       .max(1000)
       .trim()
       .optional(),
     amount: z.number().min(0.01).optional(),
     currency: z.string().length(3).toUpperCase().optional(),
     splitMethod: z.enum(Object.values(SPLIT_METHODS)).optional(),
     category: z.string().optional().nullable(),
     date: z.string().optional(),
     splits: z
       .array(splitSchema)
       .min(1)
       .optional(),
     notes: z.string().max(2000).trim().optional(),
     tags: z.array(z.string().trim().max(30)).max(10).optional(),
   }).refine(data => Object.keys(data).length > 0, {
       message: 'At least one field must be provided',
     }),
 });

const expenseIdParamSchema = z.object({
   params: z.object({
     expenseId: z.string().min(1, 'Expense ID is required'),
   }),
 });

const paginationQuerySchema = z.object({
   query: z.object({
     page: z.coerce.number().int().min(1).max(1000).optional().default(1),
     limit: z.coerce.number().int().min(1).max(100).optional().default(20),
     search: z.string().max(100).optional(),
     category: z.string().optional().nullable(),
     startDate: z.string().optional(),
     endDate: z.string().optional(),
     status: z.enum(['pending', 'settled', 'partially_settled', 'cancelled']).optional(),
   }),
 });

const circleExpenseQuerySchema = z.object({
   query: z.object({
     page: z.coerce.number().int().min(1).max(1000).optional().default(1),
     limit: z.coerce.number().int().min(1).max(100).optional().default(20),
     category: z.string().optional().nullable(),
     startDate: z.string().optional(),
     endDate: z.string().optional(),
     search: z.string().max(100).optional(),
     status: z.enum(['pending', 'settled', 'partially_settled', 'cancelled']).optional(),
   }),
  });

const entriesQuerySchema = z.object({
   query: z.object({
     page: z.coerce.number().int().min(1).max(1000).optional().default(1),
     limit: z.coerce.number().int().min(1).max(100).optional().default(20),
     search: z.string().max(200).optional(),
     circleId: z.string().optional(),
     category: z.string().optional().nullable(),
     paidBy: z.string().optional(),
     participant: z.string().optional(),
     startDate: z.string().optional(),
     endDate: z.string().optional(),
     minAmount: z.coerce.number().min(0).optional(),
     maxAmount: z.coerce.number().min(0).optional(),
     splitMethod: z.enum(['equal', 'exact', 'percentage', 'shares']).optional(),
     status: z.enum(['pending', 'settled', 'partially_settled', 'cancelled']).optional(),
     isArchived: z.union([z.boolean(), z.string()]).optional(),
     hasReceipt: z.union([z.boolean(), z.string()]).optional(),
     currency: z.string().length(3).toUpperCase().optional(),
     sortBy: z.enum(['date', 'amount', 'title', 'createdAt', 'updatedAt']).optional().default('date'),
     sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
   }),
  });

const searchQuerySchema = z.object({
   query: z.object({
     q: z.string().min(2, 'Search query must be at least 2 characters').max(200),
     limit: z.coerce.number().int().min(1).max(100).optional().default(20),
   }),
  });

const bulkOperationSchema = z.object({
   body: z.object({
     expenseIds: z.array(z.string().min(1)).min(1, 'At least one expense ID is required'),
   }),
  });

const bulkCategorySchema = z.object({
   body: z.object({
     expenseIds: z.array(z.string().min(1)).min(1, 'At least one expense ID is required'),
     category: z.string().min(1, 'Category is required'),
   }),
  });

const bulkMoveSchema = z.object({
   body: z.object({
     expenseIds: z.array(z.string().min(1)).min(1, 'At least one expense ID is required'),
     targetCircleId: z.string().min(1, 'Target circle ID is required'),
   }),
  });

const exportSchema = z.object({
   params: z.object({
     format: z.enum(['csv', 'excel', 'json', 'pdf']),
   }),
  });

module.exports = {
   createExpenseSchema,
   updateExpenseSchema,
   expenseIdParamSchema,
   paginationQuerySchema,
   circleExpenseQuerySchema,
   entriesQuerySchema,
   searchQuerySchema,
   bulkOperationSchema,
   bulkCategorySchema,
   bulkMoveSchema,
   exportSchema,
  };
