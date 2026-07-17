/**
 * ExpenseFlow - Auth Controller
 * HTTP request handlers for authentication endpoints.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const config = require('../config');
const { authService } = require('../services');

const { tokens, clear } = (() => {
  // Helper: set token cookies from service result
  const setCookieTokens = (res, result) => {
    const cookieOptions = {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: '/',
    };

    res.cookie('accessToken', result.tokens.accessToken, {
      ...cookieOptions,
      maxAge: config.cookie.accessTokenMaxAge,
    });

    res.cookie('refreshToken', result.tokens.refreshToken, {
      ...cookieOptions,
      maxAge: config.cookie.refreshTokenMaxAge,
    });
  };

  return {
    tokens: {
      set: setCookieTokens,
    },
    clear: (res) => {
      const clearOptions = {
        httpOnly: config.cookie.httpOnly,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: '/',
      };

      res.clearCookie('accessToken', clearOptions);
      res.clearCookie('refreshToken', clearOptions);
    },
  };
})();

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  tokens.set(res, result);
  ApiResponse.created('Registration successful', result).send(res);
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  tokens.set(res, result);
  ApiResponse.success('Login successful', result).send(res);
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.userId, refreshToken);
  clear(res);
  ApiResponse.success('Logout successful').send(res);
});

const refreshToken = catchAsync(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  tokens.set(res, result);
  ApiResponse.success('Token refreshed', result).send(res);
});

const verifyEmail = catchAsync(async (req, res) => {
  const user = await authService.verifyEmail(req.body.token);
  ApiResponse.success('Email verified successfully', user).send(res);
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  ApiResponse.success(result.message, result).send(res);
});

const resetPassword = catchAsync(async (req, res) => {
  const user = await authService.resetPassword(req.body.token, req.body.password);
  ApiResponse.success('Password reset successful', user).send(res);
});

const changePassword = catchAsync(async (req, res) => {
  const user = await authService.changePassword(req.userId, req.body.currentPassword, req.body.newPassword);
  ApiResponse.success('Password changed successfully', user).send(res);
});

const linkGuest = catchAsync(async (req, res) => {
  const result = await authService.linkGuest(req.body.memberId, req.userId);
  ApiResponse.success('Guest account linked', result).send(res);
});

const getPreferences = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.userId);
  ApiResponse.success('Preferences retrieved', user.preferences).send(res);
});

const updatePreferences = catchAsync(async (req, res) => {
  const allowedFields = [
    'preferences.currency',
    'preferences.language',
    'preferences.timezone',
    'preferences.notifications',
    'preferences.theme',
    'preferences.currencyChosen',
  ];
  
  const filteredUpdates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      filteredUpdates[field] = req.body[field];
    }
  }
  
  // Also support nested object format: { preferences: { currency: 'USD' } }
  if (req.body.preferences && typeof req.body.preferences === 'object') {
    for (const field of allowedFields) {
      const key = field.split('.')[1];
      if (req.body.preferences[key] !== undefined) {
        filteredUpdates[field] = req.body.preferences[key];
      }
    }
  }

  // Also support flat format: { currency: 'USD', currencyChosen: true }
  const flatFieldMap = {
    currency: 'preferences.currency',
    language: 'preferences.language',
    timezone: 'preferences.timezone',
    currencyChosen: 'preferences.currencyChosen',
  };
  
  for (const [flatKey, dottedKey] of Object.entries(flatFieldMap)) {
    if (req.body[flatKey] !== undefined) {
      filteredUpdates[dottedKey] = req.body[flatKey];
    }
  }

  const user = await authService.updateProfile(req.userId, filteredUpdates);
  ApiResponse.success('Preferences updated', user.preferences).send(res);
});

const getProfile = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.userId);
  ApiResponse.success('Profile retrieved', user).send(res);
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.userId, req.body);
  ApiResponse.success('Profile updated', user).send(res);
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  linkGuest,
};