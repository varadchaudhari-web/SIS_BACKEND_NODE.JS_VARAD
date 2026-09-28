import { TransportRepository } from './transport.repository';

export class TransportService {
  static async getRoutes(id?: any) {
    return await TransportRepository.getRoutes(id);
  }

  static async createRoute(data: { route_title: string; fare?: number; no_of_vehicle?: number; note?: string }) {
    return await TransportRepository.createRoute(data);
  }

  static async updateRoute(id: any, data: any) {
    return await TransportRepository.updateRoute(id, data);
  }

  static async deleteRoute(id: any) {
    return await TransportRepository.deleteRoute(id);
  }

  static async getVehicles(id?: any) {
    return await TransportRepository.getVehicles(id);
  }

  static async createVehicle(data: any) {
    return await TransportRepository.createVehicle(data);
  }

  static async updateVehicle(id: any, data: any) {
    return await TransportRepository.updateVehicle(id, data);
  }

  static async deleteVehicle(id: any) {
    return await TransportRepository.deleteVehicle(id);
  }

  static async getAssignments(id?: any) {
    return await TransportRepository.getAssignments(id);
  }

  static async assignVehicles(routeId: any, vehicleIds: any[]) {
    return await TransportRepository.assignVehicles(routeId, vehicleIds);
  }

  static async deleteAssignment(params: any) {
    return await TransportRepository.deleteAssignment(params);
  }
}
