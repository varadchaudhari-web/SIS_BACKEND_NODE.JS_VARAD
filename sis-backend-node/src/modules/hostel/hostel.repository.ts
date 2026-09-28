import { query, queryOne, execute } from '../../config/database';

export class HostelRepository {
  // Hostels
  static async getHostels(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM hostel WHERE id = ?`, [id]);
    }
    return await query(`
      SELECT h.*, 
             (SELECT COUNT(*) FROM hostel_rooms hr WHERE hr.hostel_id = h.id) as total_rooms
      FROM hostel h
      ORDER BY h.id DESC
    `);
  }

  static async createHostel(data: { hostel_name: string; type?: string; address?: string; intake?: number; description?: string }) {
    return await execute(`
      INSERT INTO hostel (hostel_name, type, address, intake, description)
      VALUES (?, ?, ?, ?, ?)
    `, [data.hostel_name, data.type || 'Boys', data.address || '', data.intake || 100, data.description || '']);
  }

  static async updateHostel(id: any, data: { hostel_name?: string; type?: string; address?: string; intake?: number; description?: string }) {
    return await execute(`
      UPDATE hostel 
      SET hostel_name = COALESCE(?, hostel_name),
          type = COALESCE(?, type),
          address = COALESCE(?, address),
          intake = COALESCE(?, intake),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [data.hostel_name, data.type, data.address, data.intake, data.description, id]);
  }

  static async deleteHostel(id: any) {
    return await execute(`DELETE FROM hostel WHERE id = ?`, [id]);
  }

  // Room Types
  static async getRoomTypes(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM room_types WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM room_types ORDER BY room_type ASC`);
  }

  static async createRoomType(data: { room_type: string; description?: string }) {
    return await execute(`INSERT INTO room_types (room_type, description) VALUES (?, ?)`, [data.room_type, data.description || '']);
  }

  static async updateRoomType(id: any, data: { room_type?: string; description?: string }) {
    return await execute(`
      UPDATE room_types 
      SET room_type = COALESCE(?, room_type),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [data.room_type, data.description, id]);
  }

  static async deleteRoomType(id: any) {
    return await execute(`DELETE FROM room_types WHERE id = ?`, [id]);
  }

  // Rooms
  static async getRooms(id?: any, hostelId?: any) {
    let sql = `
      SELECT hr.*, h.hostel_name, h.type as hostel_type, rt.room_type,
             (SELECT COUNT(DISTINCT s2.id) FROM students s2 WHERE (s2.is_active = 'yes' OR s2.is_active = 1) AND s2.hostel_room_id = hr.id) as occupied_beds
      FROM hostel_rooms hr
      LEFT JOIN hostel h ON h.id = hr.hostel_id
      LEFT JOIN room_types rt ON rt.id = hr.room_type_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (id) {
      sql += ` AND hr.id = ?`;
      params.push(id);
    }
    if (hostelId) {
      sql += ` AND hr.hostel_id = ?`;
      params.push(hostelId);
    }
    sql += ` ORDER BY hr.id DESC`;
    return await query(sql, params);
  }

  static async createRoom(data: { hostel_id: number; room_type_id: number; room_no: string; no_of_bed?: number; cost_per_bed?: number; title?: string; description?: string }) {
    return await execute(`
      INSERT INTO hostel_rooms (hostel_id, room_type_id, room_no, no_of_bed, cost_per_bed, title, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [data.hostel_id, data.room_type_id, data.room_no, data.no_of_bed || 2, data.cost_per_bed || 0, data.title || data.room_no, data.description || '']);
  }

  static async updateRoom(id: number | string, data: any) {
    return await execute(`
      UPDATE hostel_rooms
      SET hostel_id = COALESCE(?, hostel_id),
          room_type_id = COALESCE(?, room_type_id),
          room_no = COALESCE(?, room_no),
          no_of_bed = COALESCE(?, no_of_bed),
          cost_per_bed = COALESCE(?, cost_per_bed),
          title = COALESCE(?, title),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [data.hostel_id, data.room_type_id, data.room_no, data.no_of_bed, data.cost_per_bed, data.title, data.description, id]);
  }

  static async deleteRoom(id: any) {
    return await execute(`DELETE FROM hostel_rooms WHERE id = ?`, [id]);
  }

  // Student Details & Room Allotment
  static async getStudentDetails(params: { class_id?: string; section_id?: string; hostel_name?: string; hostel_id?: string }) {
    let sql = `
      SELECT s.id as sid, s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender, s.mobileno, s.guardian_phone,
             c.class as class, c.id as class_id, sec.section as section, sec.id as section_id,
             h.id as hostel_id, h.hostel_name, h.type as hostel_type,
             hr.id as room_id, hr.room_no, hr.cost_per_bed, rt.room_type
      FROM students s
      LEFT JOIN student_session ss ON ss.student_id = s.id
      LEFT JOIN classes c ON c.id = ss.class_id
      LEFT JOIN sections sec ON sec.id = ss.section_id
      INNER JOIN hostel_rooms hr ON hr.id = COALESCE(NULLIF(s.hostel_room_id, 0), NULLIF(ss.hostel_room_id, 0))
      LEFT JOIN hostel h ON h.id = hr.hostel_id
      LEFT JOIN room_types rt ON rt.id = hr.room_type_id
      WHERE (s.is_active = 'yes' OR s.is_active = 1)
        AND COALESCE(NULLIF(s.hostel_room_id, 0), NULLIF(ss.hostel_room_id, 0)) IS NOT NULL
    `;
    const qParams: any[] = [];
    if (params.class_id) {
      sql += ` AND (ss.class_id = ? OR c.id = ?)`;
      qParams.push(params.class_id, params.class_id);
    }
    if (params.section_id) {
      sql += ` AND (ss.section_id = ? OR sec.id = ?)`;
      qParams.push(params.section_id, params.section_id);
    }
    if (params.hostel_name) {
      sql += ` AND h.hostel_name LIKE ?`;
      qParams.push(`%${params.hostel_name}%`);
    }
    if (params.hostel_id) {
      sql += ` AND h.id = ?`;
      qParams.push(params.hostel_id);
    }
    sql += ` ORDER BY s.id DESC`;
    return await query(sql, qParams);
  }

  static async allocateStudent(studentId: number | string, roomId: number | string) {
    await execute(`UPDATE students SET hostel_room_id = ? WHERE id = ?`, [roomId, studentId]);
    await execute(`UPDATE student_session SET hostel_room_id = ? WHERE student_id = ?`, [roomId, studentId]);
    return { studentId, roomId };
  }

  static async deallocateStudent(studentId: number | string) {
    await execute(`UPDATE students SET hostel_room_id = 0 WHERE id = ?`, [studentId]);
    await execute(`UPDATE student_session SET hostel_room_id = 0 WHERE student_id = ?`, [studentId]);
    return { studentId };
  }

  // Leaves
  static async getLeaves() {
    return await query(`
      SELECT hl.*,
             CONCAT(s.firstname, ' ', COALESCE(s.lastname, '')) as student_name,
             s.admission_no,
             c.class as student_class,
             COALESCE(hr.room_no, '') as room,
             COALESCE(h.type, 'Boys') as wing,
             hl.comment as admin_comment
      FROM hostel_leaves hl
      LEFT JOIN students s ON s.id = hl.student_id
      LEFT JOIN student_session ss ON ss.student_id = s.id
      LEFT JOIN classes c ON c.id = ss.class_id
      LEFT JOIN hostel_rooms hr ON hr.id = COALESCE(NULLIF(s.hostel_room_id, 0), NULLIF(ss.hostel_room_id, 0), 0)
      LEFT JOIN hostel h ON h.id = hr.hostel_id
      ORDER BY hl.id DESC
    `);
  }

  static async createLeave(data: any) {
    let studentId = Number(data.student_id);
    if (!studentId || isNaN(studentId)) {
      const match = await queryOne<any>(
        `SELECT id FROM students WHERE admission_no = ? OR id = ? OR CONCAT(firstname, ' ', lastname) LIKE ? LIMIT 1`,
        [data.student_id, data.student_id, `%${data.student_name || data.student_id}%`]
      );
      studentId = match ? match.id : 6899;
    }
    const fromDate = data.from_date || new Date().toISOString().split('T')[0];
    const toDate = data.to_date || fromDate;
    const reason = data.reason || (data.leave_type ? `[${data.leave_type}]` : 'Hostel Leave');
    const status = data.status || 'Pending';
    const guardianApproval = data.guardian_approval ? 1 : 0;

    return await execute(`
      INSERT INTO hostel_leaves (student_id, from_date, to_date, reason, status, guardian_approval, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [studentId, fromDate, toDate, reason, status, guardianApproval]);
  }

  static async updateLeaveStatus(id: number | string, status: string, comment?: string) {
    return await execute(`UPDATE hostel_leaves SET status = ?, comment = ? WHERE id = ?`, [status, comment || null, id]);
  }

  // Visitors
  static async getVisitors() {
    return await query(`
      SELECT hv.*, CONCAT(s.firstname, ' ', COALESCE(s.lastname, '')) as student_name, s.admission_no
      FROM hostel_visitors hv
      LEFT JOIN students s ON s.id = hv.student_id
      ORDER BY hv.id DESC
    `);
  }

  static async createVisitor(data: any) {
    return await execute(`
      INSERT INTO hostel_visitors (visitor_name, relation, student_id, in_time, out_time, date, contact_no, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.visitor_name, data.relation || '', data.student_id || 1, data.in_time || '10:00 AM', data.out_time || '', data.date || new Date().toISOString().split('T')[0], data.contact_no || '', data.purpose || '']);
  }

  static async updateVisitorOut(id: number | string, outTime?: string) {
    return await execute(`UPDATE hostel_visitors SET out_time = ? WHERE id = ?`, [outTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), id]);
  }

  // Maintenance
  static async getMaintenance() {
    return await query(`
      SELECT hm.*, hr.room_no
      FROM hostel_maintenance hm
      LEFT JOIN hostel_rooms hr ON hr.id = hm.room_id
      ORDER BY hm.id DESC
    `);
  }

  static async createMaintenance(data: any) {
    return await execute(`
      INSERT INTO hostel_maintenance (room_id, wing, issue_type, description, reported_by, reported_date, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.room_id || 1, data.wing || 'Boys', data.issue_type || 'Electrical', data.description || '', data.reported_by || 'Admin', data.reported_date || new Date().toISOString().split('T')[0], data.status || 'Pending', data.priority || 'Medium']);
  }

  static async updateMaintenanceStatus(id: number | string, status: string) {
    return await execute(`UPDATE hostel_maintenance SET status = ? WHERE id = ?`, [status, id]);
  }

  // Mess Menu
  static async getMessMenu() {
    return await query(`SELECT * FROM hostel_mess_menu ORDER BY id ASC`);
  }

  static async updateMessMenu(data: any) {
    return await execute(`
      UPDATE hostel_mess_menu
      SET breakfast = COALESCE(?, breakfast),
          lunch = COALESCE(?, lunch),
          snacks = COALESCE(?, snacks),
          dinner = COALESCE(?, dinner)
      WHERE day = ? OR id = ?
    `, [data.breakfast, data.lunch, data.snacks, data.dinner, data.day, data.id]);
  }

  // Attendance
  static async getAttendance(date: string) {
    return await query(`SELECT * FROM hostel_attendance WHERE date = ?`, [date]);
  }

  static async saveAttendance(date: string, wing: string, records: any[]) {
    for (const rec of records) {
      await execute(`
        INSERT INTO hostel_attendance (student_id, date, status, wing, note)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)
      `, [rec.student_id, date, rec.status || 'Present', wing, rec.note || '']);
    }
  }

  // Complaints
  static async getComplaints() {
    return await query(`
      SELECT hc.*, s.firstname, s.lastname, s.admission_no, hr.room_no
      FROM hostel_complaints hc
      LEFT JOIN students s ON s.id = hc.student_id
      LEFT JOIN hostel_rooms hr ON hr.id = COALESCE(NULLIF(s.hostel_room_id, 0), 0)
      ORDER BY hc.id DESC
    `);
  }

  static async createComplaint(data: any) {
    return await execute(`
      INSERT INTO hostel_complaints (student_id, title, description, date, status)
      VALUES (?, ?, ?, ?, ?)
    `, [data.student_id || 1, data.title, data.description || '', data.date || new Date().toISOString().split('T')[0], 'Open']);
  }

  static async resolveComplaint(id: number | string, notes?: string) {
    return await execute(`UPDATE hostel_complaints SET status = 'Resolved', resolution_notes = ? WHERE id = ?`, [notes || 'Resolved by warden', id]);
  }
}
