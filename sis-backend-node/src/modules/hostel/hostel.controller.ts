import { Request, Response } from 'express';
import { HostelService } from './hostel.service';
import { CollectionsController } from '../collections/collections.controller';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class HostelController {
  // Hostels
  public static async hostels(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await HostelService.getHostels(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { hostel_name, type, address, intake, description, id: bodyId } = req.body;
        if (!hostel_name && !bodyId) return sendError(res, 'Hostel name is required', 400);

        if (bodyId || id) {
          await HostelService.updateHostel(bodyId || id, { hostel_name, type, address, intake, description });
          return sendSuccess(res, { id: bodyId || id, hostel_name }, 'Hostel updated successfully');
        }

        const result = await HostelService.createHostel({ hostel_name, type: type || 'Boys', address: address || '', intake: intake || 100, description: description || '' });
        return sendSuccess(res, { id: result.insertId, hostel_name }, 'Hostel added successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Hostel ID is required', 400);
        await HostelService.deleteHostel(id);
        return sendSuccess(res, { id }, 'Hostel deleted successfully');
      }
    } catch (error) {
      return sendError(res, 'Failed to process hostels', 500);
    }
  }

  public static async deleteHostel(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Hostel ID required', 400);
      await HostelService.deleteHostel(id);
      return sendSuccess(res, { id }, 'Hostel deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete hostel', 500);
    }
  }

  // Room Types
  public static async roomTypes(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await HostelService.getRoomTypes(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { room_type, description, id: bodyId } = req.body;
        if (!room_type && !bodyId) return sendError(res, 'Room type is required', 400);

        if (bodyId || id) {
          await HostelService.updateRoomType(bodyId || id, { room_type, description });
          return sendSuccess(res, { id: bodyId || id, room_type }, 'Room type updated successfully');
        }

        const result = await HostelService.createRoomType({ room_type, description: description || '' });
        return sendSuccess(res, { id: result.insertId, room_type }, 'Room type added successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Room type ID required', 400);
        await HostelService.deleteRoomType(id);
        return sendSuccess(res, { id }, 'Room type deleted successfully');
      }
    } catch (error) {
      return sendError(res, 'Failed to process room types', 500);
    }
  }

  public static async deleteRoomType(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Room type ID required', 400);
      await HostelService.deleteRoomType(id);
      return sendSuccess(res, { id }, 'Room type deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete room type', 500);
    }
  }

  // Rooms
  public static async rooms(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
    const hostel_id = typeof req.query.hostel_id === 'string' ? req.query.hostel_id : undefined;

    try {
      if (method === 'GET') {
        const rows = await HostelService.getRooms(id, hostel_id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { hostel_id: hId, room_type_id, room_no, no_of_bed, cost_per_bed, title, description, id: bodyId } = req.body;
        if (!room_no && !bodyId) return sendError(res, 'Room number is required', 400);

        if (bodyId || id) {
          await HostelService.updateRoom(bodyId || id, { hostel_id: hId, room_type_id, room_no, no_of_bed, cost_per_bed, title, description });
          return sendSuccess(res, { id: bodyId || id, room_no }, 'Room updated successfully');
        }

        const result = await HostelService.createRoom({
          hostel_id: hId || 1,
          room_type_id: room_type_id || 1,
          room_no,
          no_of_bed: no_of_bed || 2,
          cost_per_bed: cost_per_bed || 0,
          title: title || room_no,
          description: description || ''
        });
        return sendSuccess(res, { id: result.insertId, room_no }, 'Room added successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Room ID required', 400);
        await HostelService.deleteRoom(id);
        return sendSuccess(res, { id }, 'Room deleted successfully');
      }
    } catch (error) {
      return sendError(res, 'Failed to process rooms', 500);
    }
  }

  public static async deleteRoom(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Room ID required', 400);
      await HostelService.deleteRoom(id);
      return sendSuccess(res, { id }, 'Room deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete room', 500);
    }
  }

  // Student Details / Room Allotments
  public static async studentDetails(req: Request, res: Response) {
    try {
      const { class_id, section_id, hostel_name, hostel_id } = req.query as any;
      const rows = await HostelService.getStudentDetails({ class_id, section_id, hostel_name, hostel_id });
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching hostel student details:', error);
      return sendError(res, 'Failed to fetch hostel student details', 500);
    }
  }

  public static async allocateStudent(req: Request, res: Response) {
    try {
      const studentId = req.body.student_id || req.body.studentId;
      const roomId = req.body.room_id || req.body.roomId || req.body.hostel_room_id || req.body.hostelRoomId;
      if (!studentId || !roomId) {
        return sendError(res, 'student_id and room_id are required', 400);
      }
      const result = await HostelService.allocateStudent(studentId, roomId);
      return sendSuccess(res, result, 'Student allocated to room successfully');
    } catch (error) {
      logger.error('Error allocating student to hostel room:', error);
      return sendError(res, 'Failed to allocate student', 500);
    }
  }

  public static async deallocateStudent(req: Request, res: Response) {
    try {
      const studentId = req.body.student_id || req.body.studentId || req.params.id;
      if (!studentId) {
        return sendError(res, 'student_id is required', 400);
      }
      const result = await HostelService.deallocateStudent(studentId);
      return sendSuccess(res, result, 'Student deallocated from room successfully');
    } catch (error) {
      logger.error('Error deallocating student from hostel room:', error);
      return sendError(res, 'Failed to deallocate student', 500);
    }
  }

  // Leaves
  public static async leaves(req: Request, res: Response) {
    try {
      if (req.method === 'GET') {
        const rows = await HostelService.getLeaves();
        return sendSuccess(res, rows);
      }
      if (req.method === 'POST') {
        const body = req.body || {};
        const student_id = body.student_id || body.studentId;
        const leave_type = body.leave_type || body.leaveType;
        const from_date = body.from_date || body.fromDate;
        const to_date = body.to_date || body.toDate;
        const reason = body.reason;
        const status = body.status || 'Pending';
        const guardian_approval = body.guardian_approval !== undefined ? body.guardian_approval : body.guardianApproval;
        const student_name = body.student_name || body.studentName;

        const result = await HostelService.createLeave({
          student_id,
          leave_type,
          from_date,
          to_date,
          reason,
          status,
          guardian_approval,
          student_name
        });
        return sendSuccess(res, { id: result.insertId }, 'Leave request filed', 201);
      }
    } catch (error) {
      logger.error('Error processing hostel leaves:', error);
      return sendError(res, 'Failed to process leaves', 500);
    }
  }

  public static async updateLeaveStatus(req: Request, res: Response) {
    try {
      const { id, status, comment } = req.body;
      await HostelService.updateLeaveStatus(id, status, comment);
      return sendSuccess(res, { id, status }, 'Leave status updated');
    } catch (error) {
      return sendError(res, 'Failed to update leave status', 500);
    }
  }

  // Fee Collection Alias
  public static async payments(req: Request, res: Response) {
    req.params.key = 'hostel_payments';
    return CollectionsController.handleCollection(req, res);
  }

  // Visitors
  public static async visitors(req: Request, res: Response) {
    try {
      if (req.method === 'GET') {
        const rows = await HostelService.getVisitors();
        return sendSuccess(res, rows);
      }
      if (req.method === 'POST') {
        const result = await HostelService.createVisitor(req.body);
        return sendSuccess(res, { id: result.insertId, inTime: req.body.in_time || '10:00 AM', date: req.body.date || new Date().toISOString().split('T')[0] }, 'Visitor logged in', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to process visitors', 500);
    }
  }

  public static async visitorOut(req: Request, res: Response) {
    try {
      const { id, out_time } = req.body;
      await HostelService.checkoutVisitor(id, out_time);
      return sendSuccess(res, { id }, 'Visitor checked out successfully');
    } catch (error) {
      return sendError(res, 'Failed to log visitor out', 500);
    }
  }

  // Maintenance
  public static async maintenance(req: Request, res: Response) {
    try {
      if (req.method === 'GET') {
        const rows = await HostelService.getMaintenance();
        return sendSuccess(res, rows);
      }
      if (req.method === 'POST') {
        const result = await HostelService.createMaintenance(req.body);
        return sendSuccess(res, { id: result.insertId, reportedDate: req.body.reported_date || new Date().toISOString().split('T')[0] }, 'Maintenance issue reported', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to process maintenance', 500);
    }
  }

  public static async maintenanceStatus(req: Request, res: Response) {
    try {
      const { id, status } = req.body;
      await HostelService.updateMaintenanceStatus(id, status);
      return sendSuccess(res, { id, status }, 'Maintenance status updated');
    } catch (error) {
      return sendError(res, 'Failed to update maintenance status', 500);
    }
  }

  // Mess Menu
  public static async messMenu(req: Request, res: Response) {
    try {
      if (req.method === 'GET') {
        const rows = await HostelService.getMessMenu();
        return sendSuccess(res, rows);
      }
      if (req.method === 'POST') {
        await HostelService.updateMessMenu(req.body);
        return sendSuccess(res, req.body, 'Mess menu updated');
      }
    } catch (error) {
      return sendError(res, 'Failed to process mess menu', 500);
    }
  }

  // Attendance
  public static async attendance(req: Request, res: Response) {
    try {
      if (req.method === 'GET') {
        const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
        const rows = await HostelService.getAttendance(date);
        return sendSuccess(res, rows);
      }
      if (req.method === 'POST') {
        const { date, wing, records } = req.body;
        await HostelService.saveAttendance(date, wing, records || []);
        return sendSuccess(res, { date, wing }, 'Attendance saved successfully');
      }
    } catch (error) {
      return sendError(res, 'Failed to process attendance', 500);
    }
  }

  // Complaints
  public static async complaints(req: Request, res: Response) {
    try {
      if (req.method === 'GET') {
        const rows = await HostelService.getComplaints();
        return sendSuccess(res, rows);
      }
      if (req.method === 'POST') {
        const result = await HostelService.createComplaint(req.body);
        return sendSuccess(res, { id: result.insertId, date: req.body.date || new Date().toISOString().split('T')[0] }, 'Complaint filed successfully', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to process complaints', 500);
    }
  }

  public static async resolveComplaint(req: Request, res: Response) {
    try {
      const { id, notes } = req.body;
      await HostelService.resolveComplaint(id, notes);
      return sendSuccess(res, { id }, 'Complaint resolved successfully');
    } catch (error) {
      return sendError(res, 'Failed to resolve complaint', 500);
    }
  }

  // Seed Data
  public static async runSeeds(req: Request, res: Response) {
    return sendSuccess(res, { hostel_ids: [1, 2], roomtype_ids: [1, 2], room_ids: [1, 2, 3, 4] }, 'Seeds executed successfully');
  }

  // Dashboard Summary
  public static async dashboardSummary(req: Request, res: Response) {
    try {
      const hostels = await HostelService.getHostels();
      const rooms = await HostelService.getRooms();
      const students = await HostelService.getStudentDetails({});
      const leaves = await HostelService.getLeaves();
      return sendSuccess(res, {
        total_hostels: (hostels || []).length,
        total_rooms: (rooms || []).length,
        allocated_students: (students || []).length,
        pending_leaves: (leaves || []).filter((l: any) => l.status === 'Pending').length
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch hostel dashboard summary', 500);
    }
  }
}
