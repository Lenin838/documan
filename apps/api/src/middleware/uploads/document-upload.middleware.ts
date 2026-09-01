import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

import { AppError } from '../../errors/app-error.js';

const uploadDirectory = path.resolve(
  process.cwd(),
  'uploads',
  'documents',
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1_000_000_000,
    )}${extension}`;

    callback(null, uniqueName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (
  _req,
  file,
  callback,
) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(
      new AppError(
        'Unsupported file type. Allowed types: PDF, DOC, DOCX, TXT, MD',
        400,
        'UNSUPPORTED_FILE_TYPE',
      ),
    );
  }

  callback(null, true);
};

export const documentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});