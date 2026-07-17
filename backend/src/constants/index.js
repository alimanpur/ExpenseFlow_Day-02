/**
 * ExpenseFlow - Constants
 * Centralized constants for the entire application.
 */

// ─── Roles & Permissions ─────────────────────────────────
const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
});

const ROLE_HIERARCHY = Object.freeze({
  [ROLES.OWNER]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.MEMBER]: 2,
  [ROLES.VIEWER]: 1,
});

const PERMISSIONS = Object.freeze({
  // Circle permissions
  UPDATE_CIRCLE: 'update:circle',
  DELETE_CIRCLE: 'delete:circle',
  INVITE_MEMBERS: 'invite:members',
  REMOVE_MEMBERS: 'remove:members',
  TRANSFER_OWNERSHIP: 'transfer:ownership',
  ARCHIVE_CIRCLE: 'archive:circle',

  // Expense permissions
  CREATE_EXPENSE: 'create:expense',
  UPDATE_EXPENSE: 'update:expense',
  DELETE_EXPENSE: 'delete:expense',
  VIEW_EXPENSE: 'view:expense',

  // Settlement permissions
  CREATE_SETTLEMENT: 'create:settlement',
  CONFIRM_SETTLEMENT: 'confirm:settlement',

  // Admin permissions
  MANAGE_SETTINGS: 'manage:settings',
  VIEW_ANALYTICS: 'view:analytics',
  EXPORT_DATA: 'export:data',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.UPDATE_CIRCLE,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CREATE_EXPENSE,
    PERMISSIONS.UPDATE_EXPENSE,
    PERMISSIONS.DELETE_EXPENSE,
    PERMISSIONS.VIEW_EXPENSE,
    PERMISSIONS.CREATE_SETTLEMENT,
    PERMISSIONS.CONFIRM_SETTLEMENT,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.CREATE_EXPENSE,
    PERMISSIONS.UPDATE_EXPENSE,
    PERMISSIONS.VIEW_EXPENSE,
    PERMISSIONS.CREATE_SETTLEMENT,
    PERMISSIONS.CONFIRM_SETTLEMENT,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_EXPENSE,
  ],
});

// ─── Split Methods ──────────────────────────────────────
const SPLIT_METHODS = Object.freeze({
  EQUAL: 'equal',
  PERCENTAGE: 'percentage',
  EXACT: 'exact',
  SHARES: 'shares',
  CUSTOM: 'custom',
});

// ─── Expense Statuses ────────────────────────────────────
const EXPENSE_STATUS = Object.freeze({
  PENDING: 'pending',
  SETTLED: 'settled',
  PARTIALLY_SETTLED: 'partially_settled',
  CANCELLED: 'cancelled',
});

// ─── Settlement Statuses ─────────────────────────────────
const SETTLEMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

// ─── Payment Methods ─────────────────────────────────────
const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  OTHER: 'other',
});

// ─── Notification Types ──────────────────────────────────
const NOTIFICATION_TYPES = Object.freeze({
  EXPENSE_ADDED: 'expense_added',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_DELETED: 'expense_deleted',
  SETTLEMENT_DUE: 'settlement_due',
  SETTLEMENT_COMPLETED: 'settlement_completed',
  SETTLEMENT_CONFIRMED: 'settlement_confirmed',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  GUEST_REGISTERED: 'guest_registered',
  PAYMENT_RECEIVED: 'payment_received',
  LARGE_EXPENSE: 'large_expense',
  CIRCLE_ARCHIVED: 'circle_archived',
});

// ─── Activity Types ──────────────────────────────────────
const ACTIVITY_TYPES = Object.freeze({
  CIRCLE_CREATED: 'circle_created',
  CIRCLE_UPDATED: 'circle_updated',
  CIRCLE_DELETED: 'circle_deleted',
  CIRCLE_ARCHIVED: 'circle_archived',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  EXPENSE_CREATED: 'expense_created',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_DELETED: 'expense_deleted',
  SETTLEMENT_CREATED: 'settlement_created',
  SETTLEMENT_COMPLETED: 'settlement_completed',
  SETTLEMENT_CONFIRMED: 'settlement_confirmed',
  SETTLEMENT_CANCELLED: 'settlement_cancelled',
  OWNERSHIP_TRANSFERRED: 'ownership_transferred',
  PROFILE_UPDATED: 'profile_updated',
});

// ─── Invitation Statuses ─────────────────────────────────
const INVITATION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

// ─── Member States ────────────────────────────────────────
const MEMBER_STATUS = Object.freeze({
  GUEST: 'guest',
  PENDING_INVITATION: 'pending_invitation',
  REGISTERED: 'registered',
  REMOVED: 'removed',
});

// ─── Currency Codes ──────────────────────────────────────
const CURRENCIES = Object.freeze({
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
});

// ─── HTTP Status Codes ───────────────────────────────────
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

// ─── Error Codes ─────────────────────────────────────────
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
});

// ─── Pagination ──────────────────────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

// ─── Token Types ─────────────────────────────────────────
const TOKEN_TYPES = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  INVITATION: 'invitation',
});

// ─── File Upload ─────────────────────────────────────────
const UPLOAD = Object.freeze({
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
  ALLOWED_ALL_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_FILES_PER_UPLOAD: 5,
});

// ─── Time Constants ──────────────────────────────────────
const TIME = Object.freeze({
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
});

// ─── Regex Patterns ──────────────────────────────────────
const REGEX = Object.freeze({
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s-]{10,15}$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  HEX_COLOR: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
  URL: /^https?:\/\/.+/,
});

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SPLIT_METHODS,
  EXPENSE_STATUS,
  SETTLEMENT_STATUS,
  PAYMENT_METHODS,
  NOTIFICATION_TYPES,
  ACTIVITY_TYPES,
  INVITATION_STATUS,
  MEMBER_STATUS,
  CURRENCIES,
  HTTP_STATUS,
  ERROR_CODES,
  PAGINATION,
  TOKEN_TYPES,
  UPLOAD,
  TIME,
  REGEX,
};
