import { SportsRepository } from './sports.repository';

export class SportsService {
  // Categories
  static async getCategories(id?: any) {
    return await SportsRepository.getCategories(id);
  }

  static async createCategory(data: any) {
    return await SportsRepository.createCategory(data);
  }

  static async updateCategory(id: any, data: any) {
    return await SportsRepository.updateCategory(id, data);
  }

  static async deleteCategory(id: any) {
    return await SportsRepository.deleteCategory(id);
  }

  // Teams
  static async getTeams(id?: any) {
    return await SportsRepository.getTeams(id);
  }

  static async createTeam(data: any) {
    return await SportsRepository.createTeam(data);
  }

  static async updateTeam(id: any, data: any) {
    return await SportsRepository.updateTeam(id, data);
  }

  static async deleteTeam(id: any) {
    return await SportsRepository.deleteTeam(id);
  }

  // Tournaments
  static async getTournaments(id?: any) {
    return await SportsRepository.getTournaments(id);
  }

  static async createTournament(data: any) {
    return await SportsRepository.createTournament(data);
  }

  static async updateTournament(id: any, data: any) {
    return await SportsRepository.updateTournament(id, data);
  }

  static async deleteTournament(id: any) {
    return await SportsRepository.deleteTournament(id);
  }

  // Student Performance
  static async getPerformance(id?: any) {
    return await SportsRepository.getPerformance(id);
  }

  static async createPerformance(data: any) {
    return await SportsRepository.createPerformance(data);
  }

  static async updatePerformance(id: any, data: any) {
    return await SportsRepository.updatePerformance(id, data);
  }

  static async deletePerformance(id: any) {
    return await SportsRepository.deletePerformance(id);
  }
}
