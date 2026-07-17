/**
 * ExpenseFlow - Notification Validators
 * Zod schemas for notification request validation.
 */
const { z } = require('zod');
const { REGEX } = require('../constants');

const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: z.string().regex(REGEX.OBJECT_ID, 'Invalid notification ID'),
  }),
});

const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    expenseCreated: z.boolean().optional(),
    expenseUpdated: z.boolean().optional(),
    expenseDeleted: z.boolean().optional(),
    settlementDue: z.boolean().optional(),
    settlementCompleted: z.boolean().optional(),
    invitationReceived: z.boolean().optional(),
    invitationAccepted: z.boolean().optional(),
    invitationDeclined: z.boolean().optional(),
    memberAdded: z.boolean().optional(),
    memberRemoved: z.boolean().optional(),
    groupUpdated: z.boolean().optional(),
    paymentReceived: z.boolean().optional(),
    reminder: z.boolean().optional(),
    emailExpenseCreated: z.boolean().optional(),
    emailSettlementDue: z.boolean().optional(),
    emailInvitation: z.boolean().optional(),
    emailWeeklyDigest: z.boolean().optional(),
    emailMonthlyReport: z.boolean().optional(),
  }).passthrough().refine(data => Object.keys(data).length > 0, {
    message: 'At least one preference must be provided',
  }),
});

module.exports = {
  paginationSchema,
  notificationIdParamSchema,
  updateNotificationPreferencesSchema,
};
