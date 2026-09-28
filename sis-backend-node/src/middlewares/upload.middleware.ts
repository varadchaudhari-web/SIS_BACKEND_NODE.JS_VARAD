import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(env.STORAGE.BASE_PATH, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage: tempStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max limit
  },
});
