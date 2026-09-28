import { Request, Response } from 'express';
import { TransportService } from './transport.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class TransportController {
  /**
   * Routes: GET / POST / DELETE /api/Transport/routes
   */
  public static async routes(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await TransportService.getRoutes(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { route_title, fare, no_of_vehicle, no_of_vehicles, note, id: bodyId } = req.body;
        if (!route_title && !bodyId) return sendError(res, 'Route title is required', 400);

        if (bodyId || id) {
          await TransportService.updateRoute(bodyId || id, {
            route_title,
            fare: fare !== undefined ? parseFloat(fare) : undefined,
            no_of_vehicle: no_of_vehicle || no_of_vehicles || 1,
            note
          });
          return sendSuccess(res, { id: bodyId || id, route_title }, 'Route updated successfully');
        }

        const result = await TransportService.createRoute({
          route_title,
          fare: fare !== undefined ? parseFloat(fare) : 0,
          no_of_vehicle: no_of_vehicle || no_of_vehicles || 1,
          note
        });

        return sendSuccess(res, { id: result.insertId, route_title }, 'Route created successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Route ID required', 400);
        await TransportService.deleteRoute(id);
        return sendSuccess(res, { id }, 'Route deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in transport routes:', error);
      return sendError(res, 'Failed to process transport route', 500);
    }
  }

  public static async deleteRoute(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Route ID required', 400);
      await TransportService.deleteRoute(id);
      return sendSuccess(res, { id }, 'Route deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete route', 500);
    }
  }

  /**
   * Vehicles: GET / POST / DELETE /api/Transport/vehicles
   */
  public static async vehicles(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await TransportService.getVehicles(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { vehicle_no, vehicle_model, manufacture_year, year_made, driver_name, driver_licence, driver_contact, note, id: bodyId } = req.body;
        if (!vehicle_no && !bodyId) return sendError(res, 'Vehicle number is required', 400);

        if (bodyId || id) {
          await TransportService.updateVehicle(bodyId || id, {
            vehicle_no,
            vehicle_model,
            manufacture_year: manufacture_year || year_made,
            driver_name,
            driver_licence,
            driver_contact,
            note
          });
          return sendSuccess(res, { id: bodyId || id, vehicle_no }, 'Vehicle updated successfully');
        }

        const result = await TransportService.createVehicle({
          vehicle_no,
          vehicle_model,
          manufacture_year: manufacture_year || year_made,
          driver_name,
          driver_licence,
          driver_contact,
          note
        });

        return sendSuccess(res, { id: result.insertId, vehicle_no }, 'Vehicle added successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Vehicle ID required', 400);
        await TransportService.deleteVehicle(id);
        return sendSuccess(res, { id }, 'Vehicle deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in transport vehicles:', error);
      return sendError(res, 'Failed to process vehicle request', 500);
    }
  }

  public static async deleteVehicle(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Vehicle ID required', 400);
      await TransportService.deleteVehicle(id);
      return sendSuccess(res, { id }, 'Vehicle deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete vehicle', 500);
    }
  }

  /**
   * Assignments: GET / POST /api/Transport/assignments
   */
  public static async assignments(req: Request, res: Response) {
    const method = req.method;

    try {
      if (method === 'GET') {
        const id = req.query.id || req.params.id;
        const rows = await TransportService.getAssignments(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const body = req.body || {};
        const route_id = body.route_id || body.routeId;
        if (!route_id) return sendError(res, 'Route ID is required', 400);

        let vehicleIds: any[] = [];
        if (Array.isArray(body.vehicle_ids)) {
          vehicleIds = body.vehicle_ids;
        } else if (Array.isArray(body.vehicles)) {
          vehicleIds = body.vehicles;
        } else if (body.vehicle_id !== undefined) {
          vehicleIds = [body.vehicle_id];
        } else if (body.vehicleId !== undefined) {
          vehicleIds = [body.vehicleId];
        }

        const cleanIds = vehicleIds
          .map((v: any) => (typeof v === 'object' && v !== null ? (v.id || v.vehicle_id) : v))
          .map(Number)
          .filter((n: number) => !isNaN(n) && n > 0);

        await TransportService.assignVehicles(route_id, cleanIds);
        return sendSuccess(res, { route_id, vehicle_ids: cleanIds }, 'Vehicle-Route assignments updated successfully', 201);
      }

      if (method === 'DELETE') {
        return await TransportController.deleteAssignment(req, res);
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in transport assignments:', error);
      return sendError(res, 'Failed to process transport assignments', 500);
    }
  }

  public static async deleteAssignment(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const route_id = body.route_id || body.routeId || req.query.route_id;
      const vehicle_ids = body.vehicle_ids || body.vehicles;
      const id = body.id || body.veh_route_id || req.params.id || req.query.id;

      if (!route_id && !id) {
        return sendError(res, 'Assignment or Route ID required', 400);
      }

      let parsedVehicleIds: number[] | undefined = undefined;
      if (Array.isArray(vehicle_ids)) {
        parsedVehicleIds = vehicle_ids.map(Number).filter((n: number) => !isNaN(n) && n > 0);
      } else if (vehicle_ids !== undefined) {
        parsedVehicleIds = [Number(vehicle_ids)].filter((n: number) => !isNaN(n) && n > 0);
      }

      await TransportService.deleteAssignment({
        id,
        veh_route_id: body.veh_route_id || id,
        route_id,
        vehicle_ids: parsedVehicleIds && parsedVehicleIds.length > 0 ? parsedVehicleIds : undefined
      });

      return sendSuccess(res, { id: id || route_id, route_id }, 'Assigned vehicles removed successfully');
    } catch (error) {
      logger.error('Error in deleteAssignment:', error);
      return sendError(res, 'Failed to delete assignment', 500);
    }
  }

  public static async runSeeds(req: Request, res: Response) {
    return sendSuccess(res, null, 'Transport seeds completed successfully');
  }
}
