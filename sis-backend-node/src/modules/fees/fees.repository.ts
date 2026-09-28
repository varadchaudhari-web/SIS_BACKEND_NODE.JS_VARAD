import { query, queryOne, execute, transaction } from '../../config/database';

export class FeesRepository {
  /**
   * Helper to retrieve active current session
   */
  public static async getCurrentSession(): Promise<number> {
    const row = await queryOne(`SELECT session_id FROM sch_settings LIMIT 1`);
    return row?.session_id ? Number(row.session_id) : 17;
  }

  // ==========================================
  // 1. FEES GROUPS
  // ==========================================
  public static async getFeeGroups(id?: number | string) {
    if (id) {
      return await queryOne(`SELECT * FROM fee_groups WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM fee_groups WHERE is_system = 0 ORDER BY id DESC`);
  }

  public static async checkFeeGroupExists(name: string, id: number | string = 0): Promise<boolean> {
    const row = await queryOne(`SELECT id FROM fee_groups WHERE name = ? AND id != ?`, [name, id]);
    return !!row;
  }

  public static async createFeeGroup(data: { name: string; description?: string }): Promise<number> {
    const result = await execute(
      `INSERT INTO fee_groups (name, description, is_system, is_active) VALUES (?, ?, 0, 'yes')`,
      [data.name, data.description || '']
    );
    return result.insertId;
  }

  public static async updateFeeGroup(id: number | string, data: { name: string; description?: string }): Promise<void> {
    await execute(
      `UPDATE fee_groups SET name = ?, description = ? WHERE id = ?`,
      [data.name, data.description || '', id]
    );
  }

  public static async deleteFeeGroup(id: number | string): Promise<void> {
    await execute(`DELETE FROM fee_groups WHERE id = ?`, [id]);
  }

  // ==========================================
  // 2. FEES TYPE
  // ==========================================
  public static async getFeeTypes(id?: number | string) {
    if (id) {
      return await queryOne(`SELECT * FROM feetype WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM feetype WHERE is_system = 0 ORDER BY id DESC`);
  }

  public static async checkFeeTypeExists(type: string, id: number | string = 0): Promise<boolean> {
    const row = await queryOne(`SELECT id FROM feetype WHERE type = ? AND id != ?`, [type, id]);
    return !!row;
  }

  public static async createFeeType(data: { type: string; code?: string; description?: string }): Promise<number> {
    const result = await execute(
      `INSERT INTO feetype (type, code, description, is_system, is_active) VALUES (?, ?, ?, 0, 'yes')`,
      [data.type, data.code || data.type, data.description || '']
    );
    return result.insertId;
  }

  public static async updateFeeType(id: number | string, data: { type: string; code?: string; description?: string }): Promise<void> {
    await execute(
      `UPDATE feetype SET type = ?, code = ?, description = ? WHERE id = ?`,
      [data.type, data.code || data.type, data.description || '', id]
    );
  }

  public static async deleteFeeType(id: number | string): Promise<void> {
    await execute(`DELETE FROM feetype WHERE id = ?`, [id]);
  }

  // ==========================================
  // 3. FEES MASTER (fee_session_groups & fee_groups_feetype)
  // ==========================================
  public static async getFeesByGroup(id?: number | string, sessionId?: number) {
    const session = sessionId || (await this.getCurrentSession());
    let sql = `
      SELECT fsg.*, fg.name as group_name, fg.description as group_description
      FROM fee_session_groups fsg
      JOIN fee_groups fg ON fg.id = fsg.fee_groups_id
      WHERE fsg.session_id = ? AND fg.is_system = 0
    `;
    const params: any[] = [session];
    if (id) {
      sql += ` AND fsg.id = ?`;
      params.push(id);
    }
    sql += ` ORDER BY fsg.id DESC`;

    const groups = await query(sql, params);
    for (const g of groups) {
      g.feetypes = await query(`
        SELECT fgf.*, ft.type, ft.code
        FROM fee_groups_feetype fgf
        JOIN feetype ft ON ft.id = fgf.feetype_id
        WHERE fgf.fee_session_group_id = ?
        ORDER BY fgf.due_date ASC
      `, [g.id]);
    }
    return groups;
  }

  public static async getFeeGroupByID(id: number | string) {
    const group = await queryOne(`
      SELECT fgf.*, fg.name as group_name, ft.type as feetype_name, ft.code as feetype_code
      FROM fee_groups_feetype fgf
      JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
      JOIN feetype ft ON ft.id = fgf.feetype_id
      WHERE fgf.id = ?
    `, [id]);
    return group;
  }

  public static async checkFeeMasterCombination(feeGroupId: number | string, feetypeId: number | string, sessionId: number): Promise<boolean> {
    const row = await queryOne(`
      SELECT id FROM fee_groups_feetype
      WHERE fee_groups_id = ? AND feetype_id = ? AND session_id = ?
    `, [feeGroupId, feetypeId, sessionId]);
    return !!row;
  }

  public static async createFeeMaster(data: {
    fee_groups_id: number | string;
    feetype_id: number | string;
    amount: number;
    due_date?: string;
    fine_type?: string;
    fine_percentage?: number;
    fine_amount?: number;
  }, sessionId: number): Promise<number> {
    // 1. Ensure fee_session_groups exists
    let fsg = await queryOne(
      `SELECT id FROM fee_session_groups WHERE fee_groups_id = ? AND session_id = ?`,
      [data.fee_groups_id, sessionId]
    );

    let feeSessionGroupId: number;
    if (!fsg) {
      const inserted = await execute(
        `INSERT INTO fee_session_groups (fee_groups_id, session_id, is_active) VALUES (?, ?, 'yes')`,
        [data.fee_groups_id, sessionId]
      );
      feeSessionGroupId = inserted.insertId;
    } else {
      feeSessionGroupId = fsg.id;
    }

    // 2. Insert into fee_groups_feetype
    const result = await execute(`
      INSERT INTO fee_groups_feetype (
        fee_session_group_id, fee_groups_id, feetype_id, session_id,
        amount, due_date, fine_type, fine_percentage, fine_amount, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'yes')
    `, [
      feeSessionGroupId,
      data.fee_groups_id,
      data.feetype_id,
      sessionId,
      data.amount,
      data.due_date || new Date().toISOString().split('T')[0],
      data.fine_type || '',
      data.fine_percentage || 0,
      data.fine_amount || 0
    ]);

    return result.insertId;
  }

  public static async updateFeeMaster(id: number | string, data: {
    feetype_id: number | string;
    amount: number;
    due_date?: string;
    fine_type?: string;
    fine_percentage?: number;
    fine_amount?: number;
  }): Promise<void> {
    await execute(`
      UPDATE fee_groups_feetype
      SET feetype_id = ?, amount = ?, due_date = ?, fine_type = ?, fine_percentage = ?, fine_amount = ?
      WHERE id = ?
    `, [
      data.feetype_id,
      data.amount,
      data.due_date || new Date().toISOString().split('T')[0],
      data.fine_type || '',
      data.fine_percentage || 0,
      data.fine_amount || 0,
      id
    ]);
  }

  public static async deleteFeeMaster(id: number | string): Promise<void> {
    await execute(`DELETE FROM fee_groups_feetype WHERE id = ?`, [id]);
  }

  // ==========================================
  // 4. COLLECT FEES & STUDENT FEES
  // ==========================================
  public static async getStudentBySessionId(studentSessionId: number | string) {
    return await queryOne(`
      SELECT s.*, ss.id as student_session_id, ss.class_id, ss.section_id, c.class as class_name, sc.section as section_name
      FROM student_session ss
      JOIN students s ON s.id = ss.student_id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      WHERE ss.id = ?
    `, [studentSessionId]);
  }

  public static async getStudentFees(studentSessionId: number | string) {
    const studentFeeMasters = await query(`
      SELECT sfm.*, fg.name as group_name
      FROM student_fees_master sfm
      INNER JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
      INNER JOIN fee_groups fg ON fg.id = fsg.fee_groups_id
      WHERE sfm.student_session_id = ?
      ORDER BY sfm.id ASC
    `, [studentSessionId]);

    for (const master of studentFeeMasters) {
      master.fees = await query(`
        SELECT sfm.*,
               fgf.id as fee_groups_feetype_id,
               fgf.amount,
               fgf.due_date,
               fgf.fine_amount,
               fgf.fine_type,
               fgf.fine_percentage,
               fgf.fee_groups_id,
               fg.name,
               fgf.feetype_id,
               ft.code,
               ft.type,
               COALESCE(sfd.id, 0) as student_fees_deposite_id,
               COALESCE(sfd.amount_detail, '0') as amount_detail
        FROM student_fees_master sfm
        INNER JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
        INNER JOIN fee_groups_feetype fgf ON fgf.fee_session_group_id = fsg.id
        INNER JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
        INNER JOIN feetype ft ON ft.id = fgf.feetype_id
        LEFT JOIN student_fees_deposite sfd ON (sfd.student_fees_master_id = sfm.id AND sfd.fee_groups_feetype_id = fgf.id)
        WHERE sfm.fee_session_group_id = ? AND sfm.id = ?
        ORDER BY fgf.due_date ASC
      `, [master.fee_session_group_id, master.id]);

      if (master.is_system != 0 && master.fees && master.fees[0]) {
        master.fees[0].amount = master.amount;
      }
    }

    return studentFeeMasters;
  }

  public static async getStudentFeesDiscount(studentSessionId: number | string) {
    return await query(`
      SELECT sfd.*, fd.name, fd.code, fd.amount
      FROM student_fees_discounts sfd
      JOIN fees_discounts fd ON fd.id = sfd.fees_discount_id
      WHERE sfd.student_session_id = ?
    `, [studentSessionId]);
  }

  public static async getCategories() {
    return await query(`SELECT * FROM categories ORDER BY id ASC`);
  }

  public static async getFeeCollectionReport(startDate: string, endDate: string, receivedBy?: string | number) {
    let sql = `
      SELECT sfd.*, s.firstname, s.lastname, s.admission_no, c.class as class_name, sc.section as section_name, fg.name as group_name, ft.type as feetype_name
      FROM student_fees_deposite sfd
      JOIN student_fees_master sfm ON sfm.id = sfd.student_fees_master_id
      JOIN student_session ss ON ss.id = sfm.student_session_id
      JOIN students s ON s.id = ss.student_id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      LEFT JOIN fee_groups_feetype fgf ON fgf.id = sfd.fee_groups_feetype_id
      LEFT JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
      LEFT JOIN feetype ft ON ft.id = fgf.feetype_id
      WHERE DATE(sfd.created_at) BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];
    if (receivedBy) {
      sql += ` AND sfd.amount_detail LIKE ?`;
      params.push(`%"received_by":${receivedBy}%`);
    }
    sql += ` ORDER BY sfd.id DESC`;

    const rows = await query(sql, params);
    for (const r of rows) {
      try {
        r.amount_detail = typeof r.amount_detail === 'string' ? JSON.parse(r.amount_detail) : r.amount_detail;
      } catch (e) {}
    }
    return rows;
  }

  public static async getDueFeeByFeeSessionGroupFeetype(
    feeSessionGroupId: number | string,
    studentFeesMasterId: number | string,
    feeGroupsFeetypeId: number | string
  ) {
    return await queryOne(`
      SELECT sfm.id, sfm.is_system, sfm.student_session_id, sfm.fee_session_group_id,
             sfm.amount as student_fees_master_amount,
             fgf.id as fee_groups_feetype_id, fgf.amount, fgf.due_date, fgf.fine_amount,
             fgf.fee_groups_id, fg.name, fgf.feetype_id, ft.code, ft.type,
             COALESCE(sfd.id, 0) as student_fees_deposite_id,
             COALESCE(sfd.amount_detail, '0') as amount_detail
      FROM student_fees_master sfm
      INNER JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
      INNER JOIN fee_groups_feetype fgf ON fgf.fee_session_group_id = fsg.id
      INNER JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
      INNER JOIN feetype ft ON ft.id = fgf.feetype_id
      LEFT JOIN student_fees_deposite sfd ON (sfd.student_fees_master_id = sfm.id AND sfd.fee_groups_feetype_id = fgf.id)
      WHERE sfm.fee_session_group_id = ? AND sfm.id = ? AND fgf.id = ?
    `, [feeSessionGroupId, studentFeesMasterId, feeGroupsFeetypeId]);
  }

  public static async getStuFeetypeBalance(feeGroupsFeetypeId: number | string, studentFeesMasterId: number | string) {
    const row = await queryOne(`
      SELECT sfm.id, sfm.is_system, sfm.amount as student_fees_master_amount,
             fgf.amount, fgf.due_date, fgf.fine_amount,
             COALESCE(sfd.amount_detail, '0') as amount_detail
      FROM student_fees_master sfm
      INNER JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
      INNER JOIN fee_groups_feetype fgf ON fgf.fee_session_group_id = fsg.id
      LEFT JOIN student_fees_deposite sfd ON (sfd.student_fees_master_id = sfm.id AND sfd.fee_groups_feetype_id = fgf.id)
      WHERE sfm.id = ? AND fgf.id = ?
    `, [studentFeesMasterId, feeGroupsFeetypeId]);

    if (!row) {
      return { status: 'fail', balance: 0, fine_amount: 0 };
    }

    let dueAmt = Number(row.amount || 0);
    if (row.is_system) {
      dueAmt = Number(row.student_fees_master_amount || 0);
    }

    let feeFineAmount = 0;
    if (row.due_date && new Date(row.due_date).getTime() < new Date().getTime()) {
      feeFineAmount = Number(row.fine_amount || 0);
    }

    let paidAmount = 0;
    let discountAmount = 0;
    let fineAmount = 0;

    if (row.amount_detail && row.amount_detail !== '0') {
      try {
        const parsed = typeof row.amount_detail === 'string' ? JSON.parse(row.amount_detail) : row.amount_detail;
        if (parsed && typeof parsed === 'object') {
          Object.values(parsed).forEach((item: any) => {
            paidAmount += Number(item.amount || 0);
            discountAmount += Number(item.amount_discount || 0);
            fineAmount += Number(item.amount_fine || 0);
          });
        }
      } catch (e) {}
    }

    const balance = dueAmt - (paidAmount + discountAmount);
    const calculatedFine = Math.abs(fineAmount - feeFineAmount);

    return {
      status: 'success',
      balance: Math.max(0, balance),
      fine_amount: calculatedFine
    };
  }

  public static async recordFeeDeposit(
    studentFeesMasterId: number | string,
    feeGroupsFeetypeId: number | string,
    detail: {
      amount: number;
      amount_discount?: number;
      amount_fine?: number;
      date: string;
      description?: string;
      payment_mode: string;
      received_by?: string | number;
    },
    studentFeesDiscountId?: number | string
  ): Promise<{ invoice_id: number; sub_invoice_id: number }> {
    const existing = await queryOne(`
      SELECT * FROM student_fees_deposite
      WHERE student_fees_master_id = ? AND fee_groups_feetype_id = ?
    `, [studentFeesMasterId, feeGroupsFeetypeId]);

    if (existing) {
      let amountMap: Record<string, any> = {};
      try {
        amountMap = typeof existing.amount_detail === 'string' ? JSON.parse(existing.amount_detail) : existing.amount_detail;
      } catch (e) {}

      const keys = Object.keys(amountMap).map(k => Number(k)).filter(n => !isNaN(n));
      const nextInvNo = (keys.length > 0 ? Math.max(...keys) : 0) + 1;

      const newEntry = {
        ...detail,
        inv_no: nextInvNo
      };
      amountMap[String(nextInvNo)] = newEntry;

      await execute(`
        UPDATE student_fees_deposite
        SET amount_detail = ?
        WHERE id = ?
      `, [JSON.stringify(amountMap), existing.id]);

      if (studentFeesDiscountId) {
        await execute(`
          UPDATE student_fees_discounts
          SET status = 'applied', description = ?, payment_id = ?
          WHERE id = ?
        `, [detail.description || '', `${existing.id}/${nextInvNo}`, studentFeesDiscountId]);
      }

      return { invoice_id: existing.id, sub_invoice_id: nextInvNo };
    } else {
      const newEntry = {
        ...detail,
        inv_no: 1
      };
      const initialMap = { "1": newEntry };

      const inserted = await execute(`
        INSERT INTO student_fees_deposite (student_fees_master_id, fee_groups_feetype_id, amount_detail, is_active)
        VALUES (?, ?, ?, 'yes')
      `, [studentFeesMasterId, feeGroupsFeetypeId, JSON.stringify(initialMap)]);

      if (studentFeesDiscountId) {
        await execute(`
          UPDATE student_fees_discounts
          SET status = 'applied', description = ?, payment_id = ?
          WHERE id = ?
        `, [detail.description || '', `${inserted.insertId}/1`, studentFeesDiscountId]);
      }

      return { invoice_id: inserted.insertId, sub_invoice_id: 1 };
    }
  }

  // ==========================================
  // 5. SEARCH DUE FEES
  // ==========================================
  public static async searchDueFees(classId: number | string, sectionId: number | string, feeGroupId: number | string, feetypeId?: number | string) {
    let sql = `
      SELECT s.id, s.firstname, s.lastname, s.admission_no, s.roll_no, s.father_name,
             c.class, sc.section, ss.id as student_session_id,
             fgf.id as fee_groups_feetype_id, fgf.amount, fgf.due_date,
             fg.name as fee_group_name, ft.type as fee_type,
             COALESCE(sfd.id, 0) as student_fees_deposite_id,
             COALESCE(sfd.amount_detail, '0') as amount_detail
      FROM students s
      JOIN student_session ss ON ss.student_id = s.id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      JOIN student_fees_master sfm ON sfm.student_session_id = ss.id
      JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
      JOIN fee_groups_feetype fgf ON fgf.fee_session_group_id = fsg.id
      JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
      JOIN feetype ft ON ft.id = fgf.feetype_id
      LEFT JOIN student_fees_deposite sfd ON (sfd.student_fees_master_id = sfm.id AND sfd.fee_groups_feetype_id = fgf.id)
      WHERE s.is_active = 'yes' AND ss.class_id = ? AND ss.section_id = ? AND fgf.fee_groups_id = ?
    `;
    const params: any[] = [classId, sectionId, feeGroupId];
    if (feetypeId) {
      sql += ` AND fgf.feetype_id = ?`;
      params.push(feetypeId);
    }

    const rows = await query(sql, params);
    const dueStudents: any[] = [];

    for (const r of rows) {
      let paid = 0;
      let discount = 0;
      let fine = 0;

      if (r.amount_detail && r.amount_detail !== '0') {
        try {
          const parsed = typeof r.amount_detail === 'string' ? JSON.parse(r.amount_detail) : r.amount_detail;
          if (parsed && typeof parsed === 'object') {
            Object.values(parsed).forEach((item: any) => {
              paid += Number(item.amount || 0);
              discount += Number(item.amount_discount || 0);
              fine += Number(item.amount_fine || 0);
            });
          }
        } catch (e) {}
      }

      const totalDue = Number(r.amount || 0);
      if (paid + discount < totalDue) {
        dueStudents.push({
          ...r,
          amount_paid: paid,
          amount_discount: discount,
          amount_fine: fine,
          balance: totalDue - (paid + discount)
        });
      }
    }

    return dueStudents;
  }

  // ==========================================
  // 6. FEE DISCOUNTS & ASSIGNMENT
  // ==========================================
  public static async getFeeDiscounts(id?: number | string, sessionId?: number) {
    const session = sessionId || (await this.getCurrentSession());
    if (id) {
      return await queryOne(`SELECT * FROM fees_discounts WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM fees_discounts WHERE session_id = ? ORDER BY id DESC`, [session]);
  }

  public static async createFeeDiscount(data: { name: string; code: string; amount: number; description?: string }, sessionId: number): Promise<number> {
    const result = await execute(`
      INSERT INTO fees_discounts (session_id, name, code, amount, description, is_active)
      VALUES (?, ?, ?, ?, ?, 'yes')
    `, [sessionId, data.name, data.code, data.amount, data.description || '']);
    return result.insertId;
  }

  public static async updateFeeDiscount(id: number | string, data: { name: string; code: string; amount: number; description?: string }): Promise<void> {
    await execute(`
      UPDATE fees_discounts
      SET name = ?, code = ?, amount = ?, description = ?
      WHERE id = ?
    `, [data.name, data.code, data.amount, data.description || '', id]);
  }

  public static async deleteFeeDiscount(id: number | string): Promise<void> {
    await execute(`DELETE FROM fees_discounts WHERE id = ?`, [id]);
  }

  public static async searchAssignDiscountStudents(classId: number | string, sectionId: number | string, discountId: number | string, sessionId: number) {
    return await query(`
      SELECT ss.id as student_session_id, s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname,
             c.class, sc.section, s.father_name, s.gender,
             COALESCE(sfd.id, 0) as student_fees_discount_id,
             sfd.status as discount_status
      FROM student_session ss
      JOIN students s ON s.id = ss.student_id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      LEFT JOIN student_fees_discounts sfd ON (sfd.student_session_id = ss.id AND sfd.fees_discount_id = ?)
      WHERE ss.session_id = ? AND ss.class_id = ? AND ss.section_id = ? AND s.is_active = 'yes'
      ORDER BY s.id ASC
    `, [discountId, sessionId, classId, sectionId]);
  }

  public static async assignDiscount(discountId: number | string, studentSessionIds: (number | string)[], allStudentSessionIds: (number | string)[]) {
    // 1. Allot discount to selected students
    for (const sid of studentSessionIds) {
      const existing = await queryOne(`
        SELECT id FROM student_fees_discounts
        WHERE student_session_id = ? AND fees_discount_id = ?
      `, [sid, discountId]);

      if (!existing) {
        await execute(`
          INSERT INTO student_fees_discounts (student_session_id, fees_discount_id, status, is_active)
          VALUES (?, ?, 'assigned', 'yes')
        `, [sid, discountId]);
      }
    }

    // 2. Remove discount for unselected students in this class/section
    const diff = allStudentSessionIds.filter(id => !studentSessionIds.includes(id));
    if (diff.length > 0) {
      const placeholders = diff.map(() => '?').join(',');
      await execute(`
        DELETE FROM student_fees_discounts
        WHERE fees_discount_id = ? AND student_session_id IN (${placeholders}) AND status != 'applied'
      `, [discountId, ...diff]);
    }
  }

  // ==========================================
  // 7. CARRY FORWARD
  // ==========================================
  public static async getPreviousSessionStudents(preSessionId: number, classId: number | string, sectionId: number | string) {
    return await query(`
      SELECT s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.father_name, s.admission_date,
             curr_ss.id as current_student_session_id,
             prev_ss.id as previous_student_session_id
      FROM students s
      JOIN student_session curr_ss ON curr_ss.student_id = s.id
      JOIN student_session prev_ss ON prev_ss.student_id = s.id AND prev_ss.session_id = ?
      WHERE curr_ss.class_id = ? AND curr_ss.section_id = ? AND s.is_active = 'yes'
    `, [preSessionId, classId, sectionId]);
  }

  public static async getBalanceMasterRecord(groupName: string, studentSessionIds: (number | string)[], currentSessionId: number) {
    if (studentSessionIds.length === 0) return [];
    const placeholders = studentSessionIds.map(() => '?').join(',');
    return await query(`
      SELECT sfm.*
      FROM student_fees_master sfm
      JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
      JOIN fee_groups fg ON fg.id = fsg.fee_groups_id
      WHERE fg.name = ? AND fsg.session_id = ? AND sfm.student_session_id IN (${placeholders})
    `, [groupName, currentSessionId, ...studentSessionIds]);
  }

  // ==========================================
  // 8. FEES REMINDER
  // ==========================================
  public static async getFeeReminders() {
    return await query(`SELECT * FROM fees_reminder ORDER BY id ASC`);
  }

  public static async saveFeeReminder(data: { id?: number | string; reminder_type: string; day: number; is_active: number }) {
    if (data.id) {
      await execute(`
        UPDATE fees_reminder
        SET reminder_type = ?, day = ?, is_active = ?, updated_at = CURDATE()
        WHERE id = ?
      `, [data.reminder_type, data.day, data.is_active, data.id]);
    } else {
      await execute(`
        INSERT INTO fees_reminder (reminder_type, day, is_active)
        VALUES (?, ?, ?)
      `, [data.reminder_type, data.day, data.is_active]);
    }
  }

  // ==========================================
  // 9. FEES RECEIPT & REVERSAL
  // ==========================================
  public static async getReceiptById(id: number | string) {
    const row = await queryOne(`
      SELECT sfd.*, s.firstname, s.lastname, s.admission_no, c.class as class_name, sc.section as section_name,
             fg.name as fee_group_name, ft.type as fee_type_name
      FROM student_fees_deposite sfd
      JOIN student_fees_master sfm ON sfm.id = sfd.student_fees_master_id
      JOIN student_session ss ON ss.id = sfm.student_session_id
      JOIN students s ON s.id = ss.student_id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      LEFT JOIN fee_groups_feetype fgf ON fgf.id = sfd.fee_groups_feetype_id
      LEFT JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
      LEFT JOIN feetype ft ON ft.id = fgf.feetype_id
      WHERE sfd.id = ?
    `, [id]);

    if (row && row.amount_detail) {
      try {
        row.amount_detail = typeof row.amount_detail === 'string' ? JSON.parse(row.amount_detail) : row.amount_detail;
      } catch (e) {}
    }
    return row;
  }

  public static async getReceiptsList(limit = 100) {
    const rows = await query(`
      SELECT sfd.*, s.firstname, s.lastname, s.admission_no, c.class as class_name, sc.section as section_name,
             fg.name as fee_group_name, ft.type as fee_type_name
      FROM student_fees_deposite sfd
      JOIN student_fees_master sfm ON sfm.id = sfd.student_fees_master_id
      JOIN student_session ss ON ss.id = sfm.student_session_id
      JOIN students s ON s.id = ss.student_id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      LEFT JOIN fee_groups_feetype fgf ON fgf.id = sfd.fee_groups_feetype_id
      LEFT JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
      LEFT JOIN feetype ft ON ft.id = fgf.feetype_id
      ORDER BY sfd.id DESC
      LIMIT ?
    `, [limit]);

    for (const r of rows) {
      try {
        r.amount_detail = typeof r.amount_detail === 'string' ? JSON.parse(r.amount_detail) : r.amount_detail;
      } catch (e) {}
    }
    return rows;
  }

  public static async deleteDeposit(id: number | string, invNo?: string | number): Promise<boolean> {
    const deposit = await queryOne(`SELECT * FROM student_fees_deposite WHERE id = ?`, [id]);
    if (!deposit) return false;

    if (invNo !== undefined && invNo !== null && invNo !== '') {
      let amountMap: Record<string, any> = {};
      try {
        amountMap = typeof deposit.amount_detail === 'string' ? JSON.parse(deposit.amount_detail) : deposit.amount_detail;
      } catch (e) {}

      if (amountMap[String(invNo)]) {
        delete amountMap[String(invNo)];
        if (Object.keys(amountMap).length === 0) {
          await execute(`DELETE FROM student_fees_deposite WHERE id = ?`, [id]);
        } else {
          await execute(`UPDATE student_fees_deposite SET amount_detail = ? WHERE id = ?`, [JSON.stringify(amountMap), id]);
        }
        return true;
      }
      return false;
    } else {
      await execute(`DELETE FROM student_fees_deposite WHERE id = ?`, [id]);
      return true;
    }
  }

  // ==========================================
  // 10. DASHBOARD SUMMARY
  // ==========================================
  public static async getDashboardSummary(sessionId: number) {
    const feeGroupsCount = await queryOne(`SELECT COUNT(*) as count FROM fee_groups WHERE is_system = 0`);
    const feeTypesCount = await queryOne(`SELECT COUNT(*) as count FROM feetype WHERE is_system = 0`);
    const feeAssignedCount = await queryOne(`SELECT COUNT(*) as count FROM student_fees_master`);
    const totalReceipts = await queryOne(`SELECT COUNT(*) as count FROM student_fees_deposite`);
    const feeSessionGroupsCount = await queryOne(`SELECT COUNT(*) as count FROM fee_session_groups WHERE session_id = ?`, [sessionId]);

    return {
      fee_groups_count: Number(feeGroupsCount?.count || 0),
      fee_types_count: Number(feeTypesCount?.count || 0),
      fee_assigned_count: Number(feeAssignedCount?.count || 0),
      total_receipts: Number(totalReceipts?.count || 0),
      fee_session_groups_count: Number(feeSessionGroupsCount?.count || 0),
      session_id: sessionId
    };
  }
}
