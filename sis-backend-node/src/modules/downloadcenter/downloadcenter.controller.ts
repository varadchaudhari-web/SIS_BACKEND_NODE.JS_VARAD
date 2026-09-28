import { Request, Response } from 'express';
import { DownloadCenterService } from './downloadcenter.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class DownloadCenterController {
  /**
   * GET /api/download-center
   */
  public static async getAll(req: Request, res: Response) {
    try {
      const type = req.query.type as string;
      const rows = await DownloadCenterService.getAll(type);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in getAll downloads:', error);
      return sendError(res, 'Failed to fetch contents', 500);
    }
  }

  public static async detail(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      if (!id) return sendError(res, 'Content ID required', 400);
      const row = await DownloadCenterService.getById(id);
      if (!row) return sendError(res, 'Content not found', 404);
      return sendSuccess(res, row);
    } catch (error) {
      return sendError(res, 'Failed to fetch content detail', 500);
    }
  }

  public static async assignments(req: Request, res: Response) {
    try {
      const rows = await DownloadCenterService.getAll('assignments');
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch assignments', 500);
    }
  }

  public static async studyMaterial(req: Request, res: Response) {
    try {
      const rows = await DownloadCenterService.getAll('study_material');
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch study material', 500);
    }
  }

  public static async syllabus(req: Request, res: Response) {
    try {
      const rows = await DownloadCenterService.getAll('syllabus');
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch syllabus', 500);
    }
  }

  public static async other(req: Request, res: Response) {
    try {
      const rows = await DownloadCenterService.getAll('other_download');
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch other downloads', 500);
    }
  }

  public static async getStudentDownloads(req: Request, res: Response) {
    try {
      const { class_id, section_id, type } = req.query as any;
      const rows = await DownloadCenterService.getStudentDownloads(class_id, section_id, type);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch student downloads', 500);
    }
  }

  public static async upload(req: Request, res: Response) {
    try {
      const { content_title, title } = req.body;
      if (!content_title && !title) {
        return sendError(res, 'Content title is required', 400);
      }

      const result = await DownloadCenterService.upload(req.body, req.file);
      return sendSuccess(res, result, 'Content uploaded successfully', 201);
    } catch (error) {
      logger.error('Error uploading content:', error);
      return sendError(res, 'Failed to upload content', 500);
    }
  }

  public static async deleteContent(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id || req.query.id;
      if (!id) return sendError(res, 'Content ID required', 400);
      await DownloadCenterService.deleteContent(id);
      return sendSuccess(res, { id }, 'Content deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete content', 500);
    }
  }

  public static async file(req: Request, res: Response) {
    try {
      const filename = String(req.params.filename || req.query.file || '');
      if (!filename) return sendError(res, 'Filename is required', 400);

      const filePath = DownloadCenterService.getFilePath(filename);
      if (!filePath) {
        return sendError(res, 'File not found', 404);
      }

      return res.download(filePath);
    } catch (error) {
      return sendError(res, 'Failed to stream file', 500);
    }
  }
}
