/**
 * ExpenseFlow - Search Validators
 * Zod schemas for search request validation.
 */
const { z } = require('zod');

const searchSchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters').max(100),
    type: z.enum(['expenses', 'circles', 'members', 'settlements']).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    sortBy: z.enum(['relevance', 'date', 'amount', 'name']).optional().default('relevance'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

module.exports = {
  searchSchema,
};
