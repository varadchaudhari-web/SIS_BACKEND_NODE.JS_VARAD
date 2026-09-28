import { query, queryOne, execute } from '../../config/database';

export class HRRepository {
  /**
   * Fetch active staff with full joins (designation, department, roles)
   */
  public static async findStaff(filters: {
    role_id?: string;
    department_id?: string;
    designation_id?: string;
    search?: string;
    is_active?: number;
  } = {}) {
    const isActive = filters.is_active !== undefined ? filters.is_active : 1;
    let sql = `
      SELECT s.*,
             d.designation as designation_name,
             dp.department_name as department_name,
             r.id as role_id,
             r.name as role_name,
             r.name as user_type
      FROM staff s
      LEFT JOIN staff_designation d ON (s.designation IS NOT NULL AND s.designation <> 0 AND d.id = s.designation)
      LEFT JOIN department dp ON (s.department IS NOT NULL AND s.department <> 0 AND dp.id = s.department)
      LEFT JOIN staff_roles sr ON sr.staff_id = s.id
      LEFT JOIN roles r ON r.id = sr.role_id
      WHERE s.is_active = ?
    `;
    const params: any[] = [isActive];

    if (filters.role_id && filters.role_id !== 'select' && filters.role_id !== 'all') {
      sql += ` AND (sr.role_id = ? OR r.name = ?)`;
      params.push(Number(filters.role_id) || 0, filters.role_id);
    }

    if (filters.department_id && filters.department_id !== 'select') {
      sql += ` AND (s.department = ? OR dp.id = ?)`;
      const deptNum = Number(filters.department_id) || 0;
      params.push(deptNum, deptNum);
    }

    if (filters.designation_id && filters.designation_id !== 'select') {
      sql += ` AND (s.designation = ? OR d.id = ?)`;
      const desigNum = Number(filters.designation_id) || 0;
      params.push(desigNum, desigNum);
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ` AND (
        CONCAT_WS(' ', s.name, s.surname) LIKE ? OR
        s.employee_id LIKE ? OR
        s.email LIKE ? OR
        s.contact_no LIKE ? OR
        r.name LIKE ?
      )`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY s.id DESC`;
    const rows = await query(sql, params);
    return await this.appendTeacherAcademics(rows);
  }

  /**
   * Append teacher assigned subjects and classes matching legacy PHP append_teacher_academics
   */
  public static async appendTeacherAcademics(staffList: any[]): Promise<any[]> {
    if (!Array.isArray(staffList) || staffList.length === 0) return staffList;

    for (const s of staffList) {
      if (s.subject === undefined) s.subject = '';
      if (s.class === undefined) s.class = '';
    }

    const teacherIds = staffList
      .filter(s => Number(s.role_id) === 2 || String(s.role_name || s.user_type || '').toLowerCase() === 'teacher')
      .map(s => s.id);

    if (teacherIds.length === 0) return staffList;

    try {
      const placeholders = teacherIds.map(() => '?').join(',');
      const rows = await query(`
        SELECT ts.teacher_id, s.name as subject_name, c.class as class_name
        FROM teacher_subjects ts
        JOIN subjects s ON s.id = ts.subject_id
        LEFT JOIN class_sections cs ON cs.id = ts.class_section_id
        LEFT JOIN classes c ON c.id = cs.class_id
        WHERE ts.teacher_id IN (${placeholders})
      `, teacherIds);

      const mapByTeacher: Record<number, { subjects: Set<string>; classes: Set<string> }> = {};
      for (const row of rows) {
        if (!mapByTeacher[row.teacher_id]) {
          mapByTeacher[row.teacher_id] = { subjects: new Set(), classes: new Set() };
        }
        if (row.subject_name) mapByTeacher[row.teacher_id].subjects.add(row.subject_name);
        if (row.class_name) mapByTeacher[row.teacher_id].classes.add(row.class_name);
      }

      for (const s of staffList) {
        if (mapByTeacher[s.id]) {
          s.subject = Array.from(mapByTeacher[s.id].subjects).join(', ');
          s.class = Array.from(mapByTeacher[s.id].classes).join(', ');
        }
      }
    } catch (e) {
      console.warn('appendTeacherAcademics query warning:', e);
    }

    return staffList;
  }

  /**
   * Find single staff profile by ID
   */
  public static async findStaffById(id: number | string) {
    const row = await queryOne(`
      SELECT s.*,
             d.designation as designation_name,
             dp.department_name as department_name,
             r.id as role_id,
             r.name as role_name,
             r.name as user_type
      FROM staff s
      LEFT JOIN staff_designation d ON (s.designation IS NOT NULL AND s.designation <> 0 AND d.id = s.designation)
      LEFT JOIN department dp ON (s.department IS NOT NULL AND s.department <> 0 AND dp.id = s.department)
      LEFT JOIN staff_roles sr ON sr.staff_id = s.id
      LEFT JOIN roles r ON r.id = sr.role_id
      WHERE s.id = ?
    `, [Number(id) || id]);

    if (!row) return null;
    const enriched = await this.appendTeacherAcademics([row]);
    return enriched[0];
  }

  /**
   * Find staff by employee ID
   */
  public static async findStaffByEmployeeId(empId: string) {
    return await queryOne(`SELECT * FROM staff WHERE employee_id = ?`, [empId]);
  }

  /**
   * Find disabled staff
   */
  public static async findDisabledStaff() {
    return await this.findStaff({ is_active: 0 });
  }

  /**
   * Get maximum or next staff ID sequence
   */
  public static async getLastStaffId() {
    const row = await queryOne(`SELECT id, employee_id FROM staff ORDER BY id DESC LIMIT 1`);
    return row ? (row.id as number) : 0;
  }

  /**
   * Check email uniqueness across staff
   */
  public static async isEmailDuplicate(email: string, excludeStaffId: number | string = 0): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return false;

    let sql = `SELECT id FROM staff WHERE LOWER(email) = ?`;
    const params: any[] = [cleanEmail];
    if (Number(excludeStaffId) > 0) {
      sql += ` AND id != ?`;
      params.push(excludeStaffId);
    }
    const match = await queryOne(sql, params);
    return !!match;
  }

  /**
   * Create new staff record
   */
  public static async createStaff(data: any): Promise<number> {
    const result = await execute(`
      INSERT INTO staff (
        employee_id, name, surname, email, contact_no, designation, department,
        gender, dob, date_of_joining, emergency_contact_no, marital_status,
        local_address, permanent_address, qualification, work_exp, basic_salary,
        father_name, mother_name, note, password, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      data.employee_id,
      data.name,
      data.surname || '',
      data.email || '',
      data.contact_no || '',
      data.designation || null,
      data.department || null,
      data.gender || 'Male',
      data.dob || null,
      data.date_of_joining || new Date(),
      data.emergency_contact_no || data.emergency_no || null,
      data.marital_status || 'Single',
      data.local_address || data.address || null,
      data.permanent_address || null,
      data.qualification || null,
      data.work_exp || null,
      data.basic_salary || 0,
      data.father_name || null,
      data.mother_name || null,
      data.note || null,
      data.password || null
    ]);

    const newId = result.insertId;

    if (data.role_id) {
      await execute(`INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)`, [newId, data.role_id]);
    }

    return newId;
  }

  /**
   * Update existing staff record
   */
  public static async updateStaff(id: number | string, data: any): Promise<void> {
    await execute(`
      UPDATE staff
      SET employee_id = COALESCE(?, employee_id),
          name = COALESCE(?, name),
          surname = COALESCE(?, surname),
          email = COALESCE(?, email),
          contact_no = COALESCE(?, contact_no),
          designation = COALESCE(?, designation),
          department = COALESCE(?, department),
          gender = COALESCE(?, gender),
          dob = COALESCE(?, dob),
          date_of_joining = COALESCE(?, date_of_joining),
          emergency_contact_no = COALESCE(?, emergency_contact_no),
          marital_status = COALESCE(?, marital_status),
          local_address = COALESCE(?, local_address),
          permanent_address = COALESCE(?, permanent_address),
          qualification = COALESCE(?, qualification),
          work_exp = COALESCE(?, work_exp),
          basic_salary = COALESCE(?, basic_salary),
          father_name = COALESCE(?, father_name),
          mother_name = COALESCE(?, mother_name),
          note = COALESCE(?, note)
      WHERE id = ?
    `, [
      data.employee_id,
      data.name,
      data.surname,
      data.email,
      data.contact_no,
      data.designation,
      data.department,
      data.gender,
      data.dob,
      data.date_of_joining,
      data.emergency_contact_no || data.emergency_no,
      data.marital_status,
      data.local_address || data.address,
      data.permanent_address,
      data.qualification,
      data.work_exp,
      data.basic_salary,
      data.father_name,
      data.mother_name,
      data.note,
      id
    ]);

    if (data.role_id) {
      await execute(`DELETE FROM staff_roles WHERE staff_id = ?`, [id]);
      await execute(`INSERT INTO staff_roles (staff_id, role_id) VALUES (?, ?)`, [id, data.role_id]);
    }
  }

  /**
   * Disable / Enable staff
   */
  public static async setStaffActiveStatus(id: number | string, isActive: number, disableAt?: string | null): Promise<void> {
    await execute(`
      UPDATE staff
      SET is_active = ?, disable_at = ?
      WHERE id = ?
    `, [isActive, disableAt || null, id]);
  }

  /**
   * Delete staff record (soft delete)
   */
  public static async deleteStaff(id: number | string): Promise<void> {
    await execute(`UPDATE staff SET is_active = 0 WHERE id = ?`, [id]);
  }

  /**
   * Update password
   */
  public static async updateStaffPassword(id: number | string, passwordHash: string): Promise<void> {
    await execute(`UPDATE staff SET password = ? WHERE id = ?`, [passwordHash, id]);
  }

  /**
   * Update staff photo image
   */
  public static async updateStaffPhoto(id: number | string, photoFile: string): Promise<void> {
    await execute(`UPDATE staff SET image = ? WHERE id = ?`, [photoFile, id]);
  }

  /**
   * Update staff document field
   */
  public static async updateStaffDocument(
    id: number | string,
    docType: string,
    fileName: string,
    otherDocName?: string
  ): Promise<void> {
    switch (docType) {
      case 'resume':
        await execute(`UPDATE staff SET resume = ? WHERE id = ?`, [fileName, id]);
        break;
      case 'joining_letter':
        await execute(`UPDATE staff SET joining_letter = ? WHERE id = ?`, [fileName, id]);
        break;
      case 'resignation_letter':
        await execute(`UPDATE staff SET resignation_letter = ? WHERE id = ?`, [fileName, id]);
        break;
      case 'other_document_file':
      case 'other':
      default:
        await execute(`
          UPDATE staff
          SET other_document_name = COALESCE(?, other_document_name),
              other_document_file = ?
          WHERE id = ?
        `, [otherDocName || 'Other Document', fileName, id]);
        break;
    }
  }

  /**
   * Clear staff document field
   */
  public static async deleteStaffDocument(id: number | string, docType: string): Promise<void> {
    switch (docType) {
      case 'resume':
        await execute(`UPDATE staff SET resume = '' WHERE id = ?`, [id]);
        break;
      case 'joining_letter':
        await execute(`UPDATE staff SET joining_letter = '' WHERE id = ?`, [id]);
        break;
      case 'resignation_letter':
        await execute(`UPDATE staff SET resignation_letter = '' WHERE id = ?`, [id]);
        break;
      case 'other_document_file':
      case 'other':
      default:
        await execute(`UPDATE staff SET other_document_file = '', other_document_name = '' WHERE id = ?`, [id]);
        break;
    }
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================
  public static async getAttendance(date: string, roleId?: string, staffId?: string) {
    let sql = `
      SELECT s.id as staff_id, s.id, s.employee_id, s.name, s.surname,
             s.contact_no, s.email,
             d.designation as designation_name,
             dp.department_name as department_name,
             r.id as role_id, r.name as role_name, r.name as user_type,
             sa.id as attendance_id,
             sa.staff_attendance_type_id,
             sat.type as attendance_type,
             sat.key_value,
             sa.remark,
             sa.date
      FROM staff s
      LEFT JOIN staff_designation d ON (s.designation IS NOT NULL AND s.designation <> 0 AND d.id = s.designation)
      LEFT JOIN department dp ON (s.department IS NOT NULL AND s.department <> 0 AND dp.id = s.department)
      LEFT JOIN staff_roles sr ON sr.staff_id = s.id
      LEFT JOIN roles r ON r.id = sr.role_id
      LEFT JOIN staff_attendance sa ON sa.staff_id = s.id AND sa.date = ?
      LEFT JOIN staff_attendance_type sat ON sat.id = sa.staff_attendance_type_id
      WHERE s.is_active = 1
    `;
    const params: any[] = [date];

    if (staffId) {
      sql += ` AND s.id = ?`;
      params.push(Number(staffId) || staffId);
    } else if (roleId && roleId !== 'select' && roleId !== 'all') {
      sql += ` AND (sr.role_id = ? OR r.name = ?)`;
      params.push(Number(roleId) || 0, roleId);
    }

    sql += ` ORDER BY s.name ASC, s.surname ASC`;
    return await query(sql, params);
  }

  public static async getStaffAttendanceHistory(staffId: number | string, year?: string) {
    let sql = `
      SELECT sa.*, sat.type as attendance_type, sat.key_value
      FROM staff_attendance sa
      JOIN staff_attendance_type sat ON sat.id = sa.staff_attendance_type_id
      WHERE sa.staff_id = ?
    `;
    const params: any[] = [staffId];
    if (year) {
      sql += ` AND YEAR(sa.date) = ?`;
      params.push(year);
    }
    sql += ` ORDER BY sa.date DESC`;
    return await query(sql, params);
  }

  public static async saveAttendanceRecord(staffId: number | string, typeId: number | string, date: string, remark: string = ''): Promise<void> {
    const existing = await queryOne(`SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?`, [staffId, date]);
    if (existing) {
      await execute(`
        UPDATE staff_attendance
        SET staff_attendance_type_id = ?, remark = ?
        WHERE id = ?
      `, [typeId, remark, existing.id]);
    } else {
      await execute(`
        INSERT INTO staff_attendance (staff_id, staff_attendance_type_id, date, remark)
        VALUES (?, ?, ?, ?)
      `, [staffId, typeId, date, remark]);
    }
  }

  public static async getAttendanceTypes() {
    return await query(`SELECT * FROM staff_attendance_type WHERE is_active = 'yes' ORDER BY id ASC`);
  }

  // ==========================================
  // PAYROLL & PAYSLIP
  // ==========================================
  public static async getPayroll(month: string, year: string, role?: string) {
    let sql = `
      SELECT IFNULL(sp.status, 'unpaid') as status,
             IFNULL(sp.id, 0) as payslip_id,
             IFNULL(sp.id, 0) as id,
             sp.basic as payslip_basic,
             sp.total_allowance,
             sp.total_deduction,
             sp.net_salary,
             sp.payment_mode,
             sp.payment_date,
             sp.remark as payment_remark,
             s.id as staff_id,
             s.employee_id,
             s.name,
             s.surname,
             s.contact_no,
             s.email,
             s.basic_salary,
             COALESCE(d.designation, CASE WHEN s.designation NOT IN ('', '0') THEN s.designation ELSE NULL END) as designation,
             COALESCE(d.designation, CASE WHEN s.designation NOT IN ('', '0') THEN s.designation ELSE NULL END) as designation_name,
             COALESCE(dp.department_name, CASE WHEN s.department NOT IN ('', '0') THEN s.department ELSE NULL END) as department,
             r.id as role_id,
             r.name as role_name,
             r.name as user_type
      FROM staff s
      LEFT JOIN staff_payslip sp ON sp.staff_id = s.id AND sp.month = ? AND sp.year = ?
      LEFT JOIN department dp ON (s.department IS NOT NULL AND s.department NOT IN ('', '0') AND (dp.id = s.department OR dp.department_name = s.department))
      LEFT JOIN staff_designation d ON (s.designation IS NOT NULL AND s.designation NOT IN ('', '0') AND (d.id = s.designation OR d.designation = s.designation))
      LEFT JOIN staff_roles sr ON sr.staff_id = s.id
      LEFT JOIN roles r ON r.id = sr.role_id
      WHERE s.is_active = 1
    `;
    const params: any[] = [month, year];

    if (role && role !== 'select' && role !== 'all') {
      sql += ` AND (r.name = ? OR r.id = ?)`;
      params.push(role, role);
    }

    sql += ` ORDER BY s.id DESC`;
    return await query(sql, params);
  }

  public static async createPayslip(data: any): Promise<number> {
    const existing = await queryOne(
      `SELECT id FROM staff_payslip WHERE staff_id = ? AND month = ? AND year = ?`,
      [data.staff_id, data.month, data.year]
    );

    if (existing) {
      await execute(`
        UPDATE staff_payslip
        SET basic = ?, total_allowance = ?, total_deduction = ?, net_salary = ?, status = 'generated'
        WHERE id = ?
      `, [data.basic || 0, data.total_allowance || 0, data.total_deduction || 0, data.net_salary || 0, existing.id]);
      return existing.id as number;
    } else {
      const result = await execute(`
        INSERT INTO staff_payslip (
          staff_id, basic, total_allowance, total_deduction, leave_deduction, tax,
          net_salary, status, month, year, payment_mode, remark
        ) VALUES (?, ?, ?, ?, 0, '0', ?, 'generated', ?, ?, '', '')
      `, [
        data.staff_id,
        data.basic || 0,
        data.total_allowance || 0,
        data.total_deduction || 0,
        data.net_salary || data.basic || 0,
        data.month,
        data.year
      ]);
      return result.insertId;
    }
  }

  public static async markPayslipPaid(id: number | string, paymentData: any): Promise<void> {
    await execute(`
      UPDATE staff_payslip
      SET status = 'paid',
          payment_mode = ?,
          payment_date = ?,
          remark = ?
      WHERE id = ?
    `, [
      paymentData.payment_mode || 'Cash',
      paymentData.payment_date || new Date().toISOString().split('T')[0],
      paymentData.remarks || paymentData.remark || '',
      id
    ]);
  }

  public static async deletePayslip(id: number | string): Promise<void> {
    await execute(`DELETE FROM staff_payslip WHERE id = ?`, [id]);
    await execute(`DELETE FROM payslip_allowance WHERE payslip_id = ?`, [id]);
  }

  // ==========================================
  // LEAVES
  // ==========================================
  public static async getLeaveRequests(staffId?: number | string) {
    let sql = `
      SELECT slr.*,
             s.name, s.surname, s.employee_id,
             lt.type as leave_type
      FROM staff_leave_request slr
      JOIN staff s ON s.id = slr.staff_id
      LEFT JOIN leave_types lt ON lt.id = slr.leave_type_id
      WHERE s.is_active = 1
    `;
    const params: any[] = [];
    if (staffId) {
      sql += ` AND slr.staff_id = ?`;
      params.push(staffId);
    }
    sql += ` ORDER BY slr.id DESC`;
    return await query(sql, params);
  }

  public static async createLeaveRequest(data: any): Promise<number> {
    const result = await execute(`
      INSERT INTO staff_leave_request (
        staff_id, leave_type_id, leave_from, leave_to, leave_days,
        employee_remark, admin_remark, status, applied_by, document_file, date
      ) VALUES (?, ?, ?, ?, ?, ?, '', 'pending', ?, ?, NOW())
    `, [
      data.staff_id,
      data.leave_type_id || 1,
      data.leave_from,
      data.leave_to,
      data.leave_days || 1,
      data.employee_remark || '',
      data.applied_by || 'Staff',
      data.document_file || ''
    ]);
    return result.insertId;
  }

  public static async deleteLeaveRequest(id: number | string): Promise<void> {
    await execute(`DELETE FROM staff_leave_request WHERE id = ?`, [id]);
  }

  public static async updateLeaveStatus(id: number | string, status: string, adminRemark: string): Promise<void> {
    await execute(`
      UPDATE staff_leave_request
      SET status = ?, admin_remark = ?
      WHERE id = ?
    `, [status, adminRemark || '', id]);
  }

  public static async getLeaveTypes() {
    return await query(`SELECT * FROM leave_types ORDER BY id ASC`);
  }

  public static async createLeaveType(type: string): Promise<number> {
    const result = await execute(`INSERT INTO leave_types (type, is_active) VALUES (?, 'yes')`, [type]);
    return result.insertId;
  }

  public static async updateLeaveType(id: number | string, type: string): Promise<void> {
    await execute(`UPDATE leave_types SET type = ? WHERE id = ?`, [type, id]);
  }

  public static async deleteLeaveType(id: number | string): Promise<void> {
    await execute(`DELETE FROM leave_types WHERE id = ?`, [id]);
  }

  // ==========================================
  // DEPARTMENTS & DESIGNATIONS & ROLES
  // ==========================================
  public static async getDepartments() {
    return await query(`SELECT * FROM department ORDER BY department_name ASC`);
  }

  public static async createDepartment(name: string): Promise<number> {
    const result = await execute(`INSERT INTO department (department_name, is_active) VALUES (?, 'yes')`, [name]);
    return result.insertId;
  }

  public static async updateDepartment(id: number | string, name: string): Promise<void> {
    await execute(`UPDATE department SET department_name = ? WHERE id = ?`, [name, id]);
  }

  public static async deleteDepartment(id: number | string): Promise<void> {
    await execute(`DELETE FROM department WHERE id = ?`, [id]);
  }

  public static async getDesignations() {
    return await query(`SELECT * FROM staff_designation ORDER BY designation ASC`);
  }

  public static async createDesignation(name: string): Promise<number> {
    const result = await execute(`INSERT INTO staff_designation (designation, is_active) VALUES (?, 'yes')`, [name]);
    return result.insertId;
  }

  public static async updateDesignation(id: number | string, name: string): Promise<void> {
    await execute(`UPDATE staff_designation SET designation = ? WHERE id = ?`, [name, id]);
  }

  public static async deleteDesignation(id: number | string): Promise<void> {
    await execute(`DELETE FROM staff_designation WHERE id = ?`, [id]);
  }

  public static async getRoles() {
    return await query(`SELECT id, name, is_active, is_system FROM roles ORDER BY id ASC`);
  }

  // ==========================================
  // RATINGS & TIMELINE
  // ==========================================
  public static async getRatings() {
    return await query(`
      SELECT sr.*, s.name, s.surname, s.employee_id
      FROM staff_rating sr
      JOIN staff s ON s.id = sr.staff_id
      ORDER BY sr.id DESC
    `);
  }

  public static async saveRating(data: any): Promise<number> {
    const result = await execute(`
      INSERT INTO staff_rating (staff_id, rate, comment, user_id, role, status)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [data.staff_id, data.rate || 5, data.comment || '', data.user_id || 1, data.role || 'Admin']);
    return result.insertId;
  }

  public static async approveRating(id: number | string, approve: number): Promise<void> {
    await execute(`UPDATE staff_rating SET status = ? WHERE id = ?`, [approve, id]);
  }

  public static async deleteRating(id: number | string): Promise<void> {
    await execute(`DELETE FROM staff_rating WHERE id = ?`, [id]);
  }

  public static async getTimeline(staffId: number | string) {
    return await query(`SELECT * FROM staff_timeline WHERE staff_id = ? ORDER BY timeline_date DESC, id DESC`, [staffId]);
  }

  public static async createTimeline(data: any): Promise<number> {
    const result = await execute(`
      INSERT INTO staff_timeline (staff_id, title, timeline_date, description, document, status, date)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      data.staff_id,
      data.title,
      data.timeline_date || data.date || new Date().toISOString().split('T')[0],
      data.description || '',
      data.document || '',
      data.status || 'yes'
    ]);
    return result.insertId;
  }

  public static async deleteTimeline(id: number | string): Promise<void> {
    await execute(`DELETE FROM staff_timeline WHERE id = ?`, [id]);
  }
}
