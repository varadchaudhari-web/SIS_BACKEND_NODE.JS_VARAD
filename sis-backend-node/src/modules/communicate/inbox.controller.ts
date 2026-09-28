import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class InboxController {
  /**
   * GET /api/inbox-messages
   */
  public static async getInboxMessages(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM inbox_messages ORDER BY id DESC LIMIT 50`);
      
      const formatted = (rows as any[]).map(row => {
        let replies = [];
        try {
          if (row.replies) {
            replies = typeof row.replies === 'string' ? JSON.parse(row.replies) : row.replies;
          }
        } catch {
          replies = [];
        }

        return {
          id: row.id,
          senderName: row.sender_name,
          senderRole: row.sender_role,
          senderEmail: row.sender_email,
          subject: row.subject,
          message: row.message,
          type: row.type || 'Internal',
          isRead: !!row.is_read,
          date: row.received_at || row.created_at,
          replies: replies,
        };
      });

      return res.status(200).json(formatted);
    } catch (error) {
      logger.error('Error fetching inbox messages:', error);
      return sendError(res, 'Failed to fetch inbox messages', 500);
    }
  }

  /**
   * POST /api/inbox-messages
   */
  public static async createInboxMessage(req: Request, res: Response) {
    try {
      const { senderName, senderRole, senderEmail, subject, message, type } = req.body;

      if (!senderName || !message) {
        return sendError(res, 'Sender name and message required', 400);
      }

      const result = await execute(`
        INSERT INTO inbox_messages (sender_name, sender_role, sender_email, subject, message, type, is_read, received_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
      `, [
        senderName,
        senderRole || 'Staff',
        senderEmail || '',
        subject || 'Direct Message',
        message,
        type || 'Internal'
      ]);

      return sendSuccess(res, { id: result.insertId }, 'Message created successfully', 201);
    } catch (error) {
      logger.error('Error creating inbox message:', error);
      return sendError(res, 'Failed to create inbox message', 500);
    }
  }

  /**
   * POST /api/inbox-messages/:id
   */
  public static async handleInboxAction(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { action, replyMessage, author, isMe } = req.body;

      const current = await queryOne(`SELECT * FROM inbox_messages WHERE id = ?`, [id]);
      if (!current) {
        return sendError(res, 'Message not found', 404);
      }

      if (action === 'read' || action === 'mark_read') {
        await execute(`UPDATE inbox_messages SET is_read = 1 WHERE id = ?`, [id]);
        return sendSuccess(res, { id, is_read: 1 }, 'Marked as read');
      }

      if (replyMessage) {
        let replies: any[] = [];
        try {
          if (current.replies) {
            replies = typeof current.replies === 'string' ? JSON.parse(current.replies) : current.replies;
          }
        } catch {
          replies = [];
        }

        replies.push({
          author: author || 'Admin (You)',
          message: replyMessage,
          date: new Date().toISOString(),
          isMe: isMe ?? true,
        });

        await execute(`UPDATE inbox_messages SET replies = ? WHERE id = ?`, [JSON.stringify(replies), id]);
        return sendSuccess(res, { id, replies }, 'Reply sent successfully');
      }

      return sendSuccess(res, { id }, 'Action performed successfully');
    } catch (error) {
      return sendError(res, 'Failed to handle inbox action', 500);
    }
  }
}
