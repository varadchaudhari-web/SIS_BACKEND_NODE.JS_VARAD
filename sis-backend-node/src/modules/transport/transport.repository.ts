import { query, queryOne, execute } from '../../config/database';

export class TransportRepository {
  // Routes
  static async getRoutes(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM transport_route WHERE id = ?`, [id]);
    }
    return await query(`
      SELECT tr.*,
             (SELECT COUNT(*) FROM vehicle_routes vr WHERE vr.route_id = tr.id) as assigned_vehicles_count
      FROM transport_route tr
      ORDER BY tr.id DESC
    `);
  }

  static async createRoute(data: { route_title: string; fare?: number; no_of_vehicle?: number; note?: string }) {
    return await execute(`
      INSERT INTO transport_route (route_title, fare, no_of_vehicle, note, is_active)
      VALUES (?, ?, ?, ?, 'yes')
    `, [data.route_title, data.fare || 0, data.no_of_vehicle || 1, data.note || '']);
  }

  static async updateRoute(id: any, data: { route_title?: string; fare?: number; no_of_vehicle?: number; note?: string }) {
    return await execute(`
      UPDATE transport_route
      SET route_title = COALESCE(?, route_title),
          fare = COALESCE(?, fare),
          no_of_vehicle = COALESCE(?, no_of_vehicle),
          note = COALESCE(?, note)
      WHERE id = ?
    `, [data.route_title, data.fare, data.no_of_vehicle, data.note, id]);
  }

  static async deleteRoute(id: any) {
    await execute(`DELETE FROM vehicle_routes WHERE route_id = ?`, [id]);
    return await execute(`DELETE FROM transport_route WHERE id = ?`, [id]);
  }

  // Vehicles
  static async getVehicles(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM vehicles WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM vehicles ORDER BY id DESC`);
  }

  static async createVehicle(data: { vehicle_no: string; vehicle_model?: string; manufacture_year?: string; year_made?: string; driver_name?: string; driver_licence?: string; driver_contact?: string; note?: string }) {
    const year = data.manufacture_year || data.year_made || new Date().getFullYear().toString();
    return await execute(`
      INSERT INTO vehicles (vehicle_no, vehicle_model, manufacture_year, driver_name, driver_licence, driver_contact, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [data.vehicle_no, data.vehicle_model || '', year, data.driver_name || '', data.driver_licence || '', data.driver_contact || '', data.note || '']);
  }

  static async updateVehicle(id: any, data: any) {
    const year = data.manufacture_year || data.year_made;
    return await execute(`
      UPDATE vehicles
      SET vehicle_no = COALESCE(?, vehicle_no),
          vehicle_model = COALESCE(?, vehicle_model),
          manufacture_year = COALESCE(?, manufacture_year),
          driver_name = COALESCE(?, driver_name),
          driver_licence = COALESCE(?, driver_licence),
          driver_contact = COALESCE(?, driver_contact),
          note = COALESCE(?, note)
      WHERE id = ?
    `, [data.vehicle_no, data.vehicle_model, year, data.driver_name, data.driver_licence, data.driver_contact, data.note, id]);
  }

  static async deleteVehicle(id: any) {
    await execute(`DELETE FROM vehicle_routes WHERE vehicle_id = ?`, [id]);
    return await execute(`DELETE FROM vehicles WHERE id = ?`, [id]);
  }

  // Assignments (vehicle_routes)
  static async getAssignments(id?: any) {
    // Returns routes with associated vehicle list matching CodeIgniter vehroute_model
    let routesSql = `SELECT * FROM transport_route`;
    const params: any[] = [];
    if (id) {
      routesSql += ` WHERE id = ?`;
      params.push(id);
    }
    routesSql += ` ORDER BY id DESC`;
    const routes = await query(routesSql, params);

    const vrRows = await query(`
      SELECT vr.id as veh_route_id, vr.id as vec_route_id, vr.route_id, vr.vehicle_id,
             v.id, v.id as vehicle_id, v.vehicle_no, v.vehicle_model, v.driver_name, v.driver_licence, v.driver_contact
      FROM vehicle_routes vr
      JOIN vehicles v ON v.id = vr.vehicle_id
      ORDER BY vr.id ASC
    `);

    // Group assigned vehicles under each route (only returning routes with assigned vehicles)
    const assignedRoutes = routes
      .map((r: any) => {
        const assigned = vrRows.filter((vr: any) => Number(vr.route_id) === Number(r.id));
        return {
          id: assigned.length > 0 ? assigned[0].veh_route_id : r.id,
          veh_route_id: assigned.length > 0 ? assigned[0].veh_route_id : r.id,
          route_id: r.id,
          route_title: r.route_title,
          fare: r.fare,
          vehicles: assigned,
          vehicles_count: assigned.length,
          assigned_vehicles: assigned.map((v: any) => v.vehicle_no).join(', ')
        };
      })
      .filter((r: any) => r.vehicles.length > 0);

    return assignedRoutes;
  }

  static async assignVehicles(routeId: number | string, vehicleIds: (number | string)[]) {
    const rId = Number(routeId);
    // Remove existing assignments for this route first, matching PHP vehroute_model->removeByroute
    await execute(`DELETE FROM vehicle_routes WHERE route_id = ?`, [rId]);

    // Insert new mappings
    for (const vId of vehicleIds) {
      const numId = Number(vId);
      if (numId) {
        await execute(`INSERT INTO vehicle_routes (route_id, vehicle_id) VALUES (?, ?)`, [rId, numId]);
      }
    }
    return true;
  }

  static async deleteAssignment(params: { id?: number | string; veh_route_id?: number | string; route_id?: number | string; vehicle_ids?: (number | string)[] }) {
    if (params.route_id && params.vehicle_ids && Array.isArray(params.vehicle_ids) && params.vehicle_ids.length > 0) {
      const placeholders = params.vehicle_ids.map(() => '?').join(',');
      const ids = params.vehicle_ids.map(Number);
      return await query(
        `DELETE FROM vehicle_routes WHERE route_id = ? AND vehicle_id IN (${placeholders})`,
        [Number(params.route_id), ...ids]
      );
    }
    if (params.route_id) {
      return await execute(`DELETE FROM vehicle_routes WHERE route_id = ?`, [Number(params.route_id)]);
    }
    if (params.veh_route_id || params.id) {
      return await execute(`DELETE FROM vehicle_routes WHERE id = ?`, [Number(params.veh_route_id || params.id)]);
    }
  }
}

