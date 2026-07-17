/**
 * ExpenseFlow - Activity Validators
 * Zod schemas for activity request validation.
 */
const { z } = require('zod');
const { REGEX } = require('../constants');

const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

const circleIdParamSchema = z.object({
  params: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID, 'Invalid circle ID'),
  }),
});

module.exports = {
  paginationSchema,
  circleIdParamSchema,
};
