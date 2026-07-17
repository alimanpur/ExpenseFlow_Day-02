/**
 * ExpenseFlow - File Upload Middleware
 * Multer configuration for handling file uploads with Cloudinary integration.
 */
const multer = require('multer');
const path = require('path');
const config = require('../config');
const ApiError = require('../utils/ApiError');

// Local storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type ${file.mimetype} is not allowed. Allowed types: ${config.upload.allowedTypes.join(', ')}`), false);
  }
};

// Multer instance for single file upload
const uploadSingle = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
}).single('file');

// Multer instance for multiple file upload
const uploadMultiple = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
}).array('files', 5);

// Multer instance for avatar upload
const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed for avatars'), false);
    }
  },
}).single('avatar');

// Wrapper to handle multer errors
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('File too large. Maximum size is 5MB'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(ApiError.badRequest('Too many files. Maximum is 5'));
        }
        return next(ApiError.badRequest(err.message));
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };
};

// Multer instance for receipt upload (memory storage for swappable providers)
const uploadReceiptMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, `File type ${file.mimetype} is not allowed. Allowed types: ${allowed.join(', ')}`), false);
    }
  },
}).single('receipt');

module.exports = {
  uploadSingle: (req, res, next) => handleUpload(uploadSingle)(req, res, next),
  uploadMultiple: (req, res, next) => handleUpload(uploadMultiple)(req, res, next),
  uploadReceipt: (req, res, next) => handleUpload(uploadReceiptMemory)(req, res, next),
  uploadAvatar: (req, res, next) => handleUpload(uploadAvatar)(req, res, next),
};