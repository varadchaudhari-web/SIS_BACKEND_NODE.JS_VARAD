import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

function saveBase64File(base64Str?: string, originalName?: string, folder = 'visitors'): string {
  if (!base64Str) return '';
  // If it's already just a short file name or relative path
  if (!base64Str.startsWith('data:') && base64Str.length <= 100) {
    return base64Str;
  }

  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'front_office', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const ext = originalName ? path.extname(originalName) : (matches ? `.${matches[1].split('/')[1] || 'bin'}` : '.bin');
    const safeName = originalName ? path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_') : 'file';
    const filename = `${Date.now()}_${safeName}${ext}`.substring(0, 95);
    const dataBuffer = Buffer.from(matches ? matches[2] : base64Str, 'base64');

    fs.writeFileSync(path.join(uploadDir, filename), dataBuffer);
    return filename;
  } catch (err) {
    logger.error('Error saving base64 file:', err);
    return originalName ? originalName.substring(0, 95) : 'file.bin';
  }
}

export class FrontOfficeController {
  /**
   * GET / POST / PUT / DELETE /api/frontoffice/admission-enquiries or /admission_enquiries
   */
  public static async admissionEnquiries(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        const { status, class_id, source, date_from, date_to } = req.query as any;
        let sql = `
          SELECT e.*, c.class as class_name, s.source as source_name, r.reference as reference_name
          FROM enquiry e
          LEFT JOIN classes c ON c.id = e.class
          LEFT JOIN source s ON s.id = e.source OR s.source = e.source
          LEFT JOIN reference r ON r.id = e.reference OR r.reference = e.reference
          WHERE 1=1
        `;
        const params: any[] = [];
        if (id) {
          sql += ` AND e.id = ?`;
          params.push(id);
          const row = await queryOne(sql, params);
          return sendSuccess(res, row);
        }
        if (status && status !== 'all' && status !== 'All') {
          sql += ` AND LOWER(e.status) = LOWER(?)`;
          params.push(status);
        }
        if (class_id && class_id !== 'all' && class_id !== 'All') {
          sql += ` AND e.class = ?`;
          params.push(class_id);
        }
        if (source && source !== 'all' && source !== 'All') {
          sql += ` AND (e.source = ? OR s.source = ?)`;
          params.push(source, source);
        }
        if (date_from) {
          sql += ` AND e.date >= ?`;
          params.push(date_from);
        }
        if (date_to) {
          sql += ` AND e.date <= ?`;
          params.push(date_to);
        }
        sql += ` ORDER BY e.id DESC`;
        const rows = await query(sql, params);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { name, contact, email, address, reference, description, date, follow_up_date, note, source, assigned, class: classId, no_of_child, status } = req.body || {};
        if (!name || !contact) return sendError(res, 'Name and contact are required', 400);

        const recordDate = date && !date.startsWith('0000') ? date : new Date().toISOString().split('T')[0];
        const followUp = follow_up_date && !follow_up_date.startsWith('0000') && follow_up_date !== '—' ? follow_up_date : recordDate;

        const result = await execute(`
          INSERT INTO enquiry (name, contact, email, address, reference, description, date, follow_up_date, note, source, assigned, class, no_of_child, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name,
          contact,
          email || '',
          address || '',
          reference || '',
          description || '',
          recordDate,
          followUp,
          note || '',
          source || 'Walk-in',
          assigned || '',
          Number(classId) || 1,
          String(no_of_child || 1),
          status || 'active'
        ]);

        return sendSuccess(res, { id: result.insertId, name, status: status || 'active' }, 'Enquiry recorded successfully', 201);
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!id) return sendError(res, 'Enquiry ID is required', 400);

        const { name, contact, email, address, reference, description, date, follow_up_date, note, source, assigned, class: classId, no_of_child, status } = req.body || {};

        const validFollowUp = follow_up_date && !follow_up_date.startsWith('0000') && follow_up_date !== '—' ? follow_up_date : null;

        await execute(`
          UPDATE enquiry SET
            name = COALESCE(?, name),
            contact = COALESCE(?, contact),
            email = COALESCE(?, email),
            address = COALESCE(?, address),
            reference = COALESCE(?, reference),
            description = COALESCE(?, description),
            date = COALESCE(?, date),
            follow_up_date = COALESCE(?, follow_up_date),
            note = COALESCE(?, note),
            source = COALESCE(?, source),
            assigned = COALESCE(?, assigned),
            class = COALESCE(?, class),
            no_of_child = COALESCE(?, no_of_child),
            status = COALESCE(?, status)
          WHERE id = ?
        `, [
          name !== undefined ? name : null,
          contact !== undefined ? contact : null,
          email !== undefined ? email : null,
          address !== undefined ? address : null,
          reference !== undefined ? reference : null,
          description !== undefined ? description : null,
          date !== undefined && date !== '' ? date : null,
          validFollowUp,
          note !== undefined ? note : null,
          source !== undefined ? source : null,
          assigned !== undefined ? assigned : null,
          classId !== undefined ? Number(classId) : null,
          no_of_child !== undefined ? String(no_of_child) : null,
          status !== undefined ? status : null,
          id
        ]);

        return sendSuccess(res, { id, status }, 'Enquiry updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Enquiry ID required', 400);
        await execute(`DELETE FROM enquiry WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Enquiry deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in admissionEnquiries:', error);
      return sendError(res, 'Failed to process admission enquiries', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/frontoffice/visitors
   */
  public static async visitors(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        let sql = `SELECT * FROM visitors_book`;
        const params: any[] = [];
        if (id) {
          sql += ` WHERE id = ?`;
          params.push(id);
          const row = await queryOne(sql, params);
          return sendSuccess(res, row);
        }
        sql += ` ORDER BY id DESC`;
        const rows = await query(sql);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { source, purpose, name, email, contact, id_proof, no_of_pepple, num_of_person, date, in_time, out_time, note, image, document, document_data, document_name } = req.body || {};
        if (!name) return sendError(res, 'Visitor name is required', 400);

        const savedImage = saveBase64File(document_data || image || document, document_name, 'visitors');

        const result = await execute(`
          INSERT INTO visitors_book (source, purpose, name, email, contact, id_proof, no_of_pepple, date, in_time, out_time, note, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          source || 'Front Office',
          purpose || 'General',
          name,
          email || 'visitor@example.com',
          contact || '',
          id_proof || 'Aadhar Card',
          Number(no_of_pepple || num_of_person || 1),
          date || new Date().toISOString().split('T')[0],
          in_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          out_time || '',
          note || '',
          savedImage
        ]);

        return sendSuccess(res, { id: result.insertId, name, document: savedImage }, 'Visitor entry created', 201);
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!id) return sendError(res, 'Visitor ID required', 400);
        const { source, purpose, name, email, contact, id_proof, no_of_pepple, num_of_person, date, in_time, out_time, note, image, document, document_data, document_name } = req.body || {};

        const rawDoc = document_data || image || document;
        const savedImage = rawDoc ? saveBase64File(rawDoc, document_name, 'visitors') : undefined;

        await execute(`
          UPDATE visitors_book SET
            source = COALESCE(?, source),
            purpose = COALESCE(?, purpose),
            name = COALESCE(?, name),
            email = COALESCE(?, email),
            contact = COALESCE(?, contact),
            id_proof = COALESCE(?, id_proof),
            no_of_pepple = COALESCE(?, no_of_pepple),
            date = COALESCE(?, date),
            in_time = COALESCE(?, in_time),
            out_time = COALESCE(?, out_time),
            note = COALESCE(?, note),
            image = COALESCE(?, image)
          WHERE id = ?
        `, [
          source !== undefined ? source : null,
          purpose !== undefined ? purpose : null,
          name !== undefined ? name : null,
          email !== undefined ? email : null,
          contact !== undefined ? contact : null,
          id_proof !== undefined ? id_proof : null,
          (no_of_pepple !== undefined ? Number(no_of_pepple) : (num_of_person !== undefined ? Number(num_of_person) : null)),
          date !== undefined ? date : null,
          in_time !== undefined ? in_time : null,
          out_time !== undefined ? out_time : null,
          note !== undefined ? note : null,
          savedImage !== undefined ? savedImage : null,
          id
        ]);

        return sendSuccess(res, { id, document: savedImage }, 'Visitor updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Visitor ID required', 400);
        await execute(`DELETE FROM visitors_book WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Visitor deleted');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in visitors:', error);
      return sendError(res, 'Failed to process visitors', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/frontoffice/phone-calls
   */
  public static async phoneCalls(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        let sql = `SELECT * FROM general_calls`;
        if (id) {
          const row = await queryOne(`SELECT * FROM general_calls WHERE id = ?`, [id]);
          return sendSuccess(res, row);
        }
        sql += ` ORDER BY id DESC`;
        const rows = await query(sql);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { name, contact, date, description, follow_up_date, next_follow_up_date, call_dureation, call_duration, note, call_type } = req.body || {};
        const recordDate = date || new Date().toISOString().split('T')[0];
        const followUp = follow_up_date || next_follow_up_date || recordDate;

        const result = await execute(`
          INSERT INTO general_calls (name, contact, date, description, follow_up_date, call_dureation, note, call_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name || 'Unknown',
          contact || '',
          recordDate,
          description || '',
          followUp,
          call_dureation || call_duration || '0 min',
          note || '',
          call_type || 'Incoming'
        ]);
        return sendSuccess(res, { id: result.insertId, name }, 'Call log saved', 201);
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!id) return sendError(res, 'Call ID required', 400);
        const { name, contact, date, description, follow_up_date, next_follow_up_date, call_dureation, call_duration, note, call_type } = req.body || {};

        await execute(`
          UPDATE general_calls SET
            name = COALESCE(?, name),
            contact = COALESCE(?, contact),
            date = COALESCE(?, date),
            description = COALESCE(?, description),
            follow_up_date = COALESCE(?, follow_up_date),
            call_dureation = COALESCE(?, call_dureation),
            note = COALESCE(?, note),
            call_type = COALESCE(?, call_type)
          WHERE id = ?
        `, [
          name !== undefined ? name : null,
          contact !== undefined ? contact : null,
          date !== undefined ? date : null,
          description !== undefined ? description : null,
          (follow_up_date !== undefined ? follow_up_date : next_follow_up_date) ?? null,
          (call_dureation !== undefined ? call_dureation : call_duration) ?? null,
          note !== undefined ? note : null,
          call_type !== undefined ? call_type : null,
          id
        ]);

        return sendSuccess(res, { id }, 'Call log updated');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Call ID required', 400);
        await execute(`DELETE FROM general_calls WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Call log deleted');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in phoneCalls:', error);
      return sendError(res, 'Failed to process phone calls', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/frontoffice/postal-dispatch
   */
  public static async postalDispatch(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        let sql = `SELECT * FROM dispatch_receive WHERE type = 'dispatch'`;
        if (id) {
          const row = await queryOne(`SELECT * FROM dispatch_receive WHERE id = ? AND type = 'dispatch'`, [id]);
          return sendSuccess(res, row);
        }
        sql += ` ORDER BY id DESC`;
        const rows = await query(sql);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { to_title, reference_no, address, note, from_title, date, image, document, document_base64, document_name } = req.body || {};
        const savedImage = saveBase64File(document_base64 || image || document, document_name, 'dispatch');

        const result = await execute(`
          INSERT INTO dispatch_receive (to_title, reference_no, address, note, from_title, date, image, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'dispatch')
        `, [to_title || '', reference_no || '', address || '', note || '', from_title || '', date || new Date().toISOString().split('T')[0], savedImage]);
        return sendSuccess(res, { id: result.insertId, to_title, document: savedImage }, 'Dispatch recorded', 201);
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!id) return sendError(res, 'Dispatch ID required', 400);
        const { to_title, reference_no, address, note, from_title, date, image, document, document_base64, document_name } = req.body || {};
        const rawDoc = document_base64 || image || document;
        const savedImage = rawDoc ? saveBase64File(rawDoc, document_name, 'dispatch') : undefined;

        await execute(`
          UPDATE dispatch_receive SET
            to_title = COALESCE(?, to_title),
            reference_no = COALESCE(?, reference_no),
            address = COALESCE(?, address),
            note = COALESCE(?, note),
            from_title = COALESCE(?, from_title),
            date = COALESCE(?, date),
            image = COALESCE(?, image)
          WHERE id = ? AND type = 'dispatch'
        `, [
          to_title !== undefined ? to_title : null,
          reference_no !== undefined ? reference_no : null,
          address !== undefined ? address : null,
          note !== undefined ? note : null,
          from_title !== undefined ? from_title : null,
          date !== undefined ? date : null,
          savedImage !== undefined ? savedImage : null,
          id
        ]);

        return sendSuccess(res, { id, document: savedImage }, 'Dispatch updated');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Dispatch ID required', 400);
        await execute(`DELETE FROM dispatch_receive WHERE id = ? AND type = 'dispatch'`, [id]);
        return sendSuccess(res, { id }, 'Dispatch deleted');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in postalDispatch:', error);
      return sendError(res, 'Failed to process postal dispatch', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/frontoffice/postal-receive
   */
  public static async postalReceive(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        let sql = `SELECT * FROM dispatch_receive WHERE type = 'receive'`;
        if (id) {
          const row = await queryOne(`SELECT * FROM dispatch_receive WHERE id = ? AND type = 'receive'`, [id]);
          return sendSuccess(res, row);
        }
        sql += ` ORDER BY id DESC`;
        const rows = await query(sql);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { to_title, reference_no, address, note, from_title, date, image, document, document_base64, document_name } = req.body || {};
        const savedImage = saveBase64File(document_base64 || image || document, document_name, 'receive');

        const result = await execute(`
          INSERT INTO dispatch_receive (to_title, reference_no, address, note, from_title, date, image, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'receive')
        `, [to_title || '', reference_no || '', address || '', note || '', from_title || '', date || new Date().toISOString().split('T')[0], savedImage]);
        return sendSuccess(res, { id: result.insertId, from_title, document: savedImage }, 'Postal receive recorded', 201);
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!id) return sendError(res, 'Receive ID required', 400);
        const { to_title, reference_no, address, note, from_title, date, image, document, document_base64, document_name } = req.body || {};
        const rawDoc = document_base64 || image || document;
        const savedImage = rawDoc ? saveBase64File(rawDoc, document_name, 'receive') : undefined;

        await execute(`
          UPDATE dispatch_receive SET
            to_title = COALESCE(?, to_title),
            reference_no = COALESCE(?, reference_no),
            address = COALESCE(?, address),
            note = COALESCE(?, note),
            from_title = COALESCE(?, from_title),
            date = COALESCE(?, date),
            image = COALESCE(?, image)
          WHERE id = ? AND type = 'receive'
        `, [
          to_title !== undefined ? to_title : null,
          reference_no !== undefined ? reference_no : null,
          address !== undefined ? address : null,
          note !== undefined ? note : null,
          from_title !== undefined ? from_title : null,
          date !== undefined ? date : null,
          savedImage !== undefined ? savedImage : null,
          id
        ]);

        return sendSuccess(res, { id, document: savedImage }, 'Postal receive updated');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Receive ID required', 400);
        await execute(`DELETE FROM dispatch_receive WHERE id = ? AND type = 'receive'`, [id]);
        return sendSuccess(res, { id }, 'Postal receive deleted');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in postalReceive:', error);
      return sendError(res, 'Failed to process postal receive', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/frontoffice/complaints
   */
  public static async complaints(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        let sql = `SELECT * FROM complaint`;
        if (id) {
          const row = await queryOne(`SELECT * FROM complaint WHERE id = ?`, [id]);
          return sendSuccess(res, row);
        }
        sql += ` ORDER BY id DESC`;
        const rows = await query(sql);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { complaint_type, category, source, name, from, contact, phone, email, date, description, action_taken, actionTaken, assigned, assignedTo, note, image, documentName, document_base64, document_name } = req.body || {};
        const safeSource = String(source || 'Online').substring(0, 15);
        const safeContact = String(contact || phone || '').substring(0, 15);
        const safeAssigned = String(assigned || assignedTo || '').substring(0, 50);
        const recordDate = date || new Date().toISOString().split('T')[0];
        const savedImage = saveBase64File(document_base64 || image || documentName, document_name || documentName, 'complaints');

        const result = await execute(`
          INSERT INTO complaint (complaint_type, source, name, contact, email, date, description, action_taken, assigned, note, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          complaint_type || category || 'General',
          safeSource,
          name || from || 'Anonymous',
          safeContact,
          email || 'complaint@example.com',
          recordDate,
          description || '',
          action_taken || actionTaken || '',
          safeAssigned,
          note || '',
          savedImage
        ]);
        return sendSuccess(res, { id: result.insertId, name: name || from, document: savedImage }, 'Complaint recorded', 201);
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (!id) return sendError(res, 'Complaint ID required', 400);
        const { complaint_type, category, source, name, from, contact, phone, email, date, description, action_taken, actionTaken, assigned, assignedTo, note, image, documentName, document_base64, document_name } = req.body || {};

        const safeSource = source !== undefined ? String(source).substring(0, 15) : null;
        const safeContact = (contact !== undefined || phone !== undefined) ? String(contact || phone || '').substring(0, 15) : null;
        const safeAssigned = (assigned !== undefined || assignedTo !== undefined) ? String(assigned || assignedTo || '').substring(0, 50) : null;
        const rawDoc = document_base64 || image || documentName;
        const savedImage = rawDoc ? saveBase64File(rawDoc, document_name || documentName, 'complaints') : undefined;

        await execute(`
          UPDATE complaint SET
            complaint_type = COALESCE(?, complaint_type),
            source = COALESCE(?, source),
            name = COALESCE(?, name),
            contact = COALESCE(?, contact),
            email = COALESCE(?, email),
            date = COALESCE(?, date),
            description = COALESCE(?, description),
            action_taken = COALESCE(?, action_taken),
            assigned = COALESCE(?, assigned),
            note = COALESCE(?, note),
            image = COALESCE(?, image)
          WHERE id = ?
        `, [
          (complaint_type !== undefined ? complaint_type : category) ?? null,
          safeSource,
          (name !== undefined ? name : from) ?? null,
          safeContact,
          email !== undefined ? email : null,
          date !== undefined ? date : null,
          description !== undefined ? description : null,
          (action_taken !== undefined ? action_taken : actionTaken) ?? null,
          safeAssigned,
          note !== undefined ? note : null,
          savedImage !== undefined ? savedImage : null,
          id
        ]);

        return sendSuccess(res, { id, document: savedImage }, 'Complaint updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Complaint ID required', 400);
        await execute(`DELETE FROM complaint WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Complaint deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in complaints:', error);
      return sendError(res, 'Failed to process complaints', 500);
    }
  }

  /**
   * Setup - Purposes CRUD
   * GET/POST/PUT/DELETE /api/frontoffice/setup/purpose
   */
  public static async purpose(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        const rows = await query(`SELECT * FROM visitors_purpose ORDER BY id DESC`);
        return sendSuccess(res, rows);
      }
      if (method === 'POST') {
        const { visitors_purpose, name, description } = req.body || {};
        const result = await execute(`INSERT INTO visitors_purpose (visitors_purpose, description) VALUES (?, ?)`, [visitors_purpose || name || '', description || '']);
        return sendSuccess(res, { id: result.insertId }, 'Purpose added', 201);
      }
      if (method === 'PUT' || method === 'PATCH') {
        const { visitors_purpose, name, description } = req.body || {};
        await execute(`UPDATE visitors_purpose SET visitors_purpose = COALESCE(?, visitors_purpose), description = COALESCE(?, description) WHERE id = ?`, [visitors_purpose || name, description, id]);
        return sendSuccess(res, { id }, 'Purpose updated');
      }
      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Purpose ID required', 400);
        await execute(`DELETE FROM visitors_purpose WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Purpose deleted');
      }
      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      return sendError(res, 'Failed to process purpose', 500);
    }
  }

  /**
   * Setup - Complaint Types CRUD
   * GET/POST/PUT/DELETE /api/frontoffice/setup/complaint-types
   */
  public static async complaintTypes(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        const rows = await query(`SELECT * FROM complaint_type ORDER BY id DESC`);
        return sendSuccess(res, rows);
      }
      if (method === 'POST') {
        const { complaint_type, name, description } = req.body || {};
        const result = await execute(`INSERT INTO complaint_type (complaint_type, description) VALUES (?, ?)`, [complaint_type || name || '', description || '']);
        return sendSuccess(res, { id: result.insertId }, 'Complaint type added', 201);
      }
      if (method === 'PUT' || method === 'PATCH') {
        const { complaint_type, name, description } = req.body || {};
        await execute(`UPDATE complaint_type SET complaint_type = COALESCE(?, complaint_type), description = COALESCE(?, description) WHERE id = ?`, [complaint_type || name, description, id]);
        return sendSuccess(res, { id }, 'Complaint type updated');
      }
      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Complaint type ID required', 400);
        await execute(`DELETE FROM complaint_type WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Complaint type deleted');
      }
      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      return sendError(res, 'Failed to process complaint type', 500);
    }
  }

  /**
   * Setup - Sources CRUD
   * GET/POST/PUT/DELETE /api/frontoffice/setup/sources
   */
  public static async sources(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        const rows = await query(`SELECT * FROM source ORDER BY id DESC`);
        return sendSuccess(res, rows);
      }
      if (method === 'POST') {
        const { source, name, description } = req.body || {};
        const result = await execute(`INSERT INTO source (source, description) VALUES (?, ?)`, [source || name || '', description || '']);
        return sendSuccess(res, { id: result.insertId }, 'Source added', 201);
      }
      if (method === 'PUT' || method === 'PATCH') {
        const { source, name, description } = req.body || {};
        await execute(`UPDATE source SET source = COALESCE(?, source), description = COALESCE(?, description) WHERE id = ?`, [source || name, description, id]);
        return sendSuccess(res, { id }, 'Source updated');
      }
      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Source ID required', 400);
        await execute(`DELETE FROM source WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Source deleted');
      }
      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      return sendError(res, 'Failed to process source', 500);
    }
  }

  /**
   * Setup - References CRUD
   * GET/POST/PUT/DELETE /api/frontoffice/setup/references
   */
  public static async references(req: Request, res: Response) {
    const method = req.method;
    const id = req.params?.id || req.body?.id || req.query?.id;

    try {
      if (method === 'GET') {
        const rows = await query(`SELECT * FROM reference ORDER BY id DESC`);
        return sendSuccess(res, rows);
      }
      if (method === 'POST') {
        const { reference, name, description } = req.body || {};
        const result = await execute(`INSERT INTO reference (reference, description) VALUES (?, ?)`, [reference || name || '', description || '']);
        return sendSuccess(res, { id: result.insertId }, 'Reference added', 201);
      }
      if (method === 'PUT' || method === 'PATCH') {
        const { reference, name, description } = req.body || {};
        await execute(`UPDATE reference SET reference = COALESCE(?, reference), description = COALESCE(?, description) WHERE id = ?`, [reference || name, description, id]);
        return sendSuccess(res, { id }, 'Reference updated');
      }
      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Reference ID required', 400);
        await execute(`DELETE FROM reference WHERE id = ?`, [id]);
        return sendSuccess(res, { id }, 'Reference deleted');
      }
      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      return sendError(res, 'Failed to process reference', 500);
    }
  }

  /**
   * GET /api/frontoffice/setup
   */
  public static async setup(req: Request, res: Response) {
    try {
      const purposes = await query(`SELECT * FROM visitors_purpose ORDER BY visitors_purpose ASC`);
      const sources = await query(`SELECT * FROM source ORDER BY source ASC`);
      const complaintTypes = await query(`SELECT * FROM complaint_type ORDER BY complaint_type ASC`);
      const referencesList = await query(`SELECT * FROM reference ORDER BY reference ASC`);

      return sendSuccess(res, {
        purposes,
        sources,
        complaint_types: complaintTypes,
        references: referencesList,
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch setup data', 500);
    }
  }
}
