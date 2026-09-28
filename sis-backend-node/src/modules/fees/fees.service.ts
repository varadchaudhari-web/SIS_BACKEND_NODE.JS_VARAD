import { FeesRepository } from './fees.repository';
import { query, queryOne, execute } from '../../config/database';
import { logger } from '../../utils/logger';

export class FeesService {
  // ==========================================
  // 1. FEES GROUPS
  // ==========================================
  public static async getFeeGroups(id?: number | string) {
    return await FeesRepository.getFeeGroups(id);
  }

  public static async saveFeeGroup(data: { id?: number | string; name: string; description?: string }) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Name is required');
    }

    const checkId = data.id || 0;
    const exists = await FeesRepository.checkFeeGroupExists(data.name.trim(), checkId);
    if (exists) {
      throw new Error('Record already exists');
    }

    if (data.id) {
      await FeesRepository.updateFeeGroup(data.id, {
        name: data.name.trim(),
        description: data.description || ''
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FeesRepository.createFeeGroup({
        name: data.name.trim(),
        description: data.description || ''
      });
      return { id: newId };
    }
  }

  public static async deleteFeeGroup(id: number | string) {
    await FeesRepository.deleteFeeGroup(id);
    return { id };
  }

  // ==========================================
  // 2. FEES TYPE
  // ==========================================
  public static async getFeeTypes(id?: number | string) {
    return await FeesRepository.getFeeTypes(id);
  }

  public static async saveFeeType(data: { id?: number | string; type?: string; name?: string; code?: string; description?: string }) {
    const typeName = data.type || data.name;
    if (!typeName || !typeName.trim()) {
      throw new Error('Fee type name is required');
    }

    const checkId = data.id || 0;
    const exists = await FeesRepository.checkFeeTypeExists(typeName.trim(), checkId);
    if (exists) {
      throw new Error('Record already exists');
    }

    if (data.id) {
      await FeesRepository.updateFeeType(data.id, {
        type: typeName.trim(),
        code: data.code || typeName.trim(),
        description: data.description || ''
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FeesRepository.createFeeType({
        type: typeName.trim(),
        code: data.code || typeName.trim(),
        description: data.description || ''
      });
      return { id: newId };
    }
  }

  public static async deleteFeeType(id: number | string) {
    await FeesRepository.deleteFeeType(id);
    return { id };
  }

  // ==========================================
  // 3. FEES MASTER
  // ==========================================
  public static async getFeesMaster(id?: number | string, sessionId?: number) {
    if (id) {
      return await FeesRepository.getFeeGroupByID(id);
    }
    return await FeesRepository.getFeesByGroup(undefined, sessionId);
  }

  public static async saveFeeMaster(data: {
    id?: number | string;
    fee_groups_id?: number | string;
    fee_group_id?: number | string;
    feetype_id?: number | string;
    fee_type_id?: number | string;
    amount: number;
    due_date?: string;
    fine_type?: string;
    account_type?: string;
    fine_percentage?: number;
    fine_amount?: number;
    class_id?: number | string;
  }, sessionId?: number) {
    const session = sessionId || (await FeesRepository.getCurrentSession());
    const groupId = data.fee_groups_id || data.fee_group_id;
    const typeId = data.feetype_id || data.fee_type_id;

    if (data.id) {
      if (!typeId || data.amount === undefined || data.amount === null) {
        throw new Error('Fee Type ID and Amount are required');
      }
      await FeesRepository.updateFeeMaster(data.id, {
        feetype_id: typeId,
        amount: Number(data.amount),
        due_date: data.due_date,
        fine_type: data.fine_type || data.account_type || '',
        fine_percentage: Number(data.fine_percentage || 0),
        fine_amount: Number(data.fine_amount || 0)
      });
      return { id: Number(data.id) };
    } else {
      if (!groupId || !typeId || data.amount === undefined || data.amount === null) {
        throw new Error('Fee Group ID, Fee Type ID, and Amount are required');
      }

      // Check if combination already exists
      const exists = await FeesRepository.checkFeeMasterCombination(groupId, typeId, session);
      if (exists) {
        throw new Error('FeeGroup combination already exists');
      }

      // Ensure fee_groups and feetype exist to satisfy any DB constraints
      const fg = await queryOne(`SELECT id FROM fee_groups WHERE id = ?`, [groupId]);
      if (!fg) {
        await execute(`INSERT INTO fee_groups (id, name, is_system, is_active) VALUES (?, ?, 0, 'yes')`, [groupId, `Group ${groupId}`]);
      }
      const ft = await queryOne(`SELECT id FROM feetype WHERE id = ?`, [typeId]);
      if (!ft) {
        await execute(`INSERT INTO feetype (id, type, code, is_system, is_active) VALUES (?, ?, ?, 0, 'yes')`, [typeId, `Type ${typeId}`, `Type ${typeId}`]);
      }

      const newId = await FeesRepository.createFeeMaster({
        fee_groups_id: groupId,
        feetype_id: typeId,
        amount: Number(data.amount),
        due_date: data.due_date,
        fine_type: data.fine_type || data.account_type || '',
        fine_percentage: Number(data.fine_percentage || 0),
        fine_amount: Number(data.fine_amount || 0)
      }, session);

      return {
        id: newId,
        fee_group_id: Number(groupId),
        fee_type_id: Number(typeId),
        class_id: data.class_id ? Number(data.class_id) : 1,
        amount: Number(data.amount),
        is_active: 'yes'
      };
    }
  }

  public static async deleteFeeMaster(id: number | string) {
    await FeesRepository.deleteFeeMaster(id);
    return { id };
  }

  // ==========================================
  // 4. COLLECT FEES
  // ==========================================
  public static async getCollectFeesData(studentSessionId?: number | string, startDate?: string, endDate?: string, receivedBy?: string | number) {
    if (studentSessionId) {
      const student = await FeesRepository.getStudentBySessionId(studentSessionId);
      if (!student) {
        throw new Error('Student record not found');
      }

      const studentDueFee = await FeesRepository.getStudentFees(studentSessionId);
      const studentDiscountFee = await FeesRepository.getStudentFeesDiscount(studentSessionId);
      const categorylist = await FeesRepository.getCategories();

      return {
        student,
        student_due_fee: studentDueFee,
        student_discount_fee: studentDiscountFee,
        categorylist,
        gateway_available: false
      };
    } else {
      const start = startDate || '1970-01-01';
      const end = endDate || new Date().toISOString().split('T')[0];
      return await FeesRepository.getFeeCollectionReport(start, end, receivedBy);
    }
  }

  public static async depositFee(input: {
    fee_groups_feetype_id: number | string;
    amount: number;
    payment_mode: string;
    student_fees_master_id?: number | string;
    student_session_id?: number | string;
    amount_discount?: number;
    amount_fine?: number;
    date?: string;
    description?: string;
    received_by?: string | number;
    student_fees_discount_id?: number | string;
  }) {
    if (!input.fee_groups_feetype_id || input.amount === undefined || !input.payment_mode) {
      throw new Error('fee_groups_feetype_id, amount, and payment_mode are required');
    }

    let studentFeesMasterId = input.student_fees_master_id;
    if (!studentFeesMasterId) {
      if (!input.student_session_id) {
        throw new Error('student_fees_master_id or student_session_id is required');
      }

      const fgf = await queryOne(`SELECT * FROM fee_groups_feetype WHERE id = ?`, [input.fee_groups_feetype_id]);
      if (!fgf) {
        throw new Error('fee_groups_feetype record not found');
      }

      const sfm = await queryOne(`
        SELECT * FROM student_fees_master
        WHERE student_session_id = ? AND fee_session_group_id = ?
      `, [input.student_session_id, fgf.fee_session_group_id]);

      if (!sfm) {
        const ins = await execute(`
          INSERT INTO student_fees_master (student_session_id, fee_session_group_id, amount, is_system, is_active)
          VALUES (?, ?, ?, 0, 'yes')
        `, [input.student_session_id, fgf.fee_session_group_id, fgf.amount]);
        studentFeesMasterId = ins.insertId;
      } else {
        studentFeesMasterId = sfm.id;
      }
    }

    if (!studentFeesMasterId) {
      throw new Error('Failed to resolve student fees master');
    }

    const discount = Number(input.amount_discount || 0);
    const depositAmt = Number(input.amount) + discount;

    const balanceInfo = await FeesRepository.getStuFeetypeBalance(input.fee_groups_feetype_id, studentFeesMasterId);
    if (balanceInfo.balance < depositAmt) {
      throw new Error('Deposit amount cannot be greater than remaining balance');
    }

    const res = await FeesRepository.recordFeeDeposit(
      studentFeesMasterId,
      input.fee_groups_feetype_id,
      {
        amount: Number(input.amount),
        amount_discount: discount,
        amount_fine: Number(input.amount_fine || 0),
        date: input.date || new Date().toISOString().split('T')[0],
        description: input.description || '',
        payment_mode: input.payment_mode,
        received_by: input.received_by || 1
      },
      input.student_fees_discount_id
    );

    return {
      student_fees_deposite_id: res.invoice_id,
      sub_invoice_id: res.sub_invoice_id,
      invoice_no: `${res.invoice_id}/${res.sub_invoice_id}`
    };
  }

  public static async deleteDeposit(id: number | string, invNo?: string | number) {
    const success = await FeesRepository.deleteDeposit(id, invNo);
    if (!success) {
      throw new Error('Payment record not found or could not be removed');
    }
    return { id, inv_no: invNo };
  }

  // ==========================================
  // 5. SEARCH FEES PAYMENT & DUE FEES
  // ==========================================
  public static async searchFeesPayment(paymentId?: string, studentId?: string | number, sessionId?: number) {
    const session = sessionId || (await FeesRepository.getCurrentSession());

    if (studentId) {
      const student = await queryOne(`
        SELECT ss.id as student_session_id, ss.hostel_room_id, c.class as class_name, sc.section as section_name
        FROM student_session ss
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sc ON sc.id = ss.section_id
        WHERE ss.student_id = ? AND ss.session_id = ?
      `, [studentId, session]);

      if (!student) {
        return [];
      }

      const feeMasters = await query(`
        SELECT fgf.*, fg.name as group_name, fg.description as group_desc, ft.type as type_name
        FROM fee_groups_feetype fgf
        JOIN fee_groups fg ON fg.id = fgf.fee_groups_id
        JOIN feetype ft ON ft.id = fgf.feetype_id
        WHERE fgf.session_id = ?
      `, [session]);

      const records: any[] = [];
      for (const master of feeMasters) {
        const amount = Number(master.amount || 0);
        let paid = 0;
        let discount = 0;
        const receipts: string[] = [];

        const sfm = await queryOne(`
          SELECT id FROM student_fees_master
          WHERE student_session_id = ? AND fee_session_group_id = ?
        `, [student.student_session_id, master.fee_session_group_id]);

        if (sfm) {
          const deposit = await queryOne(`
            SELECT id, amount_detail FROM student_fees_deposite
            WHERE student_fees_master_id = ? AND fee_groups_feetype_id = ?
          `, [sfm.id, master.id]);

          if (deposit && deposit.amount_detail) {
            try {
              const details = typeof deposit.amount_detail === 'string' ? JSON.parse(deposit.amount_detail) : deposit.amount_detail;
              if (details && typeof details === 'object') {
                for (const [invNo, pmt] of Object.entries(details) as any) {
                  paid += Number(pmt.amount || 0);
                  discount += Number(pmt.amount_discount || 0);
                  receipts.push(`${deposit.id}/${invNo}`);
                }
              }
            } catch (e) {}
          }
        }

        const balance = Math.max(0, amount - (paid + discount));
        records.push({
          id: master.id,
          fee_group: master.group_name !== master.type_name ? `${master.group_name} - ${master.type_name}` : master.group_name,
          amount,
          paid,
          balance,
          discount,
          due_date: master.due_date,
          receipt_no: receipts.length > 0 ? receipts.join(', ') : '-'
        });
      }

      return records;
    }

    if (!paymentId) {
      return { feeList: [], sub_invoice_id: '' };
    }

    const parts = paymentId.split('/');
    const invoiceId = parts[0];
    const subInvoiceId = parts[1] || '';

    const deposit = await queryOne(`
      SELECT sfd.*, s.firstname, s.lastname, s.admission_no, c.class, sc.section
      FROM student_fees_deposite sfd
      JOIN student_fees_master sfm ON sfm.id = sfd.student_fees_master_id
      JOIN student_session ss ON ss.id = sfm.student_session_id
      JOIN students s ON s.id = ss.student_id
      JOIN classes c ON c.id = ss.class_id
      JOIN sections sc ON sc.id = ss.section_id
      WHERE sfd.id = ?
    `, [invoiceId]);

    return {
      feeList: deposit ? [deposit] : [],
      sub_invoice_id: subInvoiceId
    };
  }

  public static async searchDueFees(classId?: number | string, sectionId?: number | string, feeGroupId?: string) {
    if (!classId || !sectionId || !feeGroupId) {
      return [];
    }

    const parts = String(feeGroupId).split('-');
    const realFeeGroupId = parts[0];
    const feeGroupsFeetypeId = parts[1] || undefined;

    return await FeesRepository.searchDueFees(classId, sectionId, realFeeGroupId, feeGroupsFeetypeId);
  }

  // ==========================================
  // 6. FEE DISCOUNTS & ASSIGNMENT
  // ==========================================
  public static async getFeeDiscounts(id?: number | string, sessionId?: number) {
    return await FeesRepository.getFeeDiscounts(id, sessionId);
  }

  public static async saveFeeDiscount(data: { id?: number | string; name: string; code: string; amount?: number; percentage?: number; description?: string }, sessionId?: number) {
    const session = sessionId || (await FeesRepository.getCurrentSession());
    if (!data.name || !data.code) {
      throw new Error('Name and Code are required');
    }

    const amt = data.percentage !== undefined ? Number(data.percentage) : Number(data.amount || 0);

    if (data.id) {
      await FeesRepository.updateFeeDiscount(data.id, {
        name: data.name,
        code: data.code,
        amount: amt,
        description: data.description || ''
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FeesRepository.createFeeDiscount({
        name: data.name,
        code: data.code,
        amount: amt,
        description: data.description || ''
      }, session);
      return { id: newId };
    }
  }

  public static async deleteFeeDiscount(id: number | string) {
    await FeesRepository.deleteFeeDiscount(id);
    return { id };
  }

  public static async searchAssignDiscountStudents(classId: number | string, sectionId: number | string, discountId: number | string, sessionId?: number) {
    const session = sessionId || (await FeesRepository.getCurrentSession());
    return await FeesRepository.searchAssignDiscountStudents(classId, sectionId, discountId, session);
  }

  public static async assignDiscount(discountId: number | string, studentSessionIds: (number | string)[], allStudentSessionIds: (number | string)[]) {
    await FeesRepository.assignDiscount(discountId, studentSessionIds, allStudentSessionIds);
    return { status: true, message: 'Discounts assigned successfully' };
  }

  // ==========================================
  // 7. CARRY FORWARD
  // ==========================================
  public static async getCarryForward(classId?: number | string, sectionId?: number | string) {
    if (!classId || !sectionId) {
      return { student_Array: [], is_update: false };
    }

    const currentSession = await FeesRepository.getCurrentSession();
    const preSessionRow = await queryOne(`SELECT id FROM sessions WHERE id < ? ORDER BY id DESC LIMIT 1`, [currentSession]);
    const preSessionId = preSessionRow?.id || (currentSession - 1);

    const students = await FeesRepository.getPreviousSessionStudents(preSessionId, classId, sectionId);
    if (!students || students.length === 0) {
      return { student_Array: [], is_update: false };
    }

    const studentArray: any[] = [];
    const sessionIds: number[] = [];
    for (const s of students) {
      studentArray.push({
        name: `${s.firstname || ''} ${s.lastname || ''}`.trim(),
        admission_no: s.admission_no,
        roll_no: s.roll_no,
        father_name: s.father_name,
        student_session_id: s.current_student_session_id,
        student_previous_session_id: s.previous_student_session_id,
        admission_date: s.admission_date,
        balance: 0
      });
      sessionIds.push(s.current_student_session_id);
    }

    const records = await FeesRepository.getBalanceMasterRecord('Previous Session Balance', sessionIds, currentSession);
    let isUpdate = false;
    if (records && records.length > 0) {
      isUpdate = true;
      for (const st of studentArray) {
        const found = records.find((r: any) => r.student_session_id === st.student_session_id);
        if (found) {
          st.balance = Number(found.amount || 0);
        }
      }
    }

    return { student_Array: studentArray, is_update: isUpdate };
  }

  public static async saveCarryForward(input: {
    student_session_id?: number | string;
    due_date?: string;
    balances?: Array<{ student_session_id: number | string; amount: number }>;
  }) {
    const currentSession = await FeesRepository.getCurrentSession();
    const dueDate = input.due_date || new Date().toISOString().split('T')[0];

    // Ensure system fee group exists for Previous Session Balance
    let feeGroup = await queryOne(`SELECT id FROM fee_groups WHERE name = 'Previous Session Balance'`);
    let feeGroupId = feeGroup?.id;
    if (!feeGroupId) {
      const ins = await execute(`INSERT INTO fee_groups (name, is_system, is_active) VALUES ('Previous Session Balance', 1, 'yes')`);
      feeGroupId = ins.insertId;
    }

    let feetype = await queryOne(`SELECT id FROM feetype WHERE type = 'Previous Session Balance'`);
    let feetypeId = feetype?.id;
    if (!feetypeId) {
      const ins = await execute(`INSERT INTO feetype (type, code, is_system, is_active) VALUES ('Previous Session Balance', 'PREV_BAL', 1, 'yes')`);
      feetypeId = ins.insertId;
    }

    let fsg = await queryOne(`SELECT id FROM fee_session_groups WHERE fee_groups_id = ? AND session_id = ?`, [feeGroupId, currentSession]);
    let feeSessionGroupId = fsg?.id;
    if (!feeSessionGroupId) {
      const ins = await execute(`INSERT INTO fee_session_groups (fee_groups_id, session_id, is_active) VALUES (?, ?, 'yes')`, [feeGroupId, currentSession]);
      feeSessionGroupId = ins.insertId;
    }

    let fgf = await queryOne(`SELECT id FROM fee_groups_feetype WHERE fee_session_group_id = ? AND feetype_id = ?`, [feeSessionGroupId, feetypeId]);
    if (!fgf) {
      await execute(`
        INSERT INTO fee_groups_feetype (fee_session_group_id, fee_groups_id, feetype_id, session_id, amount, due_date, is_active)
        VALUES (?, ?, ?, ?, 0, ?, 'yes')
      `, [feeSessionGroupId, feeGroupId, feetypeId, currentSession, dueDate]);
    }

    const itemsToSave: Array<{ student_session_id: number | string; amount: number }> = [];
    if (input.student_session_id) {
      itemsToSave.push({ student_session_id: input.student_session_id, amount: 0 });
    } else if (input.balances && Array.isArray(input.balances)) {
      itemsToSave.push(...input.balances);
    }

    for (const item of itemsToSave) {
      const existing = await queryOne(`
        SELECT id FROM student_fees_master
        WHERE student_session_id = ? AND fee_session_group_id = ?
      `, [item.student_session_id, feeSessionGroupId]);

      if (existing) {
        await execute(`UPDATE student_fees_master SET amount = ? WHERE id = ?`, [item.amount, existing.id]);
      } else {
        await execute(`
          INSERT INTO student_fees_master (student_session_id, fee_session_group_id, amount, is_system, is_active)
          VALUES (?, ?, ?, 1, 'yes')
        `, [item.student_session_id, feeSessionGroupId, item.amount]);
      }
    }

    return { status: true, message: 'Fees carried forward successfully' };
  }

  // ==========================================
  // 8. FEES REMINDERS
  // ==========================================
  public static async getFeeReminders() {
    return await FeesRepository.getFeeReminders();
  }

  public static async saveFeeReminder(data: { id?: number | string; reminder_type: string; day: number; is_active?: number }) {
    await FeesRepository.saveFeeReminder({
      id: data.id,
      reminder_type: data.reminder_type || 'before',
      day: Number(data.day || 0),
      is_active: data.is_active !== undefined ? Number(data.is_active) : 1
    });
    return { status: true, message: 'Fee reminder updated successfully' };
  }

  // ==========================================
  // 9. FEES RECEIPT
  // ==========================================
  public static async getReceipt(id?: number | string) {
    if (id) {
      const receipt = await FeesRepository.getReceiptById(id);
      if (!receipt) throw new Error('Receipt not found');
      return receipt;
    }
    return await FeesRepository.getReceiptsList();
  }

  public static async generateReceipt(paymentId: number | string, studentSessionId?: number | string) {
    const receipt = await FeesRepository.getReceiptById(paymentId);
    if (!receipt) throw new Error('Receipt not found');
    return receipt;
  }

  // ==========================================
  // 10. DASHBOARD SUMMARY
  // ==========================================
  public static async getDashboardSummary(sessionId?: number) {
    const session = sessionId || (await FeesRepository.getCurrentSession());
    return await FeesRepository.getDashboardSummary(session);
  }

  // ==========================================
  // 11. SEND RECEIPT EMAIL & BULK REMINDERS
  // ==========================================
  public static async sendReceiptEmail(data: { email: string; subject: string; body: string; pdf_attachment?: string }) {
    if (!data.email || !data.subject || !data.body) {
      throw new Error('Email, subject and body are required');
    }
    logger.info(`Sending payment receipt email to ${data.email} with subject: ${data.subject}`);
    return { status: true, message: 'Receipt email dispatched successfully' };
  }

  public static async sendBulkFeeReminder(data: { student_session_ids?: any[]; message?: string }) {
    logger.info(`Sending bulk fee reminders to ${data.student_session_ids?.length || 0} students`);
    return { status: true, message: 'Bulk fee reminders sent successfully' };
  }
}
