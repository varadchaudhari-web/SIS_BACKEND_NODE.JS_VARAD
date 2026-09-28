import { query, queryOne, execute, transaction } from '../../config/database';
import { MASTER_MODULE_TREE } from './constants/moduleTree.constants';

export interface PermissionCategoryDto {
  id: number;
  name: string;
  short_code: string;
  enable_view: boolean;
  enable_add: boolean;
  enable_edit: boolean;
  enable_delete: boolean;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface PermissionGroupDto {
  id: number;
  name: string;
  short_code: string;
  categories: PermissionCategoryDto[];
}

export interface RolePermissionAssignItem {
  perm_cat_id: number | string;
  can_view: boolean | number | string;
  can_add: boolean | number | string;
  can_edit: boolean | number | string;
  can_delete: boolean | number | string;
}

let hasEnsuredColumn = false;
async function ensurePermissionsJsonColumn() {
  if (hasEnsuredColumn) return;
  try {
    await execute(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions_json TEXT`);
    hasEnsuredColumn = true;
  } catch (e) {
    // Column already exists or error
  }
}

export class RolesService {
  /**
   * Get all roles with user count and module count
   */
  public static async getAllRoles() {
    await ensurePermissionsJsonColumn();

    const rolesSql = `
      SELECT 
        r.id,
        r.name,
        r.slug,
        r.is_active,
        r.is_system,
        r.is_superadmin,
        r.permissions_json,
        COALESCE(COUNT(DISTINCT sr.staff_id), 0) AS users_count,
        COALESCE(COUNT(DISTINCT pc.perm_group_id), 0) AS active_modules_count
      FROM roles r
      LEFT JOIN staff_roles sr ON sr.role_id = r.id
      LEFT JOIN roles_permissions rp ON rp.role_id = r.id AND (rp.can_view = 1 OR rp.can_add = 1 OR rp.can_edit = 1 OR rp.can_delete = 1)
      LEFT JOIN permission_category pc ON pc.id = rp.perm_cat_id
      GROUP BY r.id, r.name, r.slug, r.is_active, r.is_system, r.is_superadmin, r.permissions_json
      ORDER BY r.id ASC
    `;

    const [rows, permRows, totalGroupsRes] = await Promise.all([
      query(rolesSql),
      query(`
        SELECT 
          rp.role_id,
          rp.perm_cat_id,
          rp.can_view,
          rp.can_add,
          rp.can_edit,
          rp.can_delete,
          pc.name as cat_name,
          pc.short_code as cat_short_code,
          pg.name as group_name,
          pg.short_code as group_short_code
        FROM roles_permissions rp
        JOIN permission_category pc ON pc.id = rp.perm_cat_id
        JOIN permission_group pg ON pg.id = pc.perm_group_id
        WHERE pg.is_active = 1
      `).catch(() => []),
      queryOne(`SELECT COUNT(*) as total FROM permission_group WHERE is_active = 1`)
    ]);

    const totalGroups = Number(totalGroupsRes?.total || 0);

    return rows.map(r => {
      const isSuper = Number(r.id) === 7 || Number(r.is_superadmin) === 1 || r.slug === 'admin';
      const isSys = Number(r.is_system) === 1;
      const activeMods = Number(r.active_modules_count || 0);
      const userCount = Number(r.users_count || 0);

      let permissionsSummary = 'No Access';
      if (isSuper || (totalGroups > 0 && activeMods >= totalGroups)) {
        permissionsSummary = 'Full System Access';
      } else if (activeMods > 0) {
        permissionsSummary = `${activeMods} Modules Enabled`;
      }

      let modEnabled: Record<string, boolean> = {};
      let subModEnabled: Record<string, boolean> = {};
      let privileges: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean }> = {};

      let hasSavedMeta = false;
      if (r.permissions_json) {
        try {
          const parsed = typeof r.permissions_json === 'string' ? JSON.parse(r.permissions_json) : r.permissions_json;
          if (parsed && typeof parsed === 'object') {
            if (parsed.modEnabled && typeof parsed.modEnabled === 'object') {
              modEnabled = { ...parsed.modEnabled };
              hasSavedMeta = true;
            }
            if (parsed.subModEnabled && typeof parsed.subModEnabled === 'object') {
              subModEnabled = { ...parsed.subModEnabled };
              hasSavedMeta = true;
            }
            if (parsed.privileges && typeof parsed.privileges === 'object') {
              privileges = { ...parsed.privileges };
              hasSavedMeta = true;
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (isSuper) {
        MASTER_MODULE_TREE.forEach(m => {
          modEnabled[m.name] = true;
          m.subModules.forEach(s => {
            subModEnabled[s.name] = true;
            s.features.forEach(f => {
              privileges[f.key] = { view: true, add: true, edit: true, delete: true };
            });
          });
        });
      } else if (!hasSavedMeta) {
        const rolePerms = permRows.filter((p: any) => Number(p.role_id) === Number(r.id));
        const catMap = new Map<number, any>();
        rolePerms.forEach((p: any) => {
          catMap.set(Number(p.perm_cat_id), p);
        });

        MASTER_MODULE_TREE.forEach(m => {
          let hasModActive = false;
          m.subModules.forEach(s => {
            let hasSubActive = false;
            s.features.forEach(f => {
              if (f.perm_cat_id && catMap.has(f.perm_cat_id)) {
                const p = catMap.get(f.perm_cat_id);
                const canView = Boolean(Number(p.can_view));
                const canAdd = Boolean(Number(p.can_add));
                const canEdit = Boolean(Number(p.can_edit));
                const canDelete = Boolean(Number(p.can_delete));
                const isAny = canView || canAdd || canEdit || canDelete;
                privileges[f.key] = {
                  view: canView,
                  add: canAdd,
                  edit: canEdit,
                  delete: canDelete
                };
                if (isAny) {
                  hasSubActive = true;
                  hasModActive = true;
                }
              } else {
                privileges[f.key] = { view: false, add: false, edit: false, delete: false };
              }
            });
            subModEnabled[s.name] = hasSubActive;
          });
          modEnabled[m.name] = hasModActive;
        });
      }

      return {
        id: String(r.id),
        name: r.name,
        role: r.slug || r.name.toLowerCase().replace(/\s+/g, '_'),
        users: userCount,
        permissions: permissionsSummary,
        status: isSys || activeMods > 0 || Number(r.is_active) === 1 ? 'Active' : 'Inactive',
        is_active: r.is_active,
        is_system: r.is_system,
        is_superadmin: r.is_superadmin,
        modEnabled,
        subModEnabled,
        privileges
      };
    });
  }

  /**
   * Get dynamic permission tree for a given role_id
   */
  public static async getRolePermissionTree(roleId: number | string) {
    await ensurePermissionsJsonColumn();

    const role = await queryOne(`SELECT * FROM roles WHERE id = ?`, [Number(roleId)]);
    if (!role) {
      throw new Error(`Role with id ${roleId} not found`);
    }

    const rows = await query(`
      SELECT 
        pg.id AS group_id,
        pg.name AS group_name,
        pg.short_code AS group_short_code,
        pc.id AS category_id,
        pc.name AS category_name,
        pc.short_code AS category_short_code,
        pc.enable_view,
        pc.enable_add,
        pc.enable_edit,
        pc.enable_delete,
        rp.id AS roles_permissions_id,
        COALESCE(rp.can_view, 0) AS can_view,
        COALESCE(rp.can_add, 0) AS can_add,
        COALESCE(rp.can_edit, 0) AS can_edit,
        COALESCE(rp.can_delete, 0) AS can_delete
      FROM permission_group pg
      JOIN permission_category pc ON pc.perm_group_id = pg.id
      LEFT JOIN roles_permissions rp ON rp.perm_cat_id = pc.id AND rp.role_id = ?
      WHERE pg.is_active = 1
      ORDER BY pg.id ASC, pc.id ASC
    `, [Number(roleId)]);

    const groupMap = new Map<number, PermissionGroupDto>();

    for (const row of rows) {
      const gId = Number(row.group_id);
      if (!groupMap.has(gId)) {
        groupMap.set(gId, {
          id: gId,
          name: row.group_name,
          short_code: row.group_short_code,
          categories: []
        });
      }

      const isSuper = Number(role.id) === 7 || Number(role.is_superadmin) === 1;

      groupMap.get(gId)!.categories.push({
        id: Number(row.category_id),
        name: row.category_name,
        short_code: row.category_short_code,
        enable_view: Boolean(Number(row.enable_view)),
        enable_add: Boolean(Number(row.enable_add)),
        enable_edit: Boolean(Number(row.enable_edit)),
        enable_delete: Boolean(Number(row.enable_delete)),
        can_view: isSuper ? true : Boolean(Number(row.can_view)),
        can_add: isSuper ? true : Boolean(Number(row.can_add)),
        can_edit: isSuper ? true : Boolean(Number(row.can_edit)),
        can_delete: isSuper ? true : Boolean(Number(row.can_delete)),
      });
    }

    let parsedMeta: any = null;
    if (role.permissions_json) {
      try {
        parsedMeta = typeof role.permissions_json === 'string' ? JSON.parse(role.permissions_json) : role.permissions_json;
      } catch (e) {
        // ignore parse error
      }
    }

    return {
      role: {
        id: String(role.id),
        name: role.name,
        slug: role.slug || role.name.toLowerCase().replace(/\s+/g, '_'),
        is_system: Number(role.is_system) === 1,
        is_superadmin: Number(role.is_superadmin) === 1,
        is_active: Number(role.is_active) === 1,
      },
      meta: parsedMeta,
      groups: Array.from(groupMap.values())
    };
  }

  /**
   * Create a new custom role
   */
  public static async createRole(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Role name is required');
    }

    const existing = await queryOne(`SELECT id FROM roles WHERE LOWER(name) = LOWER(?)`, [trimmed]);
    if (existing) {
      throw new Error('A role with this name already exists');
    }

    const slug = trimmed.toLowerCase().replace(/\s+/g, '_');
    const result = await execute(
      `INSERT INTO roles (name, slug, is_active, is_system, is_superadmin) VALUES (?, ?, 1, 0, 0)`,
      [trimmed, slug]
    );

    return { id: String(result.insertId), name: trimmed, slug };
  }

  /**
   * Update role metadata
   */
  public static async updateRole(roleId: number | string, name?: string, is_active?: number | string | boolean) {
    const targetId = Number(roleId);
    const existing = await queryOne(`SELECT * FROM roles WHERE id = ?`, [targetId]);
    if (!existing) {
      throw new Error(`Role with id ${roleId} not found`);
    }

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Role name cannot be empty');
      if (Number(existing.is_system) === 1 && existing.name !== trimmed) {
        throw new Error('Cannot rename a built-in system role');
      }
      await execute(`UPDATE roles SET name = ? WHERE id = ?`, [trimmed, targetId]);
    }

    if (is_active !== undefined) {
      const activeVal = is_active === true || is_active === 1 || is_active === '1' ? 1 : 0;
      await execute(`UPDATE roles SET is_active = ? WHERE id = ?`, [activeVal, targetId]);
    }

    return { id: String(targetId) };
  }

  /**
   * Delete custom role
   */
  public static async deleteRole(roleId: number | string) {
    const targetId = Number(roleId);
    const existing = await queryOne(`SELECT * FROM roles WHERE id = ?`, [targetId]);
    if (!existing) {
      throw new Error(`Role with id ${roleId} not found`);
    }

    if (Number(existing.is_system) === 1 || targetId === 7) {
      throw new Error('Built-in system roles cannot be deleted');
    }

    return await transaction(async (conn) => {
      await conn.execute(`DELETE FROM staff_roles WHERE role_id = ?`, [targetId]);
      await conn.execute(`DELETE FROM roles_permissions WHERE role_id = ?`, [targetId]);
      await conn.execute(`DELETE FROM roles WHERE id = ?`, [targetId]);
      return { id: String(targetId), success: true };
    });
  }

  /**
   * Assign permissions to role using normalized roles_permissions table and meta JSON
   */
  public static async assignPermissions(
    roleId: number | string,
    permissions: RolePermissionAssignItem[],
    roleName?: string,
    meta?: {
      modEnabled?: Record<string, boolean>;
      subModEnabled?: Record<string, boolean>;
      privileges?: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean }>;
    }
  ) {
    await ensurePermissionsJsonColumn();

    const targetId = Number(roleId);
    const role = await queryOne(`SELECT * FROM roles WHERE id = ?`, [targetId]);
    if (!role) {
      throw new Error(`Role with id ${roleId} not found`);
    }

    return await transaction(async (conn) => {
      // If roleName is provided and role is not system, update name
      if (roleName && roleName.trim() && Number(role.is_system) === 0) {
        await conn.execute(`UPDATE roles SET name = ? WHERE id = ?`, [roleName.trim(), targetId]);
      }

      // Persist full fine-grained toggle matrix if provided
      if (meta && (meta.modEnabled || meta.subModEnabled || meta.privileges)) {
        const metaStr = JSON.stringify({
          modEnabled: meta.modEnabled || {},
          subModEnabled: meta.subModEnabled || {},
          privileges: meta.privileges || {}
        });
        await conn.execute(`UPDATE roles SET permissions_json = ? WHERE id = ?`, [metaStr, targetId]);
      }

      // Delete existing permissions for role
      await conn.execute(`DELETE FROM roles_permissions WHERE role_id = ?`, [targetId]);

      // Filter and insert only rows where at least one privilege is true/1
      const validToInsert = (permissions || []).filter(p => {
        const v = p.can_view === true || p.can_view === 1 || p.can_view === '1';
        const a = p.can_add === true || p.can_add === 1 || p.can_add === '1';
        const e = p.can_edit === true || p.can_edit === 1 || p.can_edit === '1';
        const d = p.can_delete === true || p.can_delete === 1 || p.can_delete === '1';
        return v || a || e || d;
      });

      for (const p of validToInsert) {
        const catId = Number(p.perm_cat_id);
        const canView = p.can_view === true || p.can_view === 1 || p.can_view === '1' ? 1 : 0;
        const canAdd = p.can_add === true || p.can_add === 1 || p.can_add === '1' ? 1 : 0;
        const canEdit = p.can_edit === true || p.can_edit === 1 || p.can_edit === '1' ? 1 : 0;
        const canDelete = p.can_delete === true || p.can_delete === 1 || p.can_delete === '1' ? 1 : 0;

        if (!isNaN(catId) && catId > 0) {
          await conn.execute(
            `INSERT INTO roles_permissions (role_id, perm_cat_id, can_view, can_add, can_edit, can_delete, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [targetId, catId, canView, canAdd, canEdit, canDelete]
          );
        }
      }

      return {
        role_id: String(targetId),
        assigned_count: validToInsert.length,
      };
    });
  }
}
