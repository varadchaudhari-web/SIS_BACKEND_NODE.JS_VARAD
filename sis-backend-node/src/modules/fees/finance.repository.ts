import { query, queryOne, execute } from '../../config/database';

export class FinanceRepository {
  // ==========================================
  // 1. INCOME HEADS
  // ==========================================
  public static async getIncomeHeads() {
    return await query(`
      SELECT * FROM income_head
      WHERE is_deleted = 'no' OR is_deleted IS NULL
      ORDER BY income_category ASC
    `);
  }

  public static async getIncomeHeadById(id: number | string) {
    return await queryOne(`SELECT * FROM income_head WHERE id = ?`, [id]);
  }

  public static async createIncomeHead(data: { income_category: string; description?: string }): Promise<number> {
    const result = await execute(`
      INSERT INTO income_head (income_category, description, is_active, is_deleted)
      VALUES (?, ?, 'yes', 'no')
    `, [data.income_category, data.description || '']);
    return result.insertId;
  }

  public static async updateIncomeHead(id: number | string, data: { income_category: string; description?: string }): Promise<void> {
    await execute(`
      UPDATE income_head
      SET income_category = ?, description = ?
      WHERE id = ?
    `, [data.income_category, data.description || '', id]);
  }

  public static async deleteIncomeHead(id: number | string): Promise<void> {
    await execute(`DELETE FROM income_head WHERE id = ?`, [id]);
  }

  // ==========================================
  // 2. INCOME TRANSACTIONS
  // ==========================================
  public static async getIncomeList(filters: { startDate?: string; endDate?: string; headId?: number | string } = {}) {
    let sql = `
      SELECT i.*, ih.income_category, ih.income_category as head_name
      FROM income i
      LEFT JOIN income_head ih ON ih.id = i.inc_head_id
      WHERE (i.is_deleted = 'no' OR i.is_deleted IS NULL)
    `;
    const params: any[] = [];

    if (filters.startDate && filters.endDate) {
      sql += ` AND i.date BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }
    if (filters.headId && filters.headId !== 'all') {
      sql += ` AND i.inc_head_id = ?`;
      params.push(filters.headId);
    }

    sql += ` ORDER BY i.date DESC, i.id DESC`;
    return await query(sql, params);
  }

  public static async getIncomeById(id: number | string) {
    return await queryOne(`
      SELECT i.*, ih.income_category, ih.income_category as head_name
      FROM income i
      LEFT JOIN income_head ih ON ih.id = i.inc_head_id
      WHERE i.id = ?
    `, [id]);
  }

  public static async createIncome(data: {
    inc_head_id: number | string;
    name: string;
    invoice_no?: string;
    date: string;
    amount: number;
    note?: string;
    documents?: string;
  }): Promise<number> {
    const result = await execute(`
      INSERT INTO income (inc_head_id, name, invoice_no, date, amount, note, documents, is_active, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'yes', 'no')
    `, [
      data.inc_head_id,
      data.name,
      data.invoice_no || `INV-${Date.now()}`,
      data.date,
      data.amount,
      data.note || '',
      data.documents || ''
    ]);
    return result.insertId;
  }

  public static async updateIncome(id: number | string, data: {
    inc_head_id?: number | string;
    name?: string;
    invoice_no?: string;
    date?: string;
    amount?: number;
    note?: string;
    documents?: string;
  }): Promise<void> {
    await execute(`
      UPDATE income
      SET inc_head_id = COALESCE(?, inc_head_id),
          name = COALESCE(?, name),
          invoice_no = COALESCE(?, invoice_no),
          date = COALESCE(?, date),
          amount = COALESCE(?, amount),
          note = COALESCE(?, note),
          documents = COALESCE(?, documents)
      WHERE id = ?
    `, [
      data.inc_head_id,
      data.name,
      data.invoice_no,
      data.date,
      data.amount,
      data.note,
      data.documents,
      id
    ]);
  }

  public static async deleteIncome(id: number | string): Promise<void> {
    await execute(`DELETE FROM income WHERE id = ?`, [id]);
  }

  // ==========================================
  // 3. EXPENSE HEADS
  // ==========================================
  public static async getExpenseHeads() {
    return await query(`
      SELECT * FROM expense_head
      WHERE is_deleted = 'no' OR is_deleted IS NULL
      ORDER BY exp_category ASC
    `);
  }

  public static async getExpenseHeadById(id: number | string) {
    return await queryOne(`SELECT * FROM expense_head WHERE id = ?`, [id]);
  }

  public static async createExpenseHead(data: { exp_category: string; description?: string }): Promise<number> {
    const result = await execute(`
      INSERT INTO expense_head (exp_category, description, is_active, is_deleted)
      VALUES (?, ?, 'yes', 'no')
    `, [data.exp_category, data.description || '']);
    return result.insertId;
  }

  public static async updateExpenseHead(id: number | string, data: { exp_category: string; description?: string }): Promise<void> {
    await execute(`
      UPDATE expense_head
      SET exp_category = ?, description = ?
      WHERE id = ?
    `, [data.exp_category, data.description || '', id]);
  }

  public static async deleteExpenseHead(id: number | string): Promise<void> {
    await execute(`DELETE FROM expense_head WHERE id = ?`, [id]);
  }

  // ==========================================
  // 4. EXPENSE TRANSACTIONS
  // ==========================================
  public static async getExpenseList(filters: { startDate?: string; endDate?: string; headId?: number | string } = {}) {
    let sql = `
      SELECT e.*, eh.exp_category, eh.exp_category as head_name
      FROM expenses e
      LEFT JOIN expense_head eh ON eh.id = e.exp_head_id
      WHERE (e.is_deleted = 'no' OR e.is_deleted IS NULL)
    `;
    const params: any[] = [];

    if (filters.startDate && filters.endDate) {
      sql += ` AND e.date BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }
    if (filters.headId && filters.headId !== 'all') {
      sql += ` AND e.exp_head_id = ?`;
      params.push(filters.headId);
    }

    sql += ` ORDER BY e.date DESC, e.id DESC`;
    return await query(sql, params);
  }

  public static async getExpenseById(id: number | string) {
    return await queryOne(`
      SELECT e.*, eh.exp_category, eh.exp_category as head_name
      FROM expenses e
      LEFT JOIN expense_head eh ON eh.id = e.exp_head_id
      WHERE e.id = ?
    `, [id]);
  }

  public static async createExpense(data: {
    exp_head_id: number | string;
    name: string;
    invoice_no?: string;
    date: string;
    amount: number;
    note?: string;
    documents?: string;
  }): Promise<number> {
    const result = await execute(`
      INSERT INTO expenses (exp_head_id, name, invoice_no, date, amount, note, documents, is_active, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'yes', 'no')
    `, [
      data.exp_head_id,
      data.name,
      data.invoice_no || `EXP-${Date.now()}`,
      data.date,
      data.amount,
      data.note || '',
      data.documents || ''
    ]);
    return result.insertId;
  }

  public static async updateExpense(id: number | string, data: {
    exp_head_id?: number | string;
    name?: string;
    invoice_no?: string;
    date?: string;
    amount?: number;
    note?: string;
    documents?: string;
  }): Promise<void> {
    await execute(`
      UPDATE expenses
      SET exp_head_id = COALESCE(?, exp_head_id),
          name = COALESCE(?, name),
          invoice_no = COALESCE(?, invoice_no),
          date = COALESCE(?, date),
          amount = COALESCE(?, amount),
          note = COALESCE(?, note),
          documents = COALESCE(?, documents)
      WHERE id = ?
    `, [
      data.exp_head_id,
      data.name,
      data.invoice_no,
      data.date,
      data.amount,
      data.note,
      data.documents,
      id
    ]);
  }

  public static async deleteExpense(id: number | string): Promise<void> {
    await execute(`DELETE FROM expenses WHERE id = ?`, [id]);
  }
}
