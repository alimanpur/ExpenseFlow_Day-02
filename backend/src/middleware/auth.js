/**
 * ExpenseFlow - Authentication Middleware
 * JWT verification, role-based access control, and permission checking.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { Member } = require('../models');
const ApiError = require('../utils/ApiError');
const { ROLES, ROLE_PERMISSIONS } = require('../constants');

/**
 * Verify JWT access token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(ApiError.unauthorized('Access token is required'));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // In development mode without DB, use mock user
    if (config.isDev) {
      try {
        const user = await User.findById(decoded.sub).select('-password -refreshTokens');
        if (user) {
          req.user = user;
          req.userId = user._id.toString();
          return next();
        }
      } catch {
        // DB not available, use mock user
        req.user = { _id: decoded.sub, name: decoded.name, email: decoded.email };
        req.userId = decoded.sub;
        return next();
      }
    } else {
      // Check if user exists (production mode)
      const user = await User.findById(decoded.sub).select('-password -refreshTokens');
      if (!user) {
        return next(ApiError.unauthorized('User not found'));
      }

      // Check if user is active
      if (!user.isActive || user.isDeleted) {
        return next(ApiError.forbidden('Account is deactivated or deleted'));
      }

      // Attach user to request
      req.user = user;
      req.userId = user._id.toString();
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token has expired', { code: 'TOKEN_EXPIRED' }));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid access token'));
    }
    next(error);
  }
};

/**
 * Optional authentication - attaches user if token present, but doesn't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      const user = await User.findById(decoded.sub).select('-password -refreshTokens');
      if (user && user.isActive && !user.isDeleted) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }
    next();
  } catch {
    next();
  }
};

/**
 * Check if user has required role in a circle
 */
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const circleId = req.params.circleId || req.body.circleId;
      if (!circleId) {
        return next(ApiError.badRequest('Circle ID is required'));
      }

      const member = await Member.findOne({
        user: req.userId,
        circle: circleId,
        isActive: true,
      });

      if (!member) {
        return next(ApiError.forbidden('You are not a member of this circle'));
      }

      const hasRole = roles.some((role) => member.role === role);
      if (!hasRole) {
        return next(ApiError.forbidden('Insufficient permissions for this action'));
      }

      req.member = member;
      req.memberRole = member.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has required permission in a circle
 */
const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      const circleId = req.params.circleId || req.body.circleId;
      if (!circleId) {
        return next(ApiError.badRequest('Circle ID is required'));
      }

      const member = await Member.findOne({
        user: req.userId,
        circle: circleId,
        isActive: true,
      });

      if (!member) {
        return next(ApiError.forbidden('You are not a member of this circle'));
      }

      const userPermissions = ROLE_PERMISSIONS[member.role] || [];
      const hasPermission = permissions.some((perm) => userPermissions.includes(perm));

      if (!hasPermission) {
        return next(ApiError.forbidden('Insufficient permissions for this action'));
      }

      req.member = member;
      req.memberRole = member.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is the circle owner
 */
const requireOwner = async (req, res, next) => {
  try {
    const circleId = req.params.circleId || req.body.circleId;
    if (!circleId) {
      return next(ApiError.badRequest('Circle ID is required'));
    }

    const member = await Member.findOne({
      user: req.userId,
      circle: circleId,
      isActive: true,
    });

    if (!member || member.role !== ROLES.OWNER) {
      return next(ApiError.forbidden('Only the circle owner can perform this action'));
    }

    req.member = member;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  requireOwner,
};