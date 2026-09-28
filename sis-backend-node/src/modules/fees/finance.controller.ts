import { Request, Response } from 'express';
import { FinanceService } from './finance.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class FinanceController {
  // ==========================================
  // 1. INCOME TRANSACTIONS
  // ==========================================
  public static async income(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        if (id) {
          const item = await FinanceService.getIncomeById(id as string);
          return sendSuccess(res, item);
        }
        const startDate = req.query.start_date as string;
        const endDate = req.query.end_date as string;
        const headId = req.query.inc_head_id as string;
        const items = await FinanceService.getIncomeList({ startDate, endDate, headId });
        return sendSuccess(res, items);
      }

      if (method === 'POST') {
        const result = await FinanceService.saveIncome(req.body, req.file);
        return sendSuccess(res, result, 'Income recorded successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FinanceService.saveIncome({ ...req.body, id }, req.file);
        return sendSuccess(res, result, 'Income updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Income ID is required', 400);
        const result = await FinanceService.deleteIncome(id as string);
        return sendSuccess(res, result, 'Income deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in income controller:', error);
      return sendError(res, error.message || 'Failed to process income request', 400);
    }
  }

  public static async searchIncome(req: Request, res: Response) {
    try {
      const { start_date, end_date, inc_head_id } = req.body;
      const items = await FinanceService.getIncomeList({
        startDate: start_date,
        endDate: end_date,
        headId: inc_head_id
      });
      return sendSuccess(res, items);
    } catch (error: any) {
      logger.error('Error in searchIncome controller:', error);
      return sendError(res, error.message || 'Failed to search income', 500);
    }
  }

  // ==========================================
  // 2. INCOME HEADS
  // ==========================================
  public static async incomeHeads(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        if (id) {
          const item = await FinanceService.getIncomeHeadById(id as string);
          return sendSuccess(res, item);
        }
        const heads = await FinanceService.getIncomeHeads();
        return sendSuccess(res, heads);
      }

      if (method === 'POST') {
        const result = await FinanceService.saveIncomeHead(req.body);
        return sendSuccess(res, result, 'Income head created successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FinanceService.saveIncomeHead({ ...req.body, id });
        return sendSuccess(res, result, 'Income head updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FinanceService.deleteIncomeHead(id as string);
        return sendSuccess(res, result, 'Income head deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in incomeHeads controller:', error);
      return sendError(res, error.message || 'Failed to process income head', 400);
    }
  }

  // ==========================================
  // 3. EXPENSE TRANSACTIONS
  // ==========================================
  public static async expense(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        if (id) {
          const item = await FinanceService.getExpenseById(id as string);
          return sendSuccess(res, item);
        }
        const startDate = req.query.start_date as string;
        const endDate = req.query.end_date as string;
        const headId = req.query.exp_head_id as string;
        const items = await FinanceService.getExpenseList({ startDate, endDate, headId });
        return sendSuccess(res, items);
      }

      if (method === 'POST') {
        const result = await FinanceService.saveExpense(req.body, req.file);
        return sendSuccess(res, result, 'Expense recorded successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FinanceService.saveExpense({ ...req.body, id }, req.file);
        return sendSuccess(res, result, 'Expense updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Expense ID is required', 400);
        const result = await FinanceService.deleteExpense(id as string);
        return sendSuccess(res, result, 'Expense deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in expense controller:', error);
      return sendError(res, error.message || 'Failed to process expense request', 400);
    }
  }

  public static async searchExpense(req: Request, res: Response) {
    try {
      const { start_date, end_date, exp_head_id } = req.body;
      const items = await FinanceService.getExpenseList({
        startDate: start_date,
        endDate: end_date,
        headId: exp_head_id
      });
      return sendSuccess(res, items);
    } catch (error: any) {
      logger.error('Error in searchExpense controller:', error);
      return sendError(res, error.message || 'Failed to search expenses', 500);
    }
  }

  // ==========================================
  // 4. EXPENSE HEADS
  // ==========================================
  public static async expenseHeads(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        if (id) {
          const item = await FinanceService.getExpenseHeadById(id as string);
          return sendSuccess(res, item);
        }
        const heads = await FinanceService.getExpenseHeads();
        return sendSuccess(res, heads);
      }

      if (method === 'POST') {
        const result = await FinanceService.saveExpenseHead(req.body);
        return sendSuccess(res, result, 'Expense head created successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FinanceService.saveExpenseHead({ ...req.body, id });
        return sendSuccess(res, result, 'Expense head updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FinanceService.deleteExpenseHead(id as string);
        return sendSuccess(res, result, 'Expense head deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in expenseHeads controller:', error);
      return sendError(res, error.message || 'Failed to process expense head', 400);
    }
  }
}
