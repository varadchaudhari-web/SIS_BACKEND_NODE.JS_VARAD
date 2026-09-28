import { Request, Response } from 'express';
import { SportsService } from './sports.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class SportsController {
  /**
   * Categories: GET / POST / PUT / DELETE /api/sports/categories
   */
  public static async categories(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await SportsService.getCategories(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { name, id: bodyId } = req.body;
        if (bodyId || id) {
          await SportsService.updateCategory(bodyId || id, req.body);
          return sendSuccess(res, { id: bodyId || id, name }, 'Sports category updated successfully');
        }
        if (!name) return sendError(res, 'Category name is required', 400);
        const result = await SportsService.createCategory(req.body);
        return sendSuccess(res, { id: result.insertId, name }, 'Sports category created successfully', 201);
      }

      if (method === 'PUT') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Category ID is required', 400);
        await SportsService.updateCategory(targetId, req.body);
        return sendSuccess(res, { id: targetId }, 'Sports category updated successfully');
      }

      if (method === 'DELETE') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Category ID is required', 400);
        await SportsService.deleteCategory(targetId);
        return sendSuccess(res, { id: targetId }, 'Sports category deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in sports categories:', error);
      return sendError(res, 'Failed to process sports category request', 500);
    }
  }

  /**
   * Teams: GET / POST / PUT / DELETE /api/sports/teams
   */
  public static async teams(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await SportsService.getTeams(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { name, id: bodyId } = req.body;
        if (bodyId || id) {
          await SportsService.updateTeam(bodyId || id, req.body);
          return sendSuccess(res, { id: bodyId || id, name }, 'Sports team updated successfully');
        }
        if (!name) return sendError(res, 'Team name is required', 400);
        const result = await SportsService.createTeam(req.body);
        return sendSuccess(res, { id: result.insertId, name }, 'Sports team created successfully', 201);
      }

      if (method === 'PUT') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Team ID is required', 400);
        await SportsService.updateTeam(targetId, req.body);
        return sendSuccess(res, { id: targetId }, 'Sports team updated successfully');
      }

      if (method === 'DELETE') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Team ID is required', 400);
        await SportsService.deleteTeam(targetId);
        return sendSuccess(res, { id: targetId }, 'Sports team deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in sports teams:', error);
      return sendError(res, 'Failed to process sports team request', 500);
    }
  }

  /**
   * Tournaments: GET / POST / PUT / DELETE /api/sports/tournaments
   */
  public static async tournaments(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await SportsService.getTournaments(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { name, id: bodyId } = req.body;
        if (bodyId || id) {
          await SportsService.updateTournament(bodyId || id, req.body);
          return sendSuccess(res, { id: bodyId || id, name }, 'Tournament updated successfully');
        }
        if (!name) return sendError(res, 'Tournament name is required', 400);
        const result = await SportsService.createTournament(req.body);
        return sendSuccess(res, { id: result.insertId, name }, 'Tournament created successfully', 201);
      }

      if (method === 'PUT') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Tournament ID is required', 400);
        await SportsService.updateTournament(targetId, req.body);
        return sendSuccess(res, { id: targetId }, 'Tournament updated successfully');
      }

      if (method === 'DELETE') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Tournament ID is required', 400);
        await SportsService.deleteTournament(targetId);
        return sendSuccess(res, { id: targetId }, 'Tournament deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in sports tournaments:', error);
      return sendError(res, 'Failed to process tournament request', 500);
    }
  }

  /**
   * Student Performance: GET / POST / PUT / DELETE /api/sports/performance
   */
  public static async performance(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await SportsService.getPerformance(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { student_id, studentId, id: bodyId } = req.body;
        const targetStudentId = student_id || studentId;
        if (bodyId || id) {
          await SportsService.updatePerformance(bodyId || id, req.body);
          return sendSuccess(res, { id: bodyId || id }, 'Performance record updated successfully');
        }
        if (!targetStudentId) return sendError(res, 'Student ID is required', 400);
        const result = await SportsService.createPerformance(req.body);
        return sendSuccess(res, { id: result.insertId }, 'Performance record added successfully', 201);
      }

      if (method === 'PUT') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Performance ID is required', 400);
        await SportsService.updatePerformance(targetId, req.body);
        return sendSuccess(res, { id: targetId }, 'Performance record updated successfully');
      }

      if (method === 'DELETE') {
        const targetId = id || req.body.id;
        if (!targetId) return sendError(res, 'Performance ID is required', 400);
        await SportsService.deletePerformance(targetId);
        return sendSuccess(res, { id: targetId }, 'Performance record deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in sports performance:', error);
      return sendError(res, 'Failed to process performance request', 500);
    }
  }
}
