import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { FinanceRepository } from './finance.repository';
import { StorageService } from '../../services/storage.service';

export class FinanceService {
  private static async saveUploadedFile(file: Express.Multer.File, subfolder: string): Promise<string> {
    const targetDir = path.join(env.STORAGE.BASE_PATH, subfolder);
    StorageService.ensureDir(targetDir);

    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    const filename = `${subfolder}_${Date.now()}${ext}`;
    const fullPath = path.join(targetDir, filename);

    if (file.buffer) {
      await fs.promises.writeFile(fullPath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      await fs.promises.copyFile(file.path, fullPath);
    }
    return `storage/${subfolder}/${filename}`;
  }
  // ==========================================
  // 1. INCOME HEADS
  // ==========================================
  public static async getIncomeHeads() {
    return await FinanceRepository.getIncomeHeads();
  }

  public static async getIncomeHeadById(id: number | string) {
    const row = await FinanceRepository.getIncomeHeadById(id);
    if (!row) throw new Error('Income head not found');
    return row;
  }

  public static async saveIncomeHead(data: { id?: number | string; income_category?: string; incomehead?: string; name?: string; description?: string }) {
    const category = data.income_category || data.incomehead || data.name;
    if (!category || !category.trim()) {
      throw new Error('Income Head name is required');
    }

    if (data.id) {
      await FinanceRepository.updateIncomeHead(data.id, {
        income_category: category.trim(),
        description: data.description || ''
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FinanceRepository.createIncomeHead({
        income_category: category.trim(),
        description: data.description || ''
      });
      return { id: newId };
    }
  }

  public static async deleteIncomeHead(id: number | string) {
    await FinanceRepository.deleteIncomeHead(id);
    return { id };
  }

  // ==========================================
  // 2. INCOME TRANSACTIONS
  // ==========================================
  public static async getIncomeList(filters: { startDate?: string; endDate?: string; headId?: number | string } = {}) {
    return await FinanceRepository.getIncomeList(filters);
  }

  public static async getIncomeById(id: number | string) {
    const row = await FinanceRepository.getIncomeById(id);
    if (!row) throw new Error('Income record not found');
    return row;
  }

  public static async saveIncome(data: {
    id?: number | string;
    inc_head_id?: number | string;
    headId?: number | string;
    name: string;
    invoice_no?: string;
    date?: string;
    amount: number;
    note?: string;
    documents?: string;
    attachment_url?: string;
  }, file?: Express.Multer.File) {
    if (!data.name || data.amount === undefined || data.amount === null) {
      throw new Error('Name and Amount are required');
    }

    let docPath = data.documents || data.attachment_url || '';
    if (file) {
      docPath = await this.saveUploadedFile(file, 'school_income');
    } else if (data.documents && data.documents.startsWith('data:')) {
      docPath = (await StorageService.saveBase64File(data.documents, `inc_${Date.now()}`, 'school_income')) || '';
    }

    const headId = data.inc_head_id || data.headId || 1;
    const dateStr = data.date || new Date().toISOString().split('T')[0];

    if (data.id) {
      await FinanceRepository.updateIncome(data.id, {
        inc_head_id: headId,
        name: data.name,
        invoice_no: data.invoice_no,
        date: dateStr,
        amount: Number(data.amount),
        note: data.note,
        documents: docPath || undefined
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FinanceRepository.createIncome({
        inc_head_id: headId,
        name: data.name,
        invoice_no: data.invoice_no || `INV-${Date.now()}`,
        date: dateStr,
        amount: Number(data.amount),
        note: data.note,
        documents: docPath
      });
      return { id: newId };
    }
  }

  public static async deleteIncome(id: number | string) {
    await FinanceRepository.deleteIncome(id);
    return { id };
  }

  // ==========================================
  // 3. EXPENSE HEADS
  // ==========================================
  public static async getExpenseHeads() {
    return await FinanceRepository.getExpenseHeads();
  }

  public static async getExpenseHeadById(id: number | string) {
    const row = await FinanceRepository.getExpenseHeadById(id);
    if (!row) throw new Error('Expense head not found');
    return row;
  }

  public static async saveExpenseHead(data: { id?: number | string; exp_category?: string; exphead?: string; name?: string; description?: string }) {
    const category = data.exp_category || data.exphead || data.name;
    if (!category || !category.trim()) {
      throw new Error('Expense Head name is required');
    }

    if (data.id) {
      await FinanceRepository.updateExpenseHead(data.id, {
        exp_category: category.trim(),
        description: data.description || ''
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FinanceRepository.createExpenseHead({
        exp_category: category.trim(),
        description: data.description || ''
      });
      return { id: newId };
    }
  }

  public static async deleteExpenseHead(id: number | string) {
    await FinanceRepository.deleteExpenseHead(id);
    return { id };
  }

  // ==========================================
  // 4. EXPENSE TRANSACTIONS
  // ==========================================
  public static async getExpenseList(filters: { startDate?: string; endDate?: string; headId?: number | string } = {}) {
    return await FinanceRepository.getExpenseList(filters);
  }

  public static async getExpenseById(id: number | string) {
    const row = await FinanceRepository.getExpenseById(id);
    if (!row) throw new Error('Expense record not found');
    return row;
  }

  public static async saveExpense(data: {
    id?: number | string;
    exp_head_id?: number | string;
    headId?: number | string;
    name: string;
    invoice_no?: string;
    date?: string;
    amount: number;
    note?: string;
    documents?: string;
    attachment_url?: string;
  }, file?: Express.Multer.File) {
    if (!data.name || data.amount === undefined || data.amount === null) {
      throw new Error('Name and Amount are required');
    }

    let docPath = data.documents || data.attachment_url || '';
    if (file) {
      docPath = await this.saveUploadedFile(file, 'school_expense');
    } else if (data.documents && data.documents.startsWith('data:')) {
      docPath = (await StorageService.saveBase64File(data.documents, `exp_${Date.now()}`, 'school_expense')) || '';
    }

    const headId = data.exp_head_id || data.headId || 1;
    const dateStr = data.date || new Date().toISOString().split('T')[0];

    if (data.id) {
      await FinanceRepository.updateExpense(data.id, {
        exp_head_id: headId,
        name: data.name,
        invoice_no: data.invoice_no,
        date: dateStr,
        amount: Number(data.amount),
        note: data.note,
        documents: docPath || undefined
      });
      return { id: Number(data.id) };
    } else {
      const newId = await FinanceRepository.createExpense({
        exp_head_id: headId,
        name: data.name,
        invoice_no: data.invoice_no || `EXP-${Date.now()}`,
        date: dateStr,
        amount: Number(data.amount),
        note: data.note,
        documents: docPath
      });
      return { id: newId };
    }
  }

  public static async deleteExpense(id: number | string) {
    await FinanceRepository.deleteExpense(id);
    return { id };
  }
}
