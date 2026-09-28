import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class CalendarController {
  /**
   * GET /api/calendar/events or /admin/calendar/getevents or /user/calendar/getevents
   */
  public static async getEvents(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT 
          id,
          event_title as title,
          event_title,
          event_description as description,
          event_description,
          start_date as start,
          start_date,
          end_date as end,
          end_date,
          event_color as backgroundColor,
          event_color as borderColor,
          event_color,
          event_type,
          event_for,
          role_id,
          is_active
        FROM events
        ORDER BY start_date DESC
      `);

      return res.status(200).json(rows);
    } catch (error) {
      logger.error('Error fetching calendar events:', error);
      return sendError(res, 'Failed to fetch calendar events', 500);
    }
  }

  /**
   * GET /api/calendar/events/:id or /admin/calendar/gettaskbyid/:id or /admin/calendar/view_event/:id
   */
  public static async getEventById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const event = await queryOne(`
        SELECT 
          id,
          event_title as title,
          event_title,
          event_description as description,
          event_description,
          start_date as start,
          start_date,
          end_date as end,
          end_date,
          event_color as backgroundColor,
          event_color as borderColor,
          event_color,
          event_type,
          event_for,
          role_id,
          is_active
        FROM events 
        WHERE id = ?
      `, [id]);

      if (!event) {
        return sendError(res, 'Event not found', 404);
      }

      return sendSuccess(res, event);
    } catch (error) {
      return sendError(res, 'Failed to fetch event', 500);
    }
  }

  /**
   * POST /api/calendar/events or /admin/calendar/saveevent or /admin/calendar/updateevent or /admin/calendar/addtodo
   */
  public static async saveEvent(req: Request, res: Response) {
    try {
      const {
        id,
        event_title,
        title,
        event_description,
        description,
        start_date,
        start,
        end_date,
        end,
        event_type,
        event_color,
        colorid,
        event_for,
        role_id,
        is_active
      } = req.body;

      const eTitle = event_title || title || 'Untitled Event';
      const eDesc = event_description || description || '';
      const eStart = start_date || start || new Date();
      const eEnd = end_date || end || eStart;
      const eType = event_type || 'task';
      const eColor = event_color || colorid || '#3b82f6';
      const eFor = event_for || 'all';
      const eRole = role_id || null;
      const eActive = is_active || 'no';

      if (id) {
        await execute(`
          UPDATE events
          SET event_title = ?, event_description = ?, start_date = ?, end_date = ?,
              event_type = ?, event_color = ?, event_for = ?, role_id = ?, is_active = ?
          WHERE id = ?
        `, [eTitle, eDesc, eStart, eEnd, eType, eColor, eFor, eRole, eActive, id]);

        return sendSuccess(res, { id, title: eTitle }, 'Event updated successfully');
      } else {
        const result = await execute(`
          INSERT INTO events (event_title, event_description, start_date, end_date, event_type, event_color, event_for, role_id, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [eTitle, eDesc, eStart, eEnd, eType, eColor, eFor, eRole, eActive]);

        return sendSuccess(res, { id: result.insertId, title: eTitle }, 'Event created successfully', 201);
      }
    } catch (error) {
      logger.error('Error saving calendar event:', error);
      return sendError(res, 'Failed to save event', 500);
    }
  }

  /**
   * POST /api/calendar/toggle-status or /admin/calendar/markcomplete/:id
   */
  public static async toggleStatus(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id;
      const active = req.body.is_active || req.body.active || 'yes';

      await execute(`UPDATE events SET is_active = ? WHERE id = ?`, [active, id]);
      return sendSuccess(res, { id, is_active: active }, 'Status updated successfully');
    } catch (error) {
      return sendError(res, 'Failed to toggle status', 500);
    }
  }

  /**
   * DELETE /api/calendar/events/:id or POST /admin/calendar/delete_event/:id
   */
  public static async deleteEvent(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id;
      await execute(`DELETE FROM events WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Event deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete event', 500);
    }
  }
}
