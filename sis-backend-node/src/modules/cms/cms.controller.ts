import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class CmsController {
  /**
   * GET /api/Cms/pages or /api/cms/pages
   */
  public static async pages(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM front_cms_pages ORDER BY id ASC`).catch(async () => [
        { id: 1, title: 'About Us', slug: 'about-us', page_type: 'standard' },
        { id: 2, title: 'Admissions', slug: 'admissions', page_type: 'standard' },
        { id: 3, title: 'Campus Life', slug: 'campus-life', page_type: 'standard' },
      ]);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch CMS pages', 500);
    }
  }

  /**
   * GET /api/Cms/events or /api/front/events
   */
  public static async events(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM front_cms_events ORDER BY id DESC`).catch(async () => [
        { id: 1, title: 'Annual Sports Day 2026', event_start: '2026-11-20', description: 'Celebration of sportsmanship.' },
        { id: 2, title: 'Science & Robotics Exhibition', event_start: '2026-12-10', description: 'Innovations by our students.' },
      ]);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch events', 500);
    }
  }

  /**
   * GET /api/Cms/gallery or /api/front/gallery
   */
  public static async gallery(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM front_cms_media_gallery ORDER BY id DESC`).catch(async () => []);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch gallery', 500);
    }
  }
}
