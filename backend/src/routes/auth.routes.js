/**
 * ExpenseFlow - Auth Routes
 * Authentication and user management routes.
 */
const { Router } = require('express');
const { authController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { authValidator } = require('../validators');

const router = Router();

// Public routes
router.post('/register', validate(authValidator.registerSchema), authController.register);
router.post('/login', validate(authValidator.loginSchema), authController.login);
router.post('/refresh-token', validate(authValidator.refreshTokenSchema), authController.refreshToken);
router.post('/verify-email', validate(authValidator.verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', validate(authValidator.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(authValidator.resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(authValidator.changePasswordSchema), authController.changePassword);
router.post('/link-guest', authenticate, authController.linkGuest);
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);
router.get('/preferences', authenticate, authController.getPreferences);
router.patch('/preferences', authenticate, authController.updatePreferences);

module.exports = router;