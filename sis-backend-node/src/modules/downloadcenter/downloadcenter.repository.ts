import { query, queryOne, execute } from '../../config/database';

export class DownloadCenterRepository {
  static async getAll(type?: string) {
    let sql = `
      SELECT c.*,
             cls.class as class_name,
             sec.section as section_name
      FROM contents c
      LEFT JOIN classes cls ON cls.id = c.class_id
      LEFT JOIN sections sec ON sec.id = c.cls_sec_id
      WHERE (c.is_active = 'yes' OR c.is_active = 1)
    `;
    const params: any[] = [];
    if (type) {
      sql += ` AND c.type = ?`;
      params.push(type);
    }
    sql += ` ORDER BY c.id DESC`;
    return await query(sql, params);
  }

  static async getById(id: any) {
    return await queryOne(`SELECT * FROM contents WHERE id = ?`, [id]);
  }

  static async getStudentDownloads(classId?: number | string, sectionId?: number | string, type?: string) {
    let sql = `
      SELECT c.*,
             cls.class as class_name,
             sec.section as section_name
      FROM contents c
      LEFT JOIN classes cls ON cls.id = c.class_id
      LEFT JOIN sections sec ON sec.id = c.cls_sec_id
      WHERE (c.is_active = 'yes' OR c.is_active = 1)
        AND (c.is_public = 'yes' OR c.class_id = ? OR c.class_id IS NULL OR c.class_id = 0)
    `;
    const params: any[] = [classId || 0];

    if (sectionId) {
      sql += ` AND (c.cls_sec_id = ? OR c.cls_sec_id IS NULL OR c.cls_sec_id = 0)`;
      params.push(sectionId);
    }

    if (type) {
      sql += ` AND c.type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY c.id DESC`;
    return await query(sql, params);
  }

  static async createContent(data: {
    title: string;
    type: string;
    is_public?: string;
    class_id?: number | null;
    cls_sec_id?: number | null;
    file?: string;
    created_by?: number;
    note?: string;
    date?: string;
    content_available?: string[];
  }) {
    const result = await execute(`
      INSERT INTO contents (title, type, is_public, class_id, cls_sec_id, file, created_by, note, is_active, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'yes', ?)
    `, [
      data.title,
      data.type || 'assignments',
      data.is_public || 'yes',
      data.class_id || null,
      data.cls_sec_id || null,
      data.file || '',
      data.created_by || 1,
      data.note || '',
      data.date || new Date().toISOString().split('T')[0]
    ]);

    const contentId = result.insertId;

    if (data.content_available && Array.isArray(data.content_available)) {
      for (const role of data.content_available) {
        await execute(`
          INSERT INTO content_for (role, content_id)
          VALUES (?, ?)
        `, [role, contentId]);
      }
    }

    return contentId;
  }

  static async deleteContent(id: any) {
    await execute(`DELETE FROM content_for WHERE content_id = ?`, [id]);
    return await execute(`DELETE FROM contents WHERE id = ?`, [id]);
  }
}
