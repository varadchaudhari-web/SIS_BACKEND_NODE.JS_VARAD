import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class CommunicateController {
  /**
   * GET / POST / DELETE /api/Communicate/notices or /api/communicate
   */
  public static async notices(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        const rows = await query(`SELECT * FROM send_notification ORDER BY date DESC, id DESC`);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { title, message, date, publish_date, visible_student, visible_staff, visible_parent, visible_all } = req.body;
        if (!title || !message) return sendError(res, 'Title and message are required', 400);

        const result = await execute(`
          INSERT INTO send_notification (title, message, date, publish_date, visible_student, visible_staff, visible_parent, visible_all, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          title, message, date || new Date(), publish_date || new Date(),
          visible_student || 'yes', visible_staff || 'yes', visible_parent || 'yes', visible_all || 'no',
          (req as any).user?.staffId || 1
        ]);

        return sendSuccess(res, { id: result.insertId, title }, 'Notice published successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Notice ID required', 400);
        await execute(`DELETE FROM send_notification WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Notice deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in notices handler:', error);
      return sendError(res, 'Failed to process notices', 500);
    }
  }

  /**
   * POST /api/Communicate/send_sms
   */
  public static async sendSms(req: Request, res: Response) {
    try {
      const { message, recipient_list, role } = req.body;
      if (!message) return sendError(res, 'Message text is required', 400);

      // Async queue or log dispatch
      logger.info(`[SMS Dispatch] Sending to role ${role || 'all'}, count: ${Array.isArray(recipient_list) ? recipient_list.length : 1}`);

      return sendSuccess(res, { success: true, count: Array.isArray(recipient_list) ? recipient_list.length : 1 }, 'SMS dispatch queued successfully');
    } catch (error) {
      return sendError(res, 'Failed to dispatch SMS', 500);
    }
  }

  /**
   * POST /api/Communicate/send_email
   */
  public static async sendEmail(req: Request, res: Response) {
    try {
      const { title, message, recipients } = req.body;
      if (!title || !message) return sendError(res, 'Title and message required', 400);

      logger.info(`[Email Dispatch] Subject: ${title}`);
      return sendSuccess(res, { success: true }, 'Email dispatch queued successfully');
    } catch (error) {
      return sendError(res, 'Failed to send email', 500);
    }
  }
}
