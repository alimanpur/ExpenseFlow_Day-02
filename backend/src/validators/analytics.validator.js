/**
 * ExpenseFlow - Analytics Validators
 * Zod schemas for analytics request validation.
 */
const { z } = require('zod');
const { REGEX } = require('../constants');

const monthlySpendingSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  }),
});

const weeklySpendingSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  }),
});

const dailySpendingSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'startDate must be before or equal to endDate',
  }),
});

const categoryDistributionSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'startDate must be before or equal to endDate',
  }),
});

const memberBalancesSchema = z.object({
  params: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID, 'Invalid circle ID'),
  }),
});

const circleComparisonSchema = z.object({
  query: z.object({
    circleIds: z.string().max(500).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

const topExpensesSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

const topPayersSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

const topReceiversSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

const settlementStatisticsSchema = z.object({
  params: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID, 'Invalid circle ID'),
  }),
});

const cashFlowSchema = z.object({
  query: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'startDate must be before or equal to endDate',
  }),
});

const dashboardSummarySchema = z.object({
  query: z.object({}),
});

module.exports = {
  monthlySpendingSchema,
  weeklySpendingSchema,
  dailySpendingSchema,
  categoryDistributionSchema,
  memberBalancesSchema,
  circleComparisonSchema,
  topExpensesSchema,
  topPayersSchema,
  topReceiversSchema,
  settlementStatisticsSchema,
  cashFlowSchema,
  dashboardSummarySchema,
};
