/**
 * ExpenseFlow - Settlement Validators
 * Zod schemas for settlement request validation.
 */
const { z } = require('zod');

const createSettlementSchema = z.object({
   body: z.object({
     circleId: z.string().min(1, 'Circle ID is required'),
     from: z.string().optional(),
     to: z.string().min(1, 'Receiver ID is required'),
     amount: z.number().min(0.01, 'Amount must be greater than 0'),
     currency: z.string().optional().default('USD'),
     paymentMethod: z.string().optional(),
     paymentReference: z.string().trim().max(100).optional().default(''),
     note: z.string().max(500).trim().optional().default(''),
   }),
 });

const confirmSettlementSchema = z.object({
   body: z.object({
     settlementId: z.string().min(1, 'Settlement ID is required'),
   }),
 });

const partialSettlementSchema = z.object({
   body: z.object({
     amount: z.number().min(0.01, 'Amount must be greater than 0'),
   }),
 });

const settlementIdParamSchema = z.object({
   params: z.object({
     settlementId: z.string().min(1, 'Settlement ID is required'),
   }),
 });

const circleIdParamSchema = z.object({
   params: z.object({
     circleId: z.string().min(1, 'Circle ID is required'),
   }),
 });

const paginationQuerySchema = z.object({
   query: z.object({
     page: z.coerce.number().int().min(1).max(1000).optional().default(1),
     limit: z.coerce.number().int().min(1).max(100).optional().default(20),
   }),
 });

module.exports = {
   createSettlementSchema,
   confirmSettlementSchema,
   partialSettlementSchema,
   settlementIdParamSchema,
   circleIdParamSchema,
   paginationQuerySchema,
 };
