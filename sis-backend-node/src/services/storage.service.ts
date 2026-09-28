import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class StorageService {
  /**
   * Ensure directory exists recursively
   */
  public static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Save a base64 encoded file string (supports data URI prefix e.g., "data:image/png;base64,...")
   * Optimizes images to WebP if applicable.
   */
  public static async saveBase64File(
    base64Data: string,
    filePrefix: string | number,
    subfolder: string
  ): Promise<string | null> {
    try {
      if (!base64Data || typeof base64Data !== 'string') return null;

      // If it's already an existing relative path
      if (base64Data.startsWith('uploads/') || base64Data.startsWith('/uploads/') || base64Data.startsWith('storage/')) {
        return base64Data.replace(/^\/+/, '');
      }

      const targetDir = path.join(env.STORAGE.BASE_PATH, subfolder);
      this.ensureDir(targetDir);

      let mime = 'application/octet-stream';
      let cleanBase64 = base64Data;

      if (base64Data.includes(';base64,')) {
        const parts = base64Data.split(';base64,');
        const mimeMatch = parts[0].match(/data:(.*)/);
        if (mimeMatch) mime = mimeMatch[1];
        cleanBase64 = parts[1];
      }

      const buffer = Buffer.from(cleanBase64, 'base64');
      const timestamp = Date.now();

      // Optimize image if JPEG, PNG, WEBP
      if (mime.startsWith('image/') && !mime.includes('svg')) {
        const filename = `${filePrefix}_${timestamp}.webp`;
        const filePath = path.join(targetDir, filename);

        await sharp(buffer)
          .webp({ quality: 80 })
          .toFile(filePath);

        return `storage/${subfolder}/${filename}`;
      } else {
        // Map document extension
        const ext = this.getExtensionFromMime(mime);
        const filename = `${filePrefix}_${timestamp}.${ext}`;
        const filePath = path.join(targetDir, filename);

        await fs.promises.writeFile(filePath, buffer);
        return `storage/${subfolder}/${filename}`;
      }
    } catch (error) {
      logger.error('Error saving base64 file:', error);
      return null;
    }
  }

  /**
   * Map MIME type to file extension
   */
  public static getExtensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/csv': 'csv',
      'text/plain': 'txt',
    };
    return map[mime] || 'dat';
  }

  /**
   * Find absolute path of an asset checking new storage and legacy uploads
   */
  public static resolveFilePath(relPath: string): string | null {
    const cleanRel = relPath.replace(/^\/+/, '');

    // Check new storage
    const newPath = path.resolve(env.STORAGE.BASE_PATH, '..', cleanRel);
    if (fs.existsSync(newPath)) return newPath;

    // Check directly in legacy uploads directory
    const legacyPath = path.resolve(env.STORAGE.LEGACY_UPLOADS, '..', cleanRel);
    if (fs.existsSync(legacyPath)) return legacyPath;

    // Check inside uploads root
    const inUploads = path.resolve(env.STORAGE.LEGACY_UPLOADS, path.basename(cleanRel));
    if (fs.existsSync(inUploads)) return inUploads;

    return null;
  }
}
