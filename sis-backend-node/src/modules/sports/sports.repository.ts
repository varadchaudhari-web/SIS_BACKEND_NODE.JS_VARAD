import { query, queryOne, execute } from '../../config/database';

export class SportsRepository {
  private static initialized = false;

  private static async ensureTables() {
    if (this.initialized) return;
    try {
      await execute(`
        CREATE TABLE IF NOT EXISTS sports_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) DEFAULT 'Outdoor',
          description TEXT,
          rules TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS sports_teams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          sport_id VARCHAR(50),
          sport_name VARCHAR(100),
          captain_id VARCHAR(50),
          captain_name VARCHAR(100),
          players_json LONGTEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS sports_tournaments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          sport_id VARCHAR(50),
          sport_name VARCHAR(100),
          start_date DATE,
          end_date DATE,
          venue VARCHAR(150),
          matches_json LONGTEXT,
          standings_json LONGTEXT,
          status VARCHAR(50) DEFAULT 'Scheduled',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS sports_performance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id VARCHAR(50),
          student_name VARCHAR(100),
          class_section VARCHAR(50),
          sport_id VARCHAR(50),
          sport_name VARCHAR(100),
          event_name VARCHAR(150),
          achievement VARCHAR(50),
          points INT DEFAULT 0,
          year VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);

      this.initialized = true;
    } catch (e) {
      // Table creation handled gracefully
    }
  }

  // Categories
  static async getCategories(id?: any) {
    await this.ensureTables();
    if (id) {
      return await queryOne(`SELECT * FROM sports_categories WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM sports_categories ORDER BY id ASC`);
  }

  static async createCategory(data: any) {
    await this.ensureTables();
    return await execute(`
      INSERT INTO sports_categories (name, type, description, rules)
      VALUES (?, ?, ?, ?)
    `, [data.name, data.type || 'Outdoor', data.description || '', data.rules || '']);
  }

  static async updateCategory(id: any, data: any) {
    await this.ensureTables();
    return await execute(`
      UPDATE sports_categories
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          description = COALESCE(?, description),
          rules = COALESCE(?, rules)
      WHERE id = ?
    `, [data.name, data.type, data.description, data.rules, id]);
  }

  static async deleteCategory(id: any) {
    await this.ensureTables();
    return await execute(`DELETE FROM sports_categories WHERE id = ?`, [id]);
  }

  // Teams
  static async getTeams(id?: any) {
    await this.ensureTables();
    if (id) {
      const row = await queryOne(`SELECT * FROM sports_teams WHERE id = ?`, [id]);
      if (row && row.players_json) {
        try { row.players = JSON.parse(row.players_json); } catch (e) { row.players = []; }
      }
      return row;
    }
    const rows = await query(`SELECT * FROM sports_teams ORDER BY id DESC`);
    return rows.map((r: any) => {
      try { r.players = r.players_json ? JSON.parse(r.players_json) : []; } catch (e) { r.players = []; }
      return r;
    });
  }

  static async createTeam(data: any) {
    await this.ensureTables();
    const playersJson = Array.isArray(data.players) ? JSON.stringify(data.players) : (data.players_json || '[]');
    return await execute(`
      INSERT INTO sports_teams (name, sport_id, sport_name, captain_id, captain_name, players_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.name, data.sportId || data.sport_id, data.sportName || data.sport_name, data.captainId || data.captain_id, data.captainName || data.captain_name, playersJson]);
  }

  static async updateTeam(id: any, data: any) {
    await this.ensureTables();
    const playersJson = Array.isArray(data.players) ? JSON.stringify(data.players) : data.players_json;
    return await execute(`
      UPDATE sports_teams
      SET name = COALESCE(?, name),
          sport_id = COALESCE(?, sport_id),
          sport_name = COALESCE(?, sport_name),
          captain_id = COALESCE(?, captain_id),
          captain_name = COALESCE(?, captain_name),
          players_json = COALESCE(?, players_json)
      WHERE id = ?
    `, [data.name, data.sportId || data.sport_id, data.sportName || data.sport_name, data.captainId || data.captain_id, data.captainName || data.captain_name, playersJson, id]);
  }

  static async deleteTeam(id: any) {
    await this.ensureTables();
    return await execute(`DELETE FROM sports_teams WHERE id = ?`, [id]);
  }

  // Tournaments
  static async getTournaments(id?: any) {
    await this.ensureTables();
    if (id) {
      const row = await queryOne(`SELECT * FROM sports_tournaments WHERE id = ?`, [id]);
      if (row) {
        try { row.matches = row.matches_json ? JSON.parse(row.matches_json) : []; } catch (e) { row.matches = []; }
        try { row.standings = row.standings_json ? JSON.parse(row.standings_json) : []; } catch (e) { row.standings = []; }
      }
      return row;
    }
    const rows = await query(`SELECT * FROM sports_tournaments ORDER BY id DESC`);
    return rows.map((r: any) => {
      try { r.matches = r.matches_json ? JSON.parse(r.matches_json) : []; } catch (e) { r.matches = []; }
      try { r.standings = r.standings_json ? JSON.parse(r.standings_json) : []; } catch (e) { r.standings = []; }
      return r;
    });
  }

  static async createTournament(data: any) {
    await this.ensureTables();
    const matchesJson = Array.isArray(data.matches) ? JSON.stringify(data.matches) : '[]';
    const standingsJson = Array.isArray(data.standings) ? JSON.stringify(data.standings) : '[]';
    return await execute(`
      INSERT INTO sports_tournaments (name, sport_id, sport_name, start_date, end_date, venue, matches_json, standings_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.sportId || data.sport_id,
      data.sportName || data.sport_name,
      data.startDate || data.start_date,
      data.endDate || data.end_date,
      data.venue || '',
      matchesJson,
      standingsJson,
      data.status || 'Scheduled'
    ]);
  }

  static async updateTournament(id: any, data: any) {
    await this.ensureTables();
    const matchesJson = Array.isArray(data.matches) ? JSON.stringify(data.matches) : data.matches_json;
    const standingsJson = Array.isArray(data.standings) ? JSON.stringify(data.standings) : data.standings_json;
    return await execute(`
      UPDATE sports_tournaments
      SET name = COALESCE(?, name),
          sport_id = COALESCE(?, sport_id),
          sport_name = COALESCE(?, sport_name),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          venue = COALESCE(?, venue),
          matches_json = COALESCE(?, matches_json),
          standings_json = COALESCE(?, standings_json),
          status = COALESCE(?, status)
      WHERE id = ?
    `, [data.name, data.sportId || data.sport_id, data.sportName || data.sport_name, data.startDate || data.start_date, data.endDate || data.end_date, data.venue, matchesJson, standingsJson, data.status, id]);
  }

  static async deleteTournament(id: any) {
    await this.ensureTables();
    return await execute(`DELETE FROM sports_tournaments WHERE id = ?`, [id]);
  }

  // Student Performance
  static async getPerformance(id?: any) {
    await this.ensureTables();
    if (id) {
      return await queryOne(`SELECT * FROM sports_performance WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM sports_performance ORDER BY id DESC`);
  }

  static async createPerformance(data: any) {
    await this.ensureTables();
    return await execute(`
      INSERT INTO sports_performance (student_id, student_name, class_section, sport_id, sport_name, event_name, achievement, points, year, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.studentId || data.student_id,
      data.studentName || data.student_name,
      data.classSection || data.class_section || '',
      data.sportId || data.sport_id,
      data.sportName || data.sport_name,
      data.eventName || data.event_name,
      data.achievement || 'Participation',
      data.points || 0,
      data.year || '2025-26',
      data.notes || ''
    ]);
  }

  static async updatePerformance(id: any, data: any) {
    await this.ensureTables();
    return await execute(`
      UPDATE sports_performance
      SET student_id = COALESCE(?, student_id),
          student_name = COALESCE(?, student_name),
          class_section = COALESCE(?, class_section),
          sport_id = COALESCE(?, sport_id),
          sport_name = COALESCE(?, sport_name),
          event_name = COALESCE(?, event_name),
          achievement = COALESCE(?, achievement),
          points = COALESCE(?, points),
          year = COALESCE(?, year),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `, [data.studentId || data.student_id, data.studentName || data.student_name, data.classSection || data.class_section, data.sportId || data.sport_id, data.sportName || data.sport_name, data.eventName || data.event_name, data.achievement, data.points, data.year, data.notes, id]);
  }

  static async deletePerformance(id: any) {
    await this.ensureTables();
    return await execute(`DELETE FROM sports_performance WHERE id = ?`, [id]);
  }
}
