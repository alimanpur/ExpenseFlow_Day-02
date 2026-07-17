/**
 * ExpenseFlow - Auth Service
 * Handles user authentication, registration, token management, and password operations.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitizeUser } = require('../utils/helpers');
const { TIME } = require('../constants');
const { warn, info } = require('../utils/logger');
const emailService = require('../services/email/EmailService');

class AuthService {
  async register({ name, email, password }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Generate all token data before creating user to avoid double-save issues
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    // Create the user first (password gets hashed by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Now generate tokens using the saved user's _id
    const tokens = this.generateTokens(user);

    // Persist refresh token directly to avoid full-document save issues
    await User.findByIdAndUpdate(user._id, {
      $push: {
        refreshTokens: {
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * TIME.ONE_DAY),
          device: 'web',
        },
      },
    });

    // Send verification email (fire-and-forget, never breaks registration)
    if (verificationToken) {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      emailService.sendVerificationEmail(user.email, user.name, verificationToken, appUrl)
        .then(() => info(`[auth.service] Verification email sent to ${user.email}`))
        .catch((err) => warn(`[auth.service] Verification email failed:`, err.message));
    }

    // Guest Member Lifecycle (Phase D, Step 6): if a name-only guest member
    // exists anywhere in the platform with a matching name, surface it so the
    // UI can offer to merge the guest into this new account.
    let matchedGuests = [];
    try {
      const { circleService } = require('./index');
      matchedGuests = await circleService.findMatchingGuests(name);
    } catch (err) {
      warn('[auth.service] guest detection failed:', err.message);
    }

    return {
      user: sanitizeUser(user),
      tokens,
      verificationToken,
      matchedGuests,
    };
  }

  /**
   * Merge a guest member into the newly registered user's account.
   */
  async linkGuest(memberId, userId) {
    const { circleService } = require('./index');
    return circleService.linkGuestMember(memberId, userId);
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.isDeleted) {
      throw ApiError.forbidden('This account has been deleted');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated');
    }

    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw ApiError.unauthorized(`Account is locked. Try again in ${lockTimeRemaining} minutes`);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw ApiError.unauthorized('Invalid email or password');
    }

    await user.resetLoginAttempts();
    user.lastLoginAt = new Date();
    
    const tokens = this.generateTokens(user);
    await user.save();

    return {
      user: sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Logout user - invalidate refresh token
   */
  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    await user.save();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await User.findById(decoded.sub);

      if (!user) throw ApiError.unauthorized('User not found');
      if (!user.isActive || user.isDeleted) {
        throw ApiError.forbidden('Account is not active');
      }

      const storedToken = user.refreshTokens.find((rt) => rt.token === refreshToken);
      if (!storedToken) throw ApiError.unauthorized('Refresh token not found');

      if (storedToken.expiresAt < new Date()) {
        user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
        await user.save();
        throw ApiError.unauthorized('Refresh token has expired');
      }

      // Rotate refresh token
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
      const tokens = this.generateTokens(user);
      await user.save();

      return {
        user: sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    // Store refresh token in user document
    const refreshTokenExpiry = new Date(Date.now() + 7 * TIME.ONE_DAY);
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
      device: 'web',
    });

    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    return { accessToken, refreshToken };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return sanitizeUser(user);
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      return { message: 'If an account exists, a password reset link has been sent' };
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email (fire-and-forget, never breaks the flow)
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    emailService.sendPasswordResetEmail(user.email, user.name, resetToken, appUrl)
      .then(() => info(`[auth.service] Password reset email sent to ${user.email}`))
      .catch((err) => warn(`[auth.service] Password reset email failed:`, err.message));

    return {
      message: 'If an account exists, a password reset link has been sent',
      resetToken,
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    return sanitizeUser(user);
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw ApiError.notFound('User not found');

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    return sanitizeUser(user);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['name', 'phone', 'avatar'];
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    // Handle preferences: support both nested object and dot-notation keys
    const preferenceKeys = Object.keys(updates).filter(k => k.startsWith('preferences.'));
    if (preferenceKeys.length > 0) {
      for (const key of preferenceKeys) {
        filteredUpdates[key] = updates[key];
      }
    } else if (updates.preferences && typeof updates.preferences === 'object') {
      for (const [key, value] of Object.entries(updates.preferences)) {
        if (value !== undefined) {
          filteredUpdates[`preferences.${key}`] = value;
        }
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: filteredUpdates }, {
      new: true,
      runValidators: true,
    });

    if (!user) throw ApiError.notFound('User not found');
    return sanitizeUser(user);
  }
}

module.exports = new AuthService();