import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';
import { query, queryOne, execute } from '../../config/database';

export class CollectionsController {
  private static getCollectionFilePath(collectionName: string): string {
    const filename = `${String(collectionName || '').replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
    const newPath = path.join(env.STORAGE.BASE_PATH, 'collections', filename);
    const legacyPath = path.join(env.STORAGE.LEGACY_UPLOADS, filename);

    if (fs.existsSync(newPath)) return newPath;
    if (fs.existsSync(legacyPath)) return legacyPath;

    // Default to new storage path
    const dir = path.join(env.STORAGE.BASE_PATH, 'collections');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return newPath;
  }

  /**
   * GET /api/collections/:name
   */
  public static async getCollection(req: Request, res: Response) {
    try {
      const name = String(req.params.name || '');
      const filePath = CollectionsController.getCollectionFilePath(name);

      if (!fs.existsSync(filePath)) {
        return res.status(200).json([]);
      }

      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw || '[]');
      return res.status(200).json(data);
    } catch (error) {
      logger.error('Error reading collection:', error);
      return sendError(res, 'Failed to fetch collection', 500);
    }
  }

  /**
   * POST /api/collections/:name
   */
  public static async saveCollection(req: Request, res: Response) {
    try {
      const name = String(req.params.name || '');
      const filePath = CollectionsController.getCollectionFilePath(name);
      const data = req.body;

      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return sendSuccess(res, { success: true, count: Array.isArray(data) ? data.length : 1 });
    } catch (error) {
      logger.error('Error saving collection:', error);
      return sendError(res, 'Failed to save collection', 500);
    }
  }

  /**
   * GET /api/collections/handle_collection/:key
   * POST /api/collections/handle_collection/:key
   * Exactly matching PHP Collections::handle_collection
   */
  public static async handleCollection(req: Request, res: Response) {
    const key = String(req.params.key || '');
    const method = req.method.toUpperCase();

    try {
      if (key === 'hostel_payments') {
        if (method === 'GET') {
          const rows = await query<any[]>(`SELECT * FROM hostel_payments ORDER BY id DESC`);
          const data = (rows || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name,
            roomNo: row.room_no,
            amount: Number(row.amount),
            mode: row.mode,
            referenceNo: row.reference_no,
            date: row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0]) : '',
            description: row.description
          }));
          return res.status(200).json({ success: true, data });
        } else if (method === 'POST') {
          const input = req.body || {};
          const studentId = Number(input.studentId || input.student_id) || 1;
          const studentName = String(input.studentName || input.student_name || '');
          const roomNo = String(input.roomNo || input.room_no || '');
          const amount = Number(input.amount) || 0;
          const mode = String(input.mode || 'Cash');
          const referenceNo = input.referenceNo || input.reference_no || null;
          const date = input.date || new Date().toISOString().split('T')[0];
          const description = input.description || null;

          const result = await execute(`
            INSERT INTO hostel_payments (student_id, student_name, room_no, amount, mode, reference_no, date, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [studentId, studentName, roomNo, amount, mode, referenceNo, date, description]);

          const saved = {
            id: result.insertId,
            studentId,
            studentName,
            roomNo,
            amount,
            mode,
            referenceNo,
            date,
            description
          };
          return res.status(201).json({ success: true, data: saved });
        } else {
          return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }
      }

      // Fallback for file-based collections
      const filePath = CollectionsController.getCollectionFilePath(key);
      let collectionData: any[] = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          collectionData = JSON.parse(raw || '[]');
          if (!Array.isArray(collectionData)) collectionData = [];
        } catch {}
      }

      if (method === 'GET') {
        return res.status(200).json({ success: true, data: collectionData });
      } else if (method === 'POST') {
        const input = req.body || {};
        if (!input.id) input.id = Date.now().toString();
        collectionData.push(input);
        await fs.promises.writeFile(filePath, JSON.stringify(collectionData, null, 2), 'utf-8');
        return res.status(201).json({ success: true, data: input });
      } else {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
      }
    } catch (error) {
      logger.error(`Error in handleCollection for key ${key}:`, error);
      return sendError(res, 'Internal server error in handle_collection', 500);
    }
  }

  /**
   * GET/PUT/DELETE /api/collections/handle_collection_by_id/:key/:id
   * Exactly matching PHP Collections::handle_collection_by_id
   */
  public static async handleCollectionById(req: Request, res: Response) {
    const key = String(req.params.key || '');
    const id = req.params.id;
    const method = req.method.toUpperCase();

    try {
      if (key === 'hostel_payments') {
        if (method === 'GET') {
          const row = await queryOne<any>(`SELECT * FROM hostel_payments WHERE id = ?`, [id]);
          if (!row) {
            return res.status(404).json({ success: false, message: 'Record not found' });
          }
          return res.status(200).json({
            success: true,
            data: {
              id: row.id,
              studentId: row.student_id,
              studentName: row.student_name,
              roomNo: row.room_no,
              amount: Number(row.amount),
              mode: row.mode,
              referenceNo: row.reference_no,
              date: row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0]) : '',
              description: row.description
            }
          });
        } else if (method === 'PUT') {
          const input = req.body || {};
          await execute(`
            UPDATE hostel_payments
            SET student_id = COALESCE(?, student_id),
                student_name = COALESCE(?, student_name),
                room_no = COALESCE(?, room_no),
                amount = COALESCE(?, amount),
                mode = COALESCE(?, mode),
                reference_no = COALESCE(?, reference_no),
                date = COALESCE(?, date),
                description = COALESCE(?, description)
            WHERE id = ?
          `, [
            input.studentId || input.student_id || null,
            input.studentName || input.student_name || null,
            input.roomNo || input.room_no || null,
            input.amount !== undefined ? Number(input.amount) : null,
            input.mode || null,
            input.referenceNo || input.reference_no || null,
            input.date || null,
            input.description || null,
            id
          ]);
          return res.status(200).json({ success: true, data: { id: Number(id), ...input } });
        } else if (method === 'DELETE') {
          await execute(`DELETE FROM hostel_payments WHERE id = ?`, [id]);
          return res.status(200).json({ success: true, message: 'Deleted successfully' });
        } else {
          return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }
      }

      // Fallback for file-based collections
      const filePath = CollectionsController.getCollectionFilePath(key);
      let collectionData: any[] = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          collectionData = JSON.parse(raw || '[]');
          if (!Array.isArray(collectionData)) collectionData = [];
        } catch {}
      }

      const index = collectionData.findIndex(item => String(item.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }

      if (method === 'GET') {
        return res.status(200).json({ success: true, data: collectionData[index] });
      } else if (method === 'PUT') {
        const input = req.body || {};
        collectionData[index] = { ...collectionData[index], ...input, id };
        await fs.promises.writeFile(filePath, JSON.stringify(collectionData, null, 2), 'utf-8');
        return res.status(200).json({ success: true, data: collectionData[index] });
      } else if (method === 'DELETE') {
        collectionData.splice(index, 1);
        await fs.promises.writeFile(filePath, JSON.stringify(collectionData, null, 2), 'utf-8');
        return res.status(200).json({ success: true, message: 'Deleted successfully' });
      } else {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
      }
    } catch (error) {
      logger.error(`Error in handleCollectionById for key ${key} and id ${id}:`, error);
      return sendError(res, 'Internal server error in handle_collection_by_id', 500);
    }
  }
}
