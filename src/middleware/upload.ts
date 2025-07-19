import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const receiptsDir = path.join(uploadDir, 'receipts');
const documentsDir = path.join(uploadDir, 'documents');
const profilePicturesDir = path.join(uploadDir, 'profile-pictures');

// Create directories if they don't exist
[uploadDir, receiptsDir, documentsDir, profilePicturesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'));
  }
};

// Storage configuration for receipts
const receiptStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const userId = (req as any).user?.userId || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `receipt_${userId}_${timestamp}${extension}`;
    cb(null, filename);
  },
});

// Storage configuration for documents
const documentStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, documentsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const userId = (req as any).user?.userId || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `document_${userId}_${timestamp}${extension}`;
    cb(null, filename);
  },
});

// Storage configuration for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, profilePicturesDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const userId = (req as any).user?.userId || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `profile_${userId}_${timestamp}${extension}`;
    cb(null, filename);
  },
});

// File size limits (in bytes)
const fileLimits = {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5, // Maximum 5 files at once
};

// Profile picture specific limits
const profilePictureLimits = {
  fileSize: 5 * 1024 * 1024, // 5MB for profile pictures
  files: 1, // Only one profile picture
};

// Multer configurations
export const uploadReceipt = multer({
  storage: receiptStorage,
  fileFilter,
  limits: fileLimits,
});

export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter,
  limits: fileLimits,
});

export const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Only allow images for profile pictures
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG images are allowed for profile pictures.'));
    }
  },
  limits: profilePictureLimits,
});

// Helper function to get file URL
export const getFileUrl = (filename: string, type: 'receipt' | 'document' | 'profile-picture'): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${type}s/${filename}`;
};

// Helper function to delete file
export const deleteFile = (filepath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filepath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Cleanup old files (optional - for maintenance)
export const cleanupOldFiles = (directory: string, daysOld: number = 30): void => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error('Error reading directory for cleanup:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }

        if (stats.mtime < cutoffDate) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Error deleting old file:', err);
            } else {
              console.log('Deleted old file:', file);
            }
          });
        }
      });
    });
  });
};
