import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.docx', '.pptx', '.txt', '.doc', '.mp3', '.wav', '.m4a', '.webm', '.mpeg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not supported. Allowed: PDF, DOCX, PPTX, TXT, MP3, WAV, M4A, WEBM, MPEG, PNG, JPG, JPEG, GIF, WEBP, SVG`));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter,
});
