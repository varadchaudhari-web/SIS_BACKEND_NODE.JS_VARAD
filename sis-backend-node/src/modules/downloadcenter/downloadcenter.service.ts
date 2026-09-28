import fs from 'fs';
import path from 'path';
import { DownloadCenterRepository } from './downloadcenter.repository';
import { logger } from '../../utils/logger';

export class DownloadCenterService {
  static async getAll(type?: string) {
    return await DownloadCenterRepository.getAll(type);
  }

  static async getById(id: any) {
    return await DownloadCenterRepository.getById(id);
  }

  static async getStudentDownloads(classId?: number | string, sectionId?: number | string, type?: string) {
    return await DownloadCenterRepository.getStudentDownloads(classId, sectionId, type);
  }

  static async upload(body: any, file?: Express.Multer.File) {
    const { content_title, title, content_type, type, content_available, upload_date, date, note, visibility, is_public, class_id, section_id } = body;

    let relativeFilePath = '';

    // Handle uploaded file or base64 data
    const uploadsDir = path.resolve(process.cwd(), 'uploads/school_content/material');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (file) {
      relativeFilePath = `uploads/school_content/material/${file.filename}`;
    } else if (body.file && typeof body.file === 'object' && body.file.data && body.file.name) {
      const fileName = `${Date.now()}_${body.file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const fullPath = path.join(uploadsDir, fileName);
      const base64Data = body.file.data.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
      relativeFilePath = `uploads/school_content/material/${fileName}`;
    }

    const insertId = await DownloadCenterRepository.createContent({
      title: content_title || title,
      type: content_type || type || 'assignments',
      is_public: visibility || is_public || 'yes',
      class_id: class_id ? Number(class_id) : null,
      cls_sec_id: section_id ? Number(section_id) : null,
      file: relativeFilePath,
      note: note || '',
      date: upload_date || date || new Date().toISOString().split('T')[0],
      content_available: Array.isArray(content_available) ? content_available : []
    });

    return { id: insertId, file: relativeFilePath };
  }

  static async deleteContent(id: any) {
    const record = await DownloadCenterRepository.getById(id);
    if (record && record.file) {
      try {
        const fullPath = path.resolve(process.cwd(), record.file);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        logger.warn('Failed to delete physical content file:', err);
      }
    }
    return await DownloadCenterRepository.deleteContent(id);
  }

  static getFilePath(filename: string): string | null {
    const safeName = path.basename(filename);
    const candidatePaths = [
      path.resolve(process.cwd(), 'uploads/school_content/material', safeName),
      path.resolve(process.cwd(), safeName),
      path.resolve(process.cwd(), 'uploads', safeName)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
}
