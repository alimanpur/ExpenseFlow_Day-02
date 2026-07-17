/**
 * ExpenseFlow - AuditLog Model
 * Immutable audit trail for compliance and security monitoring.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'user.register', 'user.login', 'user.logout', 'user.update',
        'circle.create', 'circle.update', 'circle.delete', 'circle.archive',
        'member.add', 'member.remove', 'member.role_change',
        'expense.create', 'expense.update', 'expense.delete',
        'settlement.create', 'settlement.complete', 'settlement.confirm',
        'invitation.send', 'invitation.accept', 'invitation.decline',
        'payment.process',
      ],
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'targetModel',
      default: null,
    },
    targetModel: {
      type: String,
      enum: ['User', 'Circle', 'Member', 'Expense', 'Settlement', 'Invitation'],
      default: null,
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ circle: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year retention

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;