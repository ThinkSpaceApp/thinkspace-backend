import * as multer from 'multer';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export const uploadPdfConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = './uploads/pdfs';
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${uniqueSuffix}-${originalName}`);
    },
  }),
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(null, false);
    }
    
    if (file.mimetype !== 'application/pdf') {
      return cb(null, false);
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, 
    files: 1,
  },
}; 