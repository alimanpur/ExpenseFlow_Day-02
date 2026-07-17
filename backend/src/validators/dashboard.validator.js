/**
 * ExpenseFlow - Dashboard Validators
 * Zod schemas for dashboard request validation.
 */
const { z } = require('zod');

const getDashboardSchema = z.object({
  query: z.object({}),
});

module.exports = {
  getDashboardSchema,
};
