/**
 * ExpenseFlow - Email Templates
 * Centralized email template management.
 */

/**
 * Get email template by name
 * @param {string} templateName - Template identifier
 * @param {Object} data - Template data
 * @returns {Object} Template with subject, html, and text
 */
function getEmailTemplate(templateName, data = {}) {
  const templates = {
    emailVerification: getEmailVerificationTemplate(data),
    passwordReset: getPasswordResetTemplate(data),
    welcome: getWelcomeTemplate(data),
    circleInvitation: getCircleInvitationTemplate(data),
    settlementReminder: getSettlementReminderTemplate(data),
    settlementConfirmation: getSettlementConfirmationTemplate(data),
    monthlySummary: getMonthlySummaryTemplate(data),
    notification: getNotificationTemplate(data),
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return template;
}

/**
 * Email Verification Template
 */
function getEmailVerificationTemplate(data) {
  const { userName, verificationLink, appUrl } = data;

  return {
    subject: 'Verify Your Email Address - ExpenseFlow',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to ExpenseFlow</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
    <a href="${verificationLink}" class="button">Verify Email Address</a>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;">${verificationLink}</p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't create an account, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

Thank you for signing up! Please verify your email address by visiting this link:

${verificationLink}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Password Reset Template
 */
function getPasswordResetTemplate(data) {
  const { userName, resetLink, appUrl } = data;

  return {
    subject: 'Reset Your Password - ExpenseFlow',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Password Reset Request</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="${resetLink}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

We received a request to reset your password. Visit this link to create a new password:

${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Welcome Email Template
 */
function getWelcomeTemplate(data) {
  const { userName, appUrl } = data;

  return {
    subject: 'Welcome to ExpenseFlow! 🎉',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ExpenseFlow</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    .features { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .feature { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to ExpenseFlow! 🎉</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>Welcome to ExpenseFlow! We're excited to have you on board. ExpenseFlow helps you split expenses, settle debts, and manage shared finances with ease.</p>
    
    <div class="features">
      <h3>What you can do:</h3>
      <div class="feature">✓ Create circles for roommates, trips, or groups</div>
      <div class="feature">✓ Track shared expenses automatically</div>
      <div class="feature">✓ Get smart settlement suggestions</div>
      <div class="feature">✓ Receive payment reminders</div>
      <div class="feature">✓ View detailed analytics and reports</div>
    </div>

    <a href="${appUrl}" class="button">Get Started</a>
    
    <p>Need help? Check out our <a href="${appUrl}/help">Help Center</a> or contact our support team.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

Welcome to ExpenseFlow! We're excited to have you on board.

ExpenseFlow helps you split expenses, settle debts, and manage shared finances with ease.

Get started: ${appUrl}

Need help? Check out our Help Center or contact our support team.

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Circle Invitation Template
 */
function getCircleInvitationTemplate(data) {
  const { inviterName, circleName, invitationLink, appUrl } = data;

  return {
    subject: `You've been invited to join ${circleName} - ExpenseFlow`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Circle Invitation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>You're Invited! 🎉</h1>
  </div>
  <div class="content">
    <p>Hi there,</p>
    <p><strong>${inviterName}</strong> has invited you to join the circle <strong>${circleName}</strong> on ExpenseFlow.</p>
    <p>ExpenseFlow makes it easy to split expenses and settle debts within groups. Click the button below to accept the invitation:</p>
    <a href="${invitationLink}" class="button">Accept Invitation</a>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;">${invitationLink}</p>
    <p>This invitation will expire in 7 days.</p>
    <p>Don't have an account? No problem! The link will guide you through the signup process.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
</body>
</html>
    `,
    text: `Hi there,

${inviterName} has invited you to join the circle "${circleName}" on ExpenseFlow.

Accept the invitation: ${invitationLink}

This invitation will expire in 7 days.

Don't have an account? No problem! The link will guide you through the signup process.

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Settlement Reminder Template
 */
function getSettlementReminderTemplate(data) {
  const { userName, circleName, amount, currency, dueDate, appUrl } = data;

  return {
    subject: `Settlement Reminder: ${currency} ${amount} due in ${circleName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settlement Reminder</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F59E0B; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Payment Reminder</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>This is a friendly reminder that you have a pending settlement in <strong>${circleName}</strong>.</p>
    
    <div class="amount">${currency} ${amount}</div>
    
    <p><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString() : 'ASAP'}</p>
    
    <p>Please settle this amount to keep your circle balances up to date.</p>
    
    <a href="${appUrl}/settlements" class="button">View Settlements</a>
    
    <p>If you've already made this payment, please mark it as complete in the app.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

This is a friendly reminder that you have a pending settlement in "${circleName}".

Amount: ${currency} ${amount}
Due Date: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'ASAP'}

Please settle this amount to keep your circle balances up to date.

View settlements: ${appUrl}/settlements

If you've already made this payment, please mark it as complete in the app.

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Settlement Confirmation Template
 */
function getSettlementConfirmationTemplate(data) {
  const { userName, circleName, amount, currency, appUrl } = data;

  return {
    subject: `Settlement Confirmed: ${currency} ${amount} in ${circleName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settlement Confirmed</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount { font-size: 32px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✓ Settlement Confirmed</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>Great news! A settlement has been confirmed in <strong>${circleName}</strong>.</p>
    
    <div class="amount">${currency} ${amount}</div>
    
    <p>The payment has been recorded and your balance has been updated.</p>
    
    <a href="${appUrl}/settlements" class="button">View Details</a>
    
    <p>Thank you for using ExpenseFlow!</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

Great news! A settlement has been confirmed in "${circleName}".

Amount: ${currency} ${amount}

The payment has been recorded and your balance has been updated.

View details: ${appUrl}/settlements

Thank you for using ExpenseFlow!

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Monthly Summary Template
 */
function getMonthlySummaryTemplate(data) {
  const { userName, appUrl, totalSpent, totalOwed, totalToReceive, expenseCount, circleName } = data;

  return {
    subject: `Monthly Expense Summary - ${circleName || 'Your Circles'}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Summary</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 6px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #4F46E5; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Monthly Expense Summary</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>Here's your monthly expense summary${circleName ? ` for ${circleName}` : ''}:</p>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${expenseCount || 0}</div>
        <div class="stat-label">Total Expenses</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalSpent ? '$' + totalSpent.toFixed(2) : '$0.00'}</div>
        <div class="stat-label">Total Spent</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalOwed ? '$' + totalOwed.toFixed(2) : '$0.00'}</div>
        <div class="stat-label">You Owe</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalToReceive ? '$' + totalToReceive.toFixed(2) : '$0.00'}</div>
        <div class="stat-label">You're Owed</div>
      </div>
    </div>

    <a href="${appUrl}/reports" class="button">View Full Report</a>
    
    <p>Stay on top of your finances with ExpenseFlow!</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

Here's your monthly expense summary${circleName ? ` for ${circleName}` : ''}:

Total Expenses: ${expenseCount || 0}
Total Spent: $${totalSpent ? totalSpent.toFixed(2) : '0.00'}
You Owe: $${totalOwed ? totalOwed.toFixed(2) : '0.00'}
You're Owed: $${totalToReceive ? totalToReceive.toFixed(2) : '0.00'}

View full report: ${appUrl}/reports

Stay on top of your finances with ExpenseFlow!

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

/**
 * Notification Template
 */
function getNotificationTemplate(data) {
  const { userName, title, message, actionUrl, appUrl } = data;

  return {
    subject: title,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>${message}</p>
    ${actionUrl ? `<a href="${actionUrl}" class="button">View Details</a>` : ''}
    <p><a href="${appUrl}">Visit ExpenseFlow</a></p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ExpenseFlow. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    text: `Hi ${userName || 'there'},

${title}

${message}

${actionUrl ? `View details: ${actionUrl}` : ''}

Visit ExpenseFlow: ${appUrl}

© ${new Date().getFullYear()} ExpenseFlow`,
  };
}

module.exports = {
  getEmailTemplate,
};