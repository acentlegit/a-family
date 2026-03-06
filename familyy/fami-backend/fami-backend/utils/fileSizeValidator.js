/**
 * File Size Validator for Media Uploads
 * Enforces file size restrictions to prevent large uploads to S3
 * 
 * Requirements:
 * - Images: Max 10MB
 * - Videos: Max 50MB
 * - Documents: Max 5MB
 */

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_GENERAL_SIZE = 100 * 1024 * 1024; // 100MB (absolute max)

/**
 * Validate file size based on file type
 * @param {Object} file - Multer file object
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateFileSize(file) {
  if (!file || !file.size) {
    return { valid: false, error: 'Invalid file object' };
  }

  const fileSize = file.size;
  const mimeType = file.mimetype || '';
  const fileName = file.originalname || '';

  // Check absolute maximum
  if (fileSize > MAX_GENERAL_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(fileSize)}) exceeds maximum allowed size of ${formatFileSize(MAX_GENERAL_SIZE)}`
    };
  }

  // Validate based on file type
  if (mimeType.startsWith('image/')) {
    if (fileSize > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `Image size (${formatFileSize(fileSize)}) exceeds maximum allowed size of ${formatFileSize(MAX_IMAGE_SIZE)}`
      };
    }
  } else if (mimeType.startsWith('video/')) {
    if (fileSize > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Video size (${formatFileSize(fileSize)}) exceeds maximum allowed size of ${formatFileSize(MAX_VIDEO_SIZE)}`
      };
    }
  } else {
    // Documents and other files
    if (fileSize > MAX_DOCUMENT_SIZE) {
      return {
        valid: false,
        error: `File size (${formatFileSize(fileSize)}) exceeds maximum allowed size of ${formatFileSize(MAX_DOCUMENT_SIZE)}`
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validate multiple files
 * @param {Array} files - Array of Multer file objects
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, errors: ['No files provided'] };
  }

  const errors = [];
  
  for (const file of files) {
    const validation = validateFileSize(file);
    if (!validation.valid) {
      errors.push(`${file.originalname || 'Unknown file'}: ${validation.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format file size to human-readable format
 * @param {Number} bytes - File size in bytes
 * @returns {String} - Formatted size (e.g., "10.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get maximum allowed file size for a given MIME type
 * @param {String} mimeType - MIME type
 * @returns {Number} - Maximum size in bytes
 */
function getMaxFileSize(mimeType) {
  if (mimeType && mimeType.startsWith('image/')) {
    return MAX_IMAGE_SIZE;
  } else if (mimeType && mimeType.startsWith('video/')) {
    return MAX_VIDEO_SIZE;
  } else {
    return MAX_DOCUMENT_SIZE;
  }
}

/**
 * Middleware for Multer to validate file size
 * @param {Object} req - Express request
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback
 */
function fileSizeValidator(req, file, cb) {
  // Note: file.size might not be available at this stage in Multer
  // This is a placeholder - actual validation should happen after upload
  cb(null, true);
}

module.exports = {
  validateFileSize,
  validateFiles,
  formatFileSize,
  getMaxFileSize,
  fileSizeValidator,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_DOCUMENT_SIZE,
  MAX_GENERAL_SIZE,
};
