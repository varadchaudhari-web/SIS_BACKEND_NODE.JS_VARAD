import path from 'path';
import fs from 'fs';
import { HRRepository } from './hr.repository';
import { StorageService } from '../../services/storage.service';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export class HRService {
  /**
   * Get staff list with optional filters
   */
  public static async getStaffList(filters: {
    role_id?: string;
    department_id?: string;
    designation_id?: string;
    search?: string;
    is_active?: number;
  } = {}) {
    return await HRRepository.findStaff(filters);
  }

  /**
   * Get single staff profile
   */
  public static async getStaffById(id: number | string) {
    const staff = await HRRepository.findStaffById(id);
    if (!staff) {
      throw new Error('Staff member not found');
    }
    return staff;
  }

  /**
   * Get disabled staff
   */
  public static async getDisabledStaff() {
    return await HRRepository.findDisabledStaff();
  }

  /**
   * Generate next employee ID
   */
  public static async getNextStaffId() {
    const lastId = await HRRepository.getLastStaffId();
    const nextNum = lastId + 1;
    const prefix = 'EMP-';
    const digits = 4;
    return {
      auto_insert: true,
      next_id: `${prefix}${String(nextNum).padStart(digits, '0')}`,
      prefix,
      digits,
      start_from: nextNum,
    };
  }

  /**
   * Save staff (create or update)
   */
  public static async saveStaff(payload: any) {
    if (!payload.name) {
      throw new Error('Staff name is required');
    }

    // Check duplicate email
    if (payload.email) {
      const isDup = await HRRepository.isEmailDuplicate(payload.email, payload.id || 0);
      if (isDup) {
        throw new Error('Email already registered by another staff member');
      }
    }

    if (payload.id) {
      await HRRepository.updateStaff(payload.id, payload);
      return { id: payload.id };
    } else {
      if (!payload.employee_id) {
        const nextInfo = await this.getNextStaffId();
        payload.employee_id = nextInfo.next_id;
      }
      const newId = await HRRepository.createStaff(payload);
      return { id: newId };
    }
  }

  /**
   * Disable staff member
   */
  public static async disableStaff(id: number | string, date?: string) {
    const disableDate = date || new Date().toISOString().split('T')[0];
    await HRRepository.setStaffActiveStatus(id, 0, disableDate);
    return { id, is_active: 0, disable_at: disableDate };
  }

  /**
   * Enable staff member
   */
  public static async enableStaff(id: number | string) {
    await HRRepository.setStaffActiveStatus(id, 1, null);
    return { id, is_active: 1 };
  }

  /**
   * Delete staff member
   */
  public static async deleteStaff(id: number | string) {
    await HRRepository.deleteStaff(id);
    return { id };
  }

  /**
   * Change staff password
   */
  public static async changePassword(staffId: number | string, newPass: string) {
    if (!newPass || newPass.trim().length < 4) {
      throw new Error('Password must be at least 4 characters');
    }
    await HRRepository.updateStaffPassword(staffId, newPass);
    return { staff_id: staffId };
  }

  /**
   * Upload staff profile photo
   */
  public static async uploadStaffPhoto(staffId: number | string, file: Express.Multer.File | { base64: string } | any) {
    let savedRelPath: string | null = null;

    const targetDir = path.join(env.STORAGE.BASE_PATH, 'staff_images');
    StorageService.ensureDir(targetDir);

    if (file && file.buffer) {
      const ext = path.extname(file.originalname || '.jpg') || '.jpg';
      const filename = `staff_${staffId}_${Date.now()}${ext}`;
      const fullPath = path.join(targetDir, filename);
      await fs.promises.writeFile(fullPath, file.buffer);
      savedRelPath = `storage/staff_images/${filename}`;
    } else if (file && file.path && fs.existsSync(file.path)) {
      const ext = path.extname(file.originalname || file.path || '.jpg') || '.jpg';
      const filename = `staff_${staffId}_${Date.now()}${ext}`;
      const fullPath = path.join(targetDir, filename);
      await fs.promises.copyFile(file.path, fullPath);
      savedRelPath = `storage/staff_images/${filename}`;
    } else if (file && typeof file === 'string') {
      savedRelPath = await StorageService.saveBase64File(file, `staff_${staffId}`, 'staff_images');
    } else if (file && file.base64) {
      savedRelPath = await StorageService.saveBase64File(file.base64, `staff_${staffId}`, 'staff_images');
    }

    if (savedRelPath) {
      await HRRepository.updateStaffPhoto(staffId, savedRelPath);
    }

    return { staff_id: staffId, image: savedRelPath };
  }

  /**
   * Upload staff document
   */
  public static async uploadStaffDocument(
    staffId: number | string,
    docType: string,
    file: Express.Multer.File | { base64: string; name?: string } | any,
    otherDocName?: string
  ) {
    let savedRelPath: string | null = null;
    const targetDir = path.join(env.STORAGE.BASE_PATH, 'staff_documents');
    StorageService.ensureDir(targetDir);

    if (file && file.buffer) {
      const ext = path.extname(file.originalname || '.pdf') || '.pdf';
      const filename = `doc_${staffId}_${docType}_${Date.now()}${ext}`;
      const fullPath = path.join(targetDir, filename);
      await fs.promises.writeFile(fullPath, file.buffer);
      savedRelPath = `storage/staff_documents/${filename}`;
    } else if (file && file.path && fs.existsSync(file.path)) {
      const ext = path.extname(file.originalname || file.path || '.pdf') || '.pdf';
      const filename = `doc_${staffId}_${docType}_${Date.now()}${ext}`;
      const fullPath = path.join(targetDir, filename);
      await fs.promises.copyFile(file.path, fullPath);
      savedRelPath = `storage/staff_documents/${filename}`;
    } else if (file && typeof file === 'string') {
      savedRelPath = await StorageService.saveBase64File(file, `doc_${staffId}_${docType}`, 'staff_documents');
    } else if (file && file.base64) {
      savedRelPath = await StorageService.saveBase64File(file.base64, `doc_${staffId}_${docType}`, 'staff_documents');
    }

    if (savedRelPath) {
      await HRRepository.updateStaffDocument(staffId, docType, savedRelPath, otherDocName);
    }

    return { staff_id: staffId, doc_type: docType, document: savedRelPath };
  }

  /**
   * Delete staff document
   */
  public static async deleteStaffDocument(staffId: number | string, docType: string) {
    await HRRepository.deleteStaffDocument(staffId, docType);
    return { staff_id: staffId, doc_type: docType };
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================
  public static async getAttendance(date: string, roleId?: string, staffId?: string) {
    const validDate = date || new Date().toISOString().split('T')[0];
    return await HRRepository.getAttendance(validDate, roleId, staffId);
  }

  public static async getStaffAttendanceHistory(staffId: number | string, year?: string) {
    return await HRRepository.getStaffAttendanceHistory(staffId, year);
  }

  public static async saveAttendance(date: string, records: any[]) {
    if (!date || !Array.isArray(records)) {
      throw new Error('Valid date and records array required');
    }

    for (const rec of records) {
      const staffId = rec.staff_id || rec.id;
      const typeId = rec.staff_attendance_type_id || rec.attendance_type_id || 1;
      const remark = rec.remark || '';
      if (staffId) {
        await HRRepository.saveAttendanceRecord(staffId, typeId, date, remark);
      }
    }

    return { count: records.length, date };
  }

  public static async getAttendanceTypes() {
    return await HRRepository.getAttendanceTypes();
  }

  // ==========================================
  // PAYROLL
  // ==========================================
  public static async getPayroll(month: string, year: string, role?: string) {
    const validMonth = month || new Date().toLocaleString('en-US', { month: 'long' });
    const validYear = year || String(new Date().getFullYear());
    return await HRRepository.getPayroll(validMonth, validYear, role);
  }

  public static async createPayroll(payload: any) {
    if (!payload.staff_id) {
      throw new Error('staff_id is required');
    }
    const id = await HRRepository.createPayslip(payload);
    return { id };
  }

  public static async payPayroll(payload: any) {
    const paymentId = payload.paymentid || payload.id;
    if (!paymentId) {
      throw new Error('Payment / Payslip ID required');
    }
    await HRRepository.markPayslipPaid(paymentId, payload);
    return { id: paymentId, status: 'paid' };
  }

  public static async deletePayroll(id: number | string) {
    await HRRepository.deletePayslip(id);
    return { id };
  }

  // ==========================================
  // LEAVES
  // ==========================================
  public static async getLeaves(staffId?: number | string) {
    return await HRRepository.getLeaveRequests(staffId);
  }

  public static async saveLeave(payload: any) {
    if (!payload.staff_id) {
      throw new Error('staff_id is required');
    }
    const id = await HRRepository.createLeaveRequest(payload);
    return { id };
  }

  public static async deleteLeave(id: number | string) {
    await HRRepository.deleteLeaveRequest(id);
    return { id };
  }

  public static async updateLeaveStatus(leaveRequestId: number | string, status: string, detailremark: string = '') {
    await HRRepository.updateLeaveStatus(leaveRequestId, status, detailremark);
    return { id: leaveRequestId, status };
  }

  public static async getLeaveTypes() {
    return await HRRepository.getLeaveTypes();
  }

  public static async saveLeaveType(id: number | string | undefined, type: string) {
    if (!type || !type.trim()) {
      throw new Error('Leave type name is required');
    }
    if (id) {
      await HRRepository.updateLeaveType(id, type.trim());
      return { id: Number(id), type: type.trim() };
    } else {
      const newId = await HRRepository.createLeaveType(type.trim());
      return { id: newId, type: type.trim() };
    }
  }

  public static async deleteLeaveType(id: number | string) {
    await HRRepository.deleteLeaveType(id);
    return { id };
  }

  // ==========================================
  // DEPARTMENTS & DESIGNATIONS & ROLES
  // ==========================================
  public static async getDepartments() {
    return await HRRepository.getDepartments();
  }

  public static async saveDepartment(id: number | string | undefined, name: string) {
    if (!name || !name.trim()) {
      throw new Error('Department name is required');
    }
    if (id) {
      await HRRepository.updateDepartment(id, name.trim());
      return { id: Number(id), department_name: name.trim() };
    } else {
      const newId = await HRRepository.createDepartment(name.trim());
      return { id: newId, department_name: name.trim() };
    }
  }

  public static async deleteDepartment(id: number | string) {
    await HRRepository.deleteDepartment(id);
    return { id };
  }

  public static async getDesignations() {
    return await HRRepository.getDesignations();
  }

  public static async saveDesignation(id: number | string | undefined, name: string) {
    if (!name || !name.trim()) {
      throw new Error('Designation name is required');
    }
    if (id) {
      await HRRepository.updateDesignation(id, name.trim());
      return { id: Number(id), designation: name.trim() };
    } else {
      const newId = await HRRepository.createDesignation(name.trim());
      return { id: newId, designation: name.trim() };
    }
  }

  public static async deleteDesignation(id: number | string) {
    await HRRepository.deleteDesignation(id);
    return { id };
  }

  public static async getRoles() {
    return await HRRepository.getRoles();
  }

  // ==========================================
  // RATINGS & TIMELINE
  // ==========================================
  public static async getRatings() {
    return await HRRepository.getRatings();
  }

  public static async saveRating(payload: any) {
    const id = await HRRepository.saveRating(payload);
    return { id };
  }

  public static async approveRating(id: number | string, approve: string | number) {
    const approveVal = approve === 'yes' || approve === 1 || approve === '1' ? 1 : 0;
    await HRRepository.approveRating(id, approveVal);
    return { id, status: approveVal };
  }

  public static async deleteRating(id: number | string) {
    await HRRepository.deleteRating(id);
    return { id };
  }

  public static async getTimeline(staffId: number | string) {
    return await HRRepository.getTimeline(staffId);
  }

  public static async addTimeline(payload: any, file?: Express.Multer.File) {
    if (!payload.staff_id || !payload.title) {
      throw new Error('Staff ID and Title required');
    }
    if (file) {
      const targetDir = path.join(env.STORAGE.BASE_PATH, 'staff_timeline');
      StorageService.ensureDir(targetDir);
      const ext = path.extname(file.originalname || file.path || '.pdf') || '.pdf';
      const filename = `timeline_${payload.staff_id}_${Date.now()}${ext}`;
      const fullPath = path.join(targetDir, filename);

      if (file.buffer) {
        await fs.promises.writeFile(fullPath, file.buffer);
        payload.document = `storage/staff_timeline/${filename}`;
      } else if (file.path && fs.existsSync(file.path)) {
        await fs.promises.copyFile(file.path, fullPath);
        payload.document = `storage/staff_timeline/${filename}`;
      }
    }
    const id = await HRRepository.createTimeline(payload);
    return { id, document: payload.document };
  }

  public static async deleteTimeline(id: number | string) {
    await HRRepository.deleteTimeline(id);
    return { id };
  }

  // ==========================================
  // EMAILS & NOTIFICATIONS
  // ==========================================
  public static async sendCredentials(staffId: number | string) {
    const staff = await HRRepository.findStaffById(staffId);
    if (!staff || !staff.email) {
      throw new Error('Staff member or email address not found');
    }
    // Simulation / integration note: Log and return success matching PHP behavior
    logger.info(`Credentials dispatched to ${staff.email} for staff ${staff.name} ${staff.surname}`);
    return { staff_id: staffId, email: staff.email, sent: true };
  }

  public static async sendPayslip(staffId: number | string, month?: string, year?: string) {
    const staff = await HRRepository.findStaffById(staffId);
    if (!staff || !staff.email) {
      throw new Error('Staff member or email address not found');
    }
    logger.info(`Salary payslip dispatched to ${staff.email} for ${month || 'Current Month'} ${year || ''}`);
    return { staff_id: staffId, email: staff.email, sent: true };
  }
}
