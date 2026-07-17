/**
 * ExpenseFlow - Email Service
 * Centralized email service using Resend HTTP API.
 * All email sending must go through this service.
 */
const Resend = require('resend');
const config = require('../../config');
const { logger } = require('../../utils/logger');

class EmailService {
  constructor() {
    // Initialize Resend only if API key is configured
    if (config.email?.resend?.apiKey) {
      // Resend v4+ exports { Resend: class }
      const ResendClient = Resend.Resend || Resend;
      this.resend = new ResendClient(config.email.resend.apiKey);
      this.isConfigured = true;
      logger.info('[EmailService] Resend initialized successfully');
    } else {
      this.resend = null;
      this.isConfigured = false;
      logger.warn('[EmailService] Resend API key not configured. Email sending disabled.');
    }
  }

  /**
   * Send an email using Resend
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} [options.text] - Plain text content (optional)
   * @param {string} [options.from] - Sender email (optional, uses default)
   * @param {string} [options.fromName] - Sender name (optional, uses default)
   * @param {string} [options.replyTo] - Reply-to email (optional)
   * @returns {Promise<Object>} Resend response
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
    from,
    fromName,
    replyTo,
    tags = {},
  }) {
    if (!this.isConfigured) {
      logger.warn(`[EmailService] Email not sent (not configured): ${subject} to ${to}`);
      return { skipped: true, reason: 'not_configured' };
    }

    try {
      const fromAddress = from || config.email?.from || 'noreply@expenseflow.app';
      const fromNameValue = fromName || config.email?.fromName || 'ExpenseFlow';
      const fromString = `${fromNameValue} <${fromAddress}>`;

      const emailData = {
        from: fromString,
        to: [to],
        subject,
        html,
        ...(text && { text }),
        ...(replyTo && { replyTo }),
      };

      const response = await this.resend.emails.send(emailData);

      logger.info(`[EmailService] Email sent successfully`, {
        to,
        subject,
        id: response.id,
        tags,
      });

      return {
        success: true,
        id: response.id,
        to,
        subject,
      };
    } catch (err) {
      logger.error(`[EmailService] Failed to send email`, {
        to,
        subject,
        error: err.message,
        tags,
      });
      
      // Don't throw - email failures should never break the application
      return {
        success: false,
        error: err.message,
        to,
        subject,
      };
    }
  }

  /**
   * Send email using a template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {string} [options.subject] - Email subject (optional if template provides it)
   * @returns {Promise<Object>} Resend response
   */
  async sendTemplate({ to, template, data, subject, tags = {} }) {
    const { getEmailTemplate } = require('../templates');
    
    const templateData = getEmailTemplate(template, data);
    
    return this.sendEmail({
      to,
      subject: subject || templateData.subject,
      html: templateData.html,
      text: templateData.text,
      tags: { ...tags, template },
    });
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(to, userName, verificationToken, appUrl) {
    return this.sendTemplate({
      to,
      template: 'emailVerification',
      data: {
        userName,
        verificationLink: `${appUrl}/verify-email?token=${verificationToken}`,
        appUrl,
      },
      tags: { type: 'verification' },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, userName, resetToken, appUrl) {
    return this.sendTemplate({
      to,
      template: 'passwordReset',
      data: {
        userName,
        resetLink: `${appUrl}/reset-password?token=${resetToken}`,
        appUrl,
      },
      tags: { type: 'password_reset' },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, userName, appUrl) {
    return this.sendTemplate({
      to,
      template: 'welcome',
      data: {
        userName,
        appUrl,
      },
      tags: { type: 'welcome' },
    });
  }

  /**
   * Send circle invitation email
   */
  async sendInvitationEmail(to, inviterName, circleName, invitationToken, appUrl) {
    return this.sendTemplate({
      to,
      template: 'circleInvitation',
      data: {
        inviterName,
        circleName,
        invitationLink: `${appUrl}/accept-invitation?token=${invitationToken}`,
        appUrl,
      },
      tags: { type: 'invitation' },
    });
  }

  /**
   * Send settlement reminder email
   */
  async sendSettlementReminder(to, userName, circleName, amount, currency, dueDate, appUrl) {
    return this.sendTemplate({
      to,
      template: 'settlementReminder',
      data: {
        userName,
        circleName,
        amount,
        currency,
        dueDate,
        appUrl,
      },
      tags: { type: 'settlement_reminder' },
    });
  }

  /**
   * Send settlement confirmation email
   */
  async sendSettlementConfirmation(to, userName, circleName, amount, currency, appUrl) {
    return this.sendTemplate({
      to,
      template: 'settlementConfirmation',
      data: {
        userName,
        circleName,
        amount,
        currency,
        appUrl,
      },
      tags: { type: 'settlement_confirmation' },
    });
  }

  /**
   * Send monthly summary email
   */
  async sendMonthlySummary(to, userName, summaryData, appUrl) {
    return this.sendTemplate({
      to,
      template: 'monthlySummary',
      data: {
        userName,
        ...summaryData,
        appUrl,
      },
      tags: { type: 'monthly_summary' },
    });
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(to, userName, title, message, actionUrl, appUrl) {
    return this.sendTemplate({
      to,
      template: 'notification',
      data: {
        userName,
        title,
        message,
        actionUrl: actionUrl || appUrl,
        appUrl,
      },
      tags: { type: 'notification' },
    });
  }
}

module.exports = new EmailService();