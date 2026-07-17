/**
 * ExpenseFlow - Circle Validators
 * Zod schemas for circle/group request validation.
 */
const { z } = require('zod');

const createCircleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Circle name must be at least 2 characters')
      .max(100, 'Circle name cannot exceed 100 characters')
      .trim(),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional()
      .default(''),
    currency: z
      .string()
      .length(3, 'Currency must be a 3-letter code')
      .toUpperCase()
      .optional()
      .default('USD'),
    maxMembers: z
      .number()
      .int()
      .min(2, 'Minimum 2 members required')
      .max(200, 'Maximum 200 members allowed')
      .optional()
      .default(50),
  }),
});

  const updateCircleSchema = z.object({
    body: z.object({
      name: z
        .string()
        .min(2, 'Circle name must be at least 2 characters')
        .max(100, 'Circle name cannot exceed 100 characters')
        .trim()
        .optional(),
      description: z
        .string()
        .max(500, 'Description cannot exceed 500 characters')
        .trim()
        .optional(),
      currency: z
        .string()
        .length(3, 'Currency must be a 3-letter code')
        .toUpperCase()
        .optional(),
      maxMembers: z
        .number()
        .int()
        .min(2)
        .max(200)
        .optional(),
    }).refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
  });

const inviteMemberSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please provide a valid email')
      .toLowerCase()
      .trim(),
    role: z
      .string()
      .default('member')
      .refine(val => ['member', 'admin', 'viewer'].includes(val), 'Invalid role'),
    message: z
      .string()
      .max(500, 'Message cannot exceed 500 characters')
      .trim()
      .optional()
      .default(''),
  }),
});

const addMemberByNameSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .trim(),
    role: z
      .string()
      .default('member')
      .refine(val => ['member', 'admin', 'viewer'].includes(val), 'Invalid role'),
  }),
});

  const updateMemberRoleSchema = z.object({
    body: z.object({
      role: z.enum(['admin', 'member', 'viewer'], 'Invalid role'),
    }),
  });

const circleIdParamSchema = z.object({
  params: z.object({
    circleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid circle ID'),
  }),
});

const circleAndMemberIdParamSchema = z.object({
  params: z.object({
    circleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid circle ID'),
    memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid member ID'),
  }),
});

const tokenParamSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});

const getUserCirclesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(100).optional(),
    archived: z.enum(['true', 'false']).optional(),
  }),
});

const transferOwnershipSchema = z.object({
  body: z.object({
    newOwnerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  }),
});

// No-op schema for routes that need no validation
const paramsOnlySchema = z.object({});

module.exports = {
  createCircleSchema,
  updateCircleSchema,
  inviteMemberSchema,
  addMemberByNameSchema,
  updateMemberRoleSchema,
  circleIdParamSchema,
  circleAndMemberIdParamSchema,
  getUserCirclesSchema,
  tokenParamSchema,
  transferOwnershipSchema,
  paramsOnlySchema,
};
