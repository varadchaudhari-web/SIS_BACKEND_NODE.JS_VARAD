import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { HRService } from './hr.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class HRController {
  /**
   * GET /HumanResource/download_document
   */
  public static async downloadDocument(req: Request, res: Response) {
    try {
      const file = req.query.file as string;
      const folder = (req.query.folder as string) || 'staff_documents';
      const staffId = req.query.staff_id as string;
      const docPrefix = req.query.doc_prefix as string;

      if (!file) {
        return sendError(res, 'File parameter required', 400);
      }

      const cleanFile = path.basename(file);
      const cleanFolder = path.basename(folder);

      const candidateDirs = [
        path.join(env.STORAGE.BASE_PATH, 'private', cleanFolder),
        path.join(env.STORAGE.BASE_PATH, cleanFolder),
        path.join(env.STORAGE.LEGACY_UPLOADS, cleanFolder),
        env.STORAGE.LEGACY_UPLOADS,
      ];

      let foundPath: string | null = null;

      for (const baseDir of candidateDirs) {
        if (!fs.existsSync(baseDir)) continue;

        const direct = path.join(baseDir, cleanFile);
        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
          foundPath = direct;
          break;
        }

        if (staffId) {
          const staffSub = path.join(baseDir, path.basename(staffId), cleanFile);
          if (fs.existsSync(staffSub) && fs.statSync(staffSub).isFile()) {
            foundPath = staffSub;
            break;
          }
        }

        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subFile = path.join(baseDir, entry.name, cleanFile);
            if (fs.existsSync(subFile) && fs.statSync(subFile).isFile()) {
              foundPath = subFile;
              break;
            }

            if (docPrefix) {
              const subEntries = fs.readdirSync(path.join(baseDir, entry.name));
              const match = subEntries.find((f) => f.toLowerCase().includes(docPrefix.toLowerCase()));
              if (match) {
                foundPath = path.join(baseDir, entry.name, match);
                break;
              }
            }
          }
        }

        if (foundPath) break;
      }

      if (!foundPath) {
        return sendError(res, 'File not found', 404);
      }

      return res.sendFile(foundPath);
    } catch (error) {
      logger.error('Error downloading document:', error);
      return sendError(res, 'Error processing file download', 500);
    }
  }

  // ==========================================
  // STAFF CRUD
  // ==========================================
  public static async getStaffList(req: Request, res: Response) {
    try {
      const filters = {
        role_id: (req.query.role_id || req.query.role) as string,
        department_id: (req.query.department_id || req.query.department) as string,
        designation_id: (req.query.designation_id || req.query.designation) as string,
        search: (req.query.search || req.query.q) as string,
        is_active: req.query.is_active !== undefined ? Number(req.query.is_active) : 1,
      };
      const rows = await HRService.getStaffList(filters);
      return sendSuccess(res, rows);
    } catch (error: any) {
      logger.error('Error fetching staff list:', error);
      return sendError(res, error.message || 'Failed to fetch staff list', 500);
    }
  }

  public static async getStaffById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const staff = await HRService.getStaffById(id);
      return sendSuccess(res, staff);
    } catch (error: any) {
      return sendError(res, error.message || 'Staff member not found', 404);
    }
  }

  public static async getDisabledStaff(req: Request, res: Response) {
    try {
      const rows = await HRService.getDisabledStaff();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch disabled staff', 500);
    }
  }

  public static async getNextStaffId(req: Request, res: Response) {
    try {
      const nextInfo = await HRService.getNextStaffId();
      return res.status(200).json({
        status: true,
        ...nextInfo,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate next staff ID', 500);
    }
  }

  public static async saveStaff(req: Request, res: Response) {
    try {
      const payload = { ...req.body };
      const result = await HRService.saveStaff(payload);
      return sendSuccess(res, result, 'Staff member saved successfully', 200);
    } catch (error: any) {
      logger.error('Error saving staff:', error);
      return sendError(res, error.message || 'Failed to save staff record', 400);
    }
  }

  public static async disableStaff(req: Request, res: Response) {
    try {
      const { id, date } = req.body;
      if (!id) {
        return sendError(res, 'Staff ID is required', 400);
      }
      const result = await HRService.disableStaff(id, date);
      return sendSuccess(res, result, 'Staff disabled successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to disable staff', 500);
    }
  }

  public static async enableStaff(req: Request, res: Response) {
    try {
      const { id } = req.body;
      if (!id) {
        return sendError(res, 'Staff ID is required', 400);
      }
      const result = await HRService.enableStaff(id);
      return sendSuccess(res, result, 'Staff enabled successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to enable staff', 500);
    }
  }

  public static async deleteStaff(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await HRService.deleteStaff(id);
      return sendSuccess(res, result, 'Staff deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete staff', 500);
    }
  }

  public static async changePassword(req: Request, res: Response) {
    try {
      const staffId = (req.params.id || req.body.staff_id) as string;
      const newPass = req.body.new_pass || req.body.password;
      if (!staffId) {
        return sendError(res, 'Staff ID is required', 400);
      }
      const result = await HRService.changePassword(staffId, newPass);
      return sendSuccess(res, result, 'Password changed successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update password', 400);
    }
  }

  public static async uploadStaffPhoto(req: Request, res: Response) {
    try {
      const staffId = (req.body.staff_id || req.params.id) as string;
      const file = req.file || req.body.file;
      if (!staffId || !file) {
        return sendError(res, 'Staff ID and file required', 400);
      }
      const result = await HRService.uploadStaffPhoto(staffId, file);
      return sendSuccess(res, result, 'Profile photo uploaded successfully');
    } catch (error: any) {
      logger.error('Error uploading photo:', error);
      return sendError(res, error.message || 'Failed to upload photo', 500);
    }
  }

  public static async uploadDocument(req: Request, res: Response) {
    try {
      const staffId = req.body.staff_id;
      const docType = req.body.doc_type || 'other';
      const otherDocName = req.body.other_document_name;
      const file = req.file || req.body.document || req.body.file;
      if (!staffId || !file) {
        return sendError(res, 'Staff ID and document required', 400);
      }
      const result = await HRService.uploadStaffDocument(staffId, docType, file, otherDocName);
      return sendSuccess(res, result, 'Document uploaded successfully');
    } catch (error: any) {
      logger.error('Error uploading document:', error);
      return sendError(res, error.message || 'Failed to upload document', 500);
    }
  }

  public static async deleteDocument(req: Request, res: Response) {
    try {
      const { staff_id, doc_type } = req.body;
      if (!staff_id || !doc_type) {
        return sendError(res, 'staff_id and doc_type required', 400);
      }
      const result = await HRService.deleteStaffDocument(staff_id, doc_type);
      return sendSuccess(res, result, 'Document deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete document', 500);
    }
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================
  public static async getAttendance(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const roleId = req.query.role_id as string;
      const staffId = req.query.staff_id as string;

      if (staffId && !req.query.date) {
        const history = await HRService.getStaffAttendanceHistory(staffId, req.query.year as string);
        return sendSuccess(res, history);
      }

      const rows = await HRService.getAttendance(date, roleId, staffId);
      return sendSuccess(res, rows);
    } catch (error: any) {
      logger.error('Error fetching staff attendance:', error);
      return sendError(res, error.message || 'Failed to fetch staff attendance', 500);
    }
  }

  public static async saveAttendance(req: Request, res: Response) {
    try {
      const { date, records } = req.body;
      const result = await HRService.saveAttendance(date, records);
      return sendSuccess(res, result, 'Attendance saved successfully');
    } catch (error: any) {
      logger.error('Error saving staff attendance:', error);
      return sendError(res, error.message || 'Failed to save staff attendance', 400);
    }
  }

  public static async getAttendanceTypes(req: Request, res: Response) {
    try {
      const rows = await HRService.getAttendanceTypes();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch attendance types', 500);
    }
  }

  // ==========================================
  // PAYROLL
  // ==========================================
  public static async getPayroll(req: Request, res: Response) {
    try {
      const month = req.query.month as string;
      const year = req.query.year as string;
      const role = req.query.role as string;
      const rows = await HRService.getPayroll(month, year, role);
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch payroll', 500);
    }
  }

  public static async createPayroll(req: Request, res: Response) {
    try {
      const result = await HRService.createPayroll(req.body);
      return sendSuccess(res, result, 'Payroll generated successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate payroll', 400);
    }
  }

  public static async payPayroll(req: Request, res: Response) {
    try {
      const result = await HRService.payPayroll(req.body);
      return sendSuccess(res, result, 'Payroll marked as paid');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to process payroll payment', 400);
    }
  }

  public static async deletePayroll(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await HRService.deletePayroll(id);
      return sendSuccess(res, result, 'Payroll deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete payroll', 500);
    }
  }

  // ==========================================
  // LEAVES
  // ==========================================
  public static async getLeaves(req: Request, res: Response) {
    try {
      const staffId = req.query.staff_id as string;
      const rows = await HRService.getLeaves(staffId);
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leaves', 500);
    }
  }

  public static async saveLeave(req: Request, res: Response) {
    try {
      const result = await HRService.saveLeave(req.body);
      return sendSuccess(res, result, 'Leave request submitted successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit leave', 400);
    }
  }

  public static async deleteLeave(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await HRService.deleteLeave(id);
      return sendSuccess(res, result, 'Leave request deleted');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete leave', 500);
    }
  }

  public static async updateLeaveStatus(req: Request, res: Response) {
    try {
      const { leave_request_id, status, detailremark } = req.body;
      const result = await HRService.updateLeaveStatus(leave_request_id, status, detailremark);
      return sendSuccess(res, result, 'Leave status updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update leave status', 400);
    }
  }

  public static async getLeaveTypes(req: Request, res: Response) {
    try {
      const rows = await HRService.getLeaveTypes();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leave types', 500);
    }
  }

  public static async saveLeaveType(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id) as string | undefined;
      const type = req.body.type;
      const result = await HRService.saveLeaveType(id, type);
      return sendSuccess(res, result, 'Leave type saved successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to save leave type', 400);
    }
  }

  public static async deleteLeaveType(req: Request, res: Response) {
    try {
      const id = (req.params.id || req.body.id) as string;
      const result = await HRService.deleteLeaveType(id);
      return sendSuccess(res, result, 'Leave type deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete leave type', 500);
    }
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  public static async getDepartments(req: Request, res: Response) {
    try {
      const rows = await HRService.getDepartments();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch departments', 500);
    }
  }

  public static async saveDepartment(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id) as string | undefined;
      const name = req.body.type || req.body.department_name;
      const result = await HRService.saveDepartment(id, name);
      return sendSuccess(res, result, 'Department saved successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to save department', 400);
    }
  }

  public static async deleteDepartment(req: Request, res: Response) {
    try {
      const id = (req.params.id || req.body.id) as string;
      const result = await HRService.deleteDepartment(id);
      return sendSuccess(res, result, 'Department deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete department', 500);
    }
  }

  // ==========================================
  // DESIGNATIONS
  // ==========================================
  public static async getDesignations(req: Request, res: Response) {
    try {
      const rows = await HRService.getDesignations();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch designations', 500);
    }
  }

  public static async saveDesignation(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id) as string | undefined;
      const name = req.body.type || req.body.designation;
      const result = await HRService.saveDesignation(id, name);
      return sendSuccess(res, result, 'Designation saved successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to save designation', 400);
    }
  }

  public static async deleteDesignation(req: Request, res: Response) {
    try {
      const id = (req.params.id || req.body.id) as string;
      const result = await HRService.deleteDesignation(id);
      return sendSuccess(res, result, 'Designation deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete designation', 500);
    }
  }

  // ==========================================
  // ROLES
  // ==========================================
  public static async getRoles(req: Request, res: Response) {
    try {
      const rows = await HRService.getRoles();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch roles', 500);
    }
  }

  // ==========================================
  // RATINGS
  // ==========================================
  public static async getRatings(req: Request, res: Response) {
    try {
      const rows = await HRService.getRatings();
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch ratings', 500);
    }
  }

  public static async saveRating(req: Request, res: Response) {
    try {
      const result = await HRService.saveRating(req.body);
      return sendSuccess(res, result, 'Rating submitted successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit rating', 400);
    }
  }

  public static async approveRating(req: Request, res: Response) {
    try {
      const { id, approve } = req.body;
      const result = await HRService.approveRating(id, approve);
      return sendSuccess(res, result, 'Rating approval updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to approve rating', 400);
    }
  }

  public static async deleteRating(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await HRService.deleteRating(id);
      return sendSuccess(res, result, 'Rating deleted');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete rating', 500);
    }
  }

  // ==========================================
  // TIMELINE
  // ==========================================
  public static async getStaffTimeline(req: Request, res: Response) {
    try {
      const staffId = req.query.staff_id as string;
      const rows = await HRService.getTimeline(staffId);
      return sendSuccess(res, rows);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch timeline', 500);
    }
  }

  public static async addStaffTimeline(req: Request, res: Response) {
    try {
      const result = await HRService.addTimeline(req.body, req.file);
      return sendSuccess(res, result, 'Timeline entry added', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to add timeline entry', 400);
    }
  }

  public static async deleteStaffTimeline(req: Request, res: Response) {
    try {
      const id = (req.query.id || req.body.id) as string;
      const result = await HRService.deleteTimeline(id);
      return sendSuccess(res, result, 'Timeline entry deleted');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete timeline entry', 500);
    }
  }

  // ==========================================
  // EMAILS & PAYSLIP DISPATCH
  // ==========================================
  public static async sendCredentials(req: Request, res: Response) {
    try {
      const staffId = req.body.staff_id;
      if (!staffId) {
        return sendError(res, 'staff_id is required', 400);
      }
      const result = await HRService.sendCredentials(staffId);
      return sendSuccess(res, result, 'Credentials dispatched successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to send credentials', 400);
    }
  }

  public static async sendPayslip(req: Request, res: Response) {
    try {
      const { staff_id, month, year } = req.body;
      if (!staff_id) {
        return sendError(res, 'staff_id is required', 400);
      }
      const result = await HRService.sendPayslip(staff_id, month, year);
      return sendSuccess(res, result, 'Payslip statement sent successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to send payslip', 400);
    }
  }
}
