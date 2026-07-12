const path    = require('path');
const multer  = require('multer');
const ApiError = require('../utils/ApiError');

// ─── Storage configuration ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'photos' ? 'uploads/photos' : 'uploads/documents';
    cb(null, path.join(__dirname, '..', folder));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext    = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'photos') {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new ApiError(400, 'Photos must be image files (jpg, png, webp, etc.)'));
    }
  }
  // Documents: allow common types
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
  ];
  if (file.fieldname === 'documents' && !allowedDocTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Unsupported document type'));
  }
  cb(null, true);
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

/**
 * uploadAssetFiles — middleware for asset create/update routes.
 * Accepts up to 5 photos and 3 documents.
 */
const uploadAssetFiles = upload.fields([
  { name: 'photos',    maxCount: 5 },
  { name: 'documents', maxCount: 3 },
]);

module.exports = { uploadAssetFiles };
