import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class AlumniController {
  /**
   * GET /api/alumni/alumnilist or /api/alumni
   */
  public static async getAlumni(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT als.*, s.admission_no, s.firstname, s.lastname, s.gender, s.email, s.mobileno,
               c.class as class_name, sec.section as section_name, ses.session as session_name
        FROM alumni_students als
        JOIN students s ON s.id = als.student_id
        LEFT JOIN student_session ss ON ss.student_id = s.id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        LEFT JOIN sessions ses ON ses.id = ss.session_id
        ORDER BY als.id DESC LIMIT 100
      `).catch(async () => {
        return await query(`SELECT * FROM alumni_students ORDER BY id DESC LIMIT 50`);
      });

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in getAlumni:', error);
      return sendError(res, 'Failed to fetch alumni', 500);
    }
  }

  /**
   * POST /api/alumni/add
   */
  public static async addAlumni(req: Request, res: Response) {
    try {
      const { student_id, current_email, current_phone, occupation, address } = req.body;
      const result = await execute(`
        INSERT INTO alumni_students (student_id, current_email, current_phone, occupation, address)
        VALUES (?, ?, ?, ?, ?)
      `, [student_id || 1, current_email || '', current_phone || '', occupation || '', address || '']);

      return sendSuccess(res, { id: result.insertId }, 'Alumni added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add alumni', 500);
    }
  }

  /**
   * POST /api/alumni/deletestudent/:id
   */
  public static async deleteAlumni(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await execute(`DELETE FROM alumni_students WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Alumni deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete alumni', 500);
    }
  }

  /**
   * GET /api/alumni/events
   */
  public static async getEvents(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM alumni_events ORDER BY id DESC`);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch alumni events', 500);
    }
  }

  /**
   * POST /api/alumni/add_event
   */
  public static async addEvent(req: Request, res: Response) {
    try {
      const { event_title, title, event_date, from_date, to_date, note, event_notification_message, event_for } = req.body;
      const eTitle = event_title || title || 'Alumni Reunion';
      const result = await execute(`
        INSERT INTO alumni_events (title, from_date, to_date, note, event_notification_message, event_for, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 'yes')
      `, [eTitle, event_date || from_date || new Date(), to_date || event_date || new Date(), note || '', event_notification_message || '', event_for || 'all']);

      return sendSuccess(res, { id: result.insertId }, 'Alumni event created', 201);
    } catch (error) {
      return sendError(res, 'Failed to add alumni event', 500);
    }
  }

  /**
   * POST /api/alumni/delete_event/:id
   */
  public static async deleteEvent(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await execute(`DELETE FROM alumni_events WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Event deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete alumni event', 500);
    }
  }
}
