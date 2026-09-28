import { Request, Response } from 'express';
import { FeesService } from './fees.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class FeesController {
  // ==========================================
  // 1. FEES GROUPS
  // ==========================================
  public static async feeGroups(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        const data = await FeesService.getFeeGroups(id as string);
        if (id && !data) {
          return sendError(res, 'Record not found', 404);
        }
        return sendSuccess(res, data || []);
      }

      if (method === 'POST') {
        const result = await FeesService.saveFeeGroup(req.body);
        return sendSuccess(res, result, 'Fees group saved successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.saveFeeGroup({ ...req.body, id });
        return sendSuccess(res, result, 'Fees group updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.deleteFeeGroup(id as string);
        return sendSuccess(res, result, 'Fees group deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feeGroups controller:', error);
      return sendError(res, error.message || 'Failed to process fee group request', 400);
    }
  }

  // ==========================================
  // 2. FEES TYPE
  // ==========================================
  public static async feeTypes(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        const data = await FeesService.getFeeTypes(id as string);
        if (id && !data) {
          return sendError(res, 'Record not found', 404);
        }
        return sendSuccess(res, data || []);
      }

      if (method === 'POST') {
        const result = await FeesService.saveFeeType(req.body);
        return sendSuccess(res, result, 'Fees type saved successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.saveFeeType({ ...req.body, id });
        return sendSuccess(res, result, 'Fees type updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.deleteFeeType(id as string);
        return sendSuccess(res, result, 'Fees type deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feeTypes controller:', error);
      return sendError(res, error.message || 'Failed to process fee type request', 400);
    }
  }

  // ==========================================
  // 3. FEES MASTER
  // ==========================================
  public static async feeMasters(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        const data = await FeesService.getFeesMaster(id as string);
        if (id && !data) {
          return sendError(res, 'Record not found', 404);
        }
        return sendSuccess(res, data || []);
      }

      if (method === 'POST') {
        const result = await FeesService.saveFeeMaster(req.body);
        return sendSuccess(res, result, 'Fee Master created successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.saveFeeMaster({ ...req.body, id });
        return sendSuccess(res, result, 'Fees master updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.deleteFeeMaster(id as string);
        return sendSuccess(res, result, 'Fees master deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feeMasters controller:', error);
      return sendError(res, error.message || 'Failed to process fee master request', 400);
    }
  }

  // ==========================================
  // 4. COLLECT FEES
  // ==========================================
  public static async collectFees(req: Request, res: Response) {
    const method = req.method;

    try {
      if (method === 'GET') {
        const studentSessionId = req.query.student_session_id as string;
        const startDate = req.query.start_date as string;
        const endDate = req.query.end_date as string;
        const receivedBy = req.query.received_by as string;

        const data = await FeesService.getCollectFeesData(studentSessionId, startDate, endDate, receivedBy);
        return sendSuccess(res, data);
      }

      if (method === 'POST') {
        const result = await FeesService.depositFee(req.body);
        return sendSuccess(res, result, 'Fee collected successfully', 201);
      }

      if (method === 'DELETE') {
        const id = req.params.id || req.body.id || req.query.id;
        const invNo = req.params.inv_no || req.body.inv_no || req.query.inv_no;
        if (!id) return sendError(res, 'Deposit ID is required', 400);

        const result = await FeesService.deleteDeposit(id as string, invNo as string);
        return sendSuccess(res, result, 'Payment reversed successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in collectFees controller:', error);
      return sendError(res, error.message || 'Failed to process fee collection', 400);
    }
  }

  // ==========================================
  // 5. SEARCH FEES PAYMENT & DUE FEES
  // ==========================================
  public static async searchFeesPayment(req: Request, res: Response) {
    try {
      const paymentId = (req.query.paymentid || req.query.payment_id) as string;
      const studentId = (req.query.student_id || req.query.studentid) as string;

      const data = await FeesService.searchFeesPayment(paymentId, studentId);
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Error in searchFeesPayment controller:', error);
      return sendError(res, error.message || 'Failed to search fee payments', 500);
    }
  }

  public static async searchDueFees(req: Request, res: Response) {
    try {
      const classId = (req.query.class_id || req.query.class) as string;
      const sectionId = (req.query.section_id || req.query.section) as string;
      const feeGroupId = (req.query.feegroup_id || req.query.fee_group_id) as string;

      const data = await FeesService.searchDueFees(classId, sectionId, feeGroupId);
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Error in searchDueFees controller:', error);
      return sendError(res, error.message || 'Failed to search due fees', 500);
    }
  }

  // ==========================================
  // 6. FEE DISCOUNTS & ASSIGNMENT
  // ==========================================
  public static async feeDiscounts(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;

    try {
      if (method === 'GET') {
        const data = await FeesService.getFeeDiscounts(id as string);
        if (id && !data) return sendError(res, 'Record not found', 404);
        return sendSuccess(res, data || []);
      }

      if (method === 'POST') {
        const result = await FeesService.saveFeeDiscount(req.body);
        return sendSuccess(res, result, 'Fee discount created successfully', 201);
      }

      if (method === 'PUT') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.saveFeeDiscount({ ...req.body, id });
        return sendSuccess(res, result, 'Fee discount updated successfully');
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'ID is required', 400);
        const result = await FeesService.deleteFeeDiscount(id as string);
        return sendSuccess(res, result, 'Fee discount deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feeDiscounts controller:', error);
      return sendError(res, error.message || 'Failed to process fee discount', 400);
    }
  }

  public static async feeDiscountAssign(req: Request, res: Response) {
    const method = req.method;

    try {
      if (method === 'GET') {
        const classId = req.query.class_id as string;
        const sectionId = req.query.section_id as string;
        const discountId = req.query.fees_discount_id as string;

        if (!discountId) return sendError(res, 'fees_discount_id is required', 400);

        const data = await FeesService.searchAssignDiscountStudents(classId, sectionId, discountId);
        return sendSuccess(res, data);
      }

      if (method === 'POST') {
        const { fees_discount_id, student_session_ids, all_student_session_ids } = req.body;
        if (!fees_discount_id || !student_session_ids) {
          return sendError(res, 'fees_discount_id and student_session_ids are required', 400);
        }

        const result = await FeesService.assignDiscount(fees_discount_id, student_session_ids, all_student_session_ids || []);
        return sendSuccess(res, result, 'Discounts assigned successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feeDiscountAssign controller:', error);
      return sendError(res, error.message || 'Failed to assign discount', 400);
    }
  }

  // ==========================================
  // 7. CARRY FORWARD
  // ==========================================
  public static async feesCarryForward(req: Request, res: Response) {
    const method = req.method;

    try {
      if (method === 'GET') {
        const classId = req.query.class_id as string;
        const sectionId = req.query.section_id as string;
        const data = await FeesService.getCarryForward(classId, sectionId);
        return sendSuccess(res, data);
      }

      if (method === 'POST') {
        const result = await FeesService.saveCarryForward(req.body);
        return sendSuccess(res, result, 'Fees carried forward successfully', 201);
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feesCarryForward controller:', error);
      return sendError(res, error.message || 'Failed to carry forward fees', 400);
    }
  }

  // ==========================================
  // 8. FEES REMINDERS & BULK ALERTS
  // ==========================================
  public static async feesReminder(req: Request, res: Response) {
    const method = req.method;

    try {
      if (method === 'GET') {
        const data = await FeesService.getFeeReminders();
        return sendSuccess(res, data);
      }

      if (method === 'POST' || method === 'PUT') {
        const result = await FeesService.saveFeeReminder(req.body);
        return sendSuccess(res, result, 'Fee reminder saved successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feesReminder controller:', error);
      return sendError(res, error.message || 'Failed to process fee reminder', 400);
    }
  }

  public static async sendBulkFeeReminder(req: Request, res: Response) {
    try {
      const result = await FeesService.sendBulkFeeReminder(req.body);
      return sendSuccess(res, result, 'Bulk fee reminders sent successfully');
    } catch (error: any) {
      logger.error('Error in sendBulkFeeReminder controller:', error);
      return sendError(res, error.message || 'Failed to send bulk reminders', 400);
    }
  }

  // ==========================================
  // 9. FEES RECEIPT & EMAIL
  // ==========================================
  public static async feesReceipt(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id;
    const invNoParam = req.params.inv_no;

    try {
      if (method === 'GET') {
        const data = await FeesService.getReceipt(id as string);
        return sendSuccess(res, data);
      }

      if (method === 'POST') {
        const paymentId = req.body.payment_id || id;
        if (!paymentId) return sendError(res, 'payment_id is required', 400);

        const data = await FeesService.generateReceipt(paymentId, req.body.student_session_id);
        return sendSuccess(res, data, 'Receipt generated successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Payment ID is required', 400);
        let realId: any = id;
        let invNo: any = invNoParam || req.query.inv_no;

        if (typeof realId === 'string' && realId.includes('/')) {
          const parts = realId.split('/');
          realId = parts[0];
          invNo = parts[1];
        }

        const result = await FeesService.deleteDeposit(realId, invNo);
        return sendSuccess(res, result, 'Payment reversed successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error: any) {
      logger.error('Error in feesReceipt controller:', error);
      return sendError(res, error.message || 'Failed to process receipt', 400);
    }
  }

  public static async sendReceiptEmail(req: Request, res: Response) {
    try {
      const result = await FeesService.sendReceiptEmail(req.body);
      return sendSuccess(res, result, 'Receipt email dispatched successfully');
    } catch (error: any) {
      logger.error('Error in sendReceiptEmail controller:', error);
      return sendError(res, error.message || 'Failed to dispatch receipt email', 400);
    }
  }

  // ==========================================
  // 10. DASHBOARD SUMMARY
  // ==========================================
  public static async dashboardSummary(req: Request, res: Response) {
    try {
      const data = await FeesService.getDashboardSummary();
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Error in dashboardSummary controller:', error);
      return sendError(res, error.message || 'Failed to fetch dashboard summary', 500);
    }
  }
}
