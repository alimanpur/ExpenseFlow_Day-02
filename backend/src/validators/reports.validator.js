/**
 * ExpenseFlow - Reports Validators
 * Zod schemas for report request validation.
 */
const { z } = require('zod');
const { REGEX } = require('../constants');

const monthlyReportSchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
  }),
});

const circleReportSchema = z.object({
  params: z.object({
    circleId: z.string().regex(REGEX.OBJECT_ID, 'Invalid circle ID'),
  }),
});

const memberReportSchema = z.object({
  query: z.object({
    memberId: z.string().regex(REGEX.OBJECT_ID, 'Invalid member ID'),
    circleId: z.string().regex(REGEX.OBJECT_ID).optional().nullable(),
    startDate: z.string().datetime('Invalid start date'),
    endDate: z.string().datetime('Invalid end date'),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'startDate must be before or equal to endDate',
  }),
});

const settlementReportSchema = z.object({
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

const expenseReportSchema = z.object({
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

const exportReportSchema = z.object({
  body: z.object({
    format: z.enum(['csv', 'json', 'pdf']),
    report: z.object({}).passthrough(),
  }),
});

module.exports = {
  monthlyReportSchema,
  circleReportSchema,
  memberReportSchema,
  settlementReportSchema,
  expenseReportSchema,
  exportReportSchema,
};
