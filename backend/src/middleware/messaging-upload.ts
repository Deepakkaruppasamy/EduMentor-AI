import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure messaging upload directories exist
const dirs = ['uploads/messaging', 'uploads/messaging/images', 'uploads/messaging/audio', 'uploads/messaging/files'];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Image upload config
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/messaging/images'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Image type ${ext} not supported. Allowed: PNG, JPG, JPEG, GIF`));
  }
};

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFilter,
});

// Audio upload config
const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/messaging/audio'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname) || '.webm'}`);
  },
});

const audioFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.mp3', '.wav', '.webm', '.ogg', '.m4a'];
  const ext = path.extname(file.originalname).toLowerCase();
  // Allow if extension matches or if mimetype is audio
  if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error(`Audio type ${ext} not supported. Allowed: MP3, WAV, WebM`));
  }
};

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: audioFilter,
});

// File upload config (PDF, DOCX, PPT)
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/messaging/files'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `file-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.pdf', '.docx', '.pptx', '.doc', '.ppt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not supported. Allowed: PDF, DOCX, PPTX`));
  }
};

export const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: fileFilter,
});
