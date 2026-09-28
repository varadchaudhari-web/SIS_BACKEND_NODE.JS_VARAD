import { HostelRepository } from './hostel.repository';

export class HostelService {
  static async getHostels(id?: any) {
    return await HostelRepository.getHostels(id);
  }

  static async createHostel(data: { hostel_name: string; type?: string; address?: string; intake?: number; description?: string }) {
    return await HostelRepository.createHostel(data);
  }

  static async updateHostel(id: any, data: any) {
    return await HostelRepository.updateHostel(id, data);
  }

  static async deleteHostel(id: any) {
    return await HostelRepository.deleteHostel(id);
  }

  static async getRoomTypes(id?: any) {
    return await HostelRepository.getRoomTypes(id);
  }

  static async createRoomType(data: { room_type: string; description?: string }) {
    return await HostelRepository.createRoomType(data);
  }

  static async updateRoomType(id: any, data: any) {
    return await HostelRepository.updateRoomType(id, data);
  }

  static async deleteRoomType(id: any) {
    return await HostelRepository.deleteRoomType(id);
  }

  static async getRooms(id?: any, hostelId?: any) {
    return await HostelRepository.getRooms(id, hostelId);
  }

  static async createRoom(data: any) {
    return await HostelRepository.createRoom(data);
  }

  static async updateRoom(id: any, data: any) {
    return await HostelRepository.updateRoom(id, data);
  }

  static async deleteRoom(id: any) {
    return await HostelRepository.deleteRoom(id);
  }

  static async getStudentDetails(params: any) {
    return await HostelRepository.getStudentDetails(params);
  }

  static async allocateStudent(studentId: number | string, roomId: number | string) {
    return await HostelRepository.allocateStudent(studentId, roomId);
  }

  static async deallocateStudent(studentId: number | string) {
    return await HostelRepository.deallocateStudent(studentId);
  }

  static async getLeaves() {
    return await HostelRepository.getLeaves();
  }

  static async createLeave(data: any) {
    return await HostelRepository.createLeave(data);
  }

  static async updateLeaveStatus(id: any, status: string, comment?: string) {
    return await HostelRepository.updateLeaveStatus(id, status, comment);
  }

  static async getVisitors() {
    return await HostelRepository.getVisitors();
  }

  static async createVisitor(data: any) {
    return await HostelRepository.createVisitor(data);
  }

  static async checkoutVisitor(id: any, outTime?: string) {
    return await HostelRepository.updateVisitorOut(id, outTime);
  }

  static async getMaintenance() {
    return await HostelRepository.getMaintenance();
  }

  static async createMaintenance(data: any) {
    return await HostelRepository.createMaintenance(data);
  }

  static async updateMaintenanceStatus(id: any, status: string) {
    return await HostelRepository.updateMaintenanceStatus(id, status);
  }

  static async getMessMenu() {
    return await HostelRepository.getMessMenu();
  }

  static async updateMessMenu(data: any) {
    return await HostelRepository.updateMessMenu(data);
  }

  static async getAttendance(date: string) {
    return await HostelRepository.getAttendance(date);
  }

  static async saveAttendance(date: string, wing: string, records: any[]) {
    return await HostelRepository.saveAttendance(date, wing, records);
  }

  static async getComplaints() {
    return await HostelRepository.getComplaints();
  }

  static async createComplaint(data: any) {
    return await HostelRepository.createComplaint(data);
  }

  static async resolveComplaint(id: any, notes?: string) {
    return await HostelRepository.resolveComplaint(id, notes);
  }
}
