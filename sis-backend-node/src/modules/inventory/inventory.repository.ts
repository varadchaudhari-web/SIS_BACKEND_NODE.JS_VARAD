import { query, queryOne, execute } from '../../config/database';

export class InventoryRepository {
  // Items
  static async getItems(id?: any) {
    if (id) {
      return await queryOne(`
        SELECT i.*, ic.item_category,
               COALESCE((SELECT SUM(quantity) FROM item_stock WHERE item_id = i.id), 0) as total_stock,
               COALESCE((SELECT SUM(quantity) FROM item_issue WHERE item_id = i.id AND is_returned = 0), 0) as issued_stock,
               (COALESCE((SELECT SUM(quantity) FROM item_stock WHERE item_id = i.id), 0) - COALESCE((SELECT SUM(quantity) FROM item_issue WHERE item_id = i.id AND is_returned = 0), 0)) as available_stock
        FROM item i
        LEFT JOIN item_category ic ON ic.id = i.item_category_id
        WHERE i.id = ?
      `, [id]);
    }
    return await query(`
      SELECT i.*, ic.item_category,
             COALESCE((SELECT SUM(quantity) FROM item_stock WHERE item_id = i.id), 0) as total_stock,
             COALESCE((SELECT SUM(quantity) FROM item_issue WHERE item_id = i.id AND is_returned = 0), 0) as issued_stock,
             (COALESCE((SELECT SUM(quantity) FROM item_stock WHERE item_id = i.id), 0) - COALESCE((SELECT SUM(quantity) FROM item_issue WHERE item_id = i.id AND is_returned = 0), 0)) as available_stock
      FROM item i
      LEFT JOIN item_category ic ON ic.id = i.item_category_id
      ORDER BY i.id DESC
    `);
  }

  static async addItem(data: any) {
    return await execute(`
      INSERT INTO item (name, item_category_id, unit, description, item_store_id, item_supplier_id, quantity, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.name || data.item_name,
      data.item_category_id || 1,
      data.unit || 'pcs',
      data.description || '',
      data.item_store_id || null,
      data.item_supplier_id || null,
      data.quantity || 0,
      data.date || new Date().toISOString().split('T')[0]
    ]);
  }

  static async updateItem(id: any, data: any) {
    return await execute(`
      UPDATE item
      SET name = COALESCE(?, name),
          item_category_id = COALESCE(?, item_category_id),
          unit = COALESCE(?, unit),
          description = COALESCE(?, description),
          item_store_id = COALESCE(?, item_store_id),
          item_supplier_id = COALESCE(?, item_supplier_id)
      WHERE id = ?
    `, [data.name || data.item_name, data.item_category_id, data.unit, data.description, data.item_store_id, data.item_supplier_id, id]);
  }

  static async deleteItem(id: any) {
    return await execute(`DELETE FROM item WHERE id = ?`, [id]);
  }

  // Categories
  static async getCategories(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM item_category WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM item_category ORDER BY item_category ASC`);
  }

  static async addCategory(data: { item_category: string; description?: string }) {
    return await execute(`
      INSERT INTO item_category (item_category, description, is_active)
      VALUES (?, ?, 'yes')
    `, [data.item_category, data.description || '']);
  }

  static async updateCategory(id: any, data: { item_category?: string; description?: string }) {
    return await execute(`
      UPDATE item_category
      SET item_category = COALESCE(?, item_category),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [data.item_category, data.description, id]);
  }

  static async deleteCategory(id: any) {
    return await execute(`DELETE FROM item_category WHERE id = ?`, [id]);
  }

  // Stores
  static async getStores(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM item_store WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM item_store ORDER BY item_store ASC`);
  }

  static async addStore(data: { item_store: string; code?: string; description?: string }) {
    return await execute(`
      INSERT INTO item_store (item_store, code, description)
      VALUES (?, ?, ?)
    `, [data.item_store, data.code || '', data.description || '']);
  }

  static async updateStore(id: any, data: any) {
    return await execute(`
      UPDATE item_store
      SET item_store = COALESCE(?, item_store),
          code = COALESCE(?, code),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [data.item_store, data.code, data.description, id]);
  }

  static async deleteStore(id: any) {
    return await execute(`DELETE FROM item_store WHERE id = ?`, [id]);
  }

  // Suppliers
  static async getSuppliers(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM item_supplier WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM item_supplier ORDER BY item_supplier ASC`);
  }

  static async addSupplier(data: any) {
    return await execute(`
      INSERT INTO item_supplier (item_supplier, phone, email, address, contact_person_name, contact_person_phone, contact_person_email, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.item_supplier,
      data.phone || '',
      data.email || '',
      data.address || '',
      data.contact_person_name || '',
      data.contact_person_phone || '',
      data.contact_person_email || '',
      data.description || ''
    ]);
  }

  static async updateSupplier(id: any, data: any) {
    return await execute(`
      UPDATE item_supplier
      SET item_supplier = COALESCE(?, item_supplier),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          contact_person_name = COALESCE(?, contact_person_name),
          contact_person_phone = COALESCE(?, contact_person_phone),
          contact_person_email = COALESCE(?, contact_person_email),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [
      data.item_supplier,
      data.phone,
      data.email,
      data.address,
      data.contact_person_name,
      data.contact_person_phone,
      data.contact_person_email,
      data.description,
      id
    ]);
  }

  static async deleteSupplier(id: any) {
    return await execute(`DELETE FROM item_supplier WHERE id = ?`, [id]);
  }

  // Stock
  static async getStock(id?: any) {
    let sql = `
      SELECT s.*, i.name as item_name, ic.item_category, sup.item_supplier as supplier_name, st.item_store as store_name
      FROM item_stock s
      JOIN item i ON i.id = s.item_id
      LEFT JOIN item_category ic ON ic.id = i.item_category_id
      LEFT JOIN item_supplier sup ON sup.id = s.supplier_id
      LEFT JOIN item_store st ON st.id = s.store_id
    `;
    if (id) {
      sql += ` WHERE s.id = ?`;
      return await queryOne(sql, [id]);
    }
    sql += ` ORDER BY s.id DESC`;
    return await query(sql);
  }

  static async addStock(data: any) {
    return await execute(`
      INSERT INTO item_stock (item_id, supplier_id, store_id, quantity, purchase_price, date, attachment, description, symbol, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '+', 'yes')
    `, [
      data.item_id,
      data.supplier_id || null,
      data.store_id || null,
      data.quantity || 1,
      data.purchase_price || '0',
      data.date || new Date().toISOString().split('T')[0],
      data.attachment || '',
      data.description || ''
    ]);
  }

  static async updateStock(id: any, data: any) {
    return await execute(`
      UPDATE item_stock
      SET item_id = COALESCE(?, item_id),
          supplier_id = COALESCE(?, supplier_id),
          store_id = COALESCE(?, store_id),
          quantity = COALESCE(?, quantity),
          purchase_price = COALESCE(?, purchase_price),
          date = COALESCE(?, date),
          attachment = COALESCE(?, attachment),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [data.item_id, data.supplier_id, data.store_id, data.quantity, data.purchase_price, data.date, data.attachment, data.description, id]);
  }

  static async deleteStock(id: any) {
    return await execute(`DELETE FROM item_stock WHERE id = ?`, [id]);
  }

  // Issues & Returns
  static async getIssues() {
    return await query(`
      SELECT iss.*, i.name as item_name, ic.item_category
      FROM item_issue iss
      JOIN item i ON i.id = iss.item_id
      LEFT JOIN item_category ic ON ic.id = iss.item_category_id
      ORDER BY iss.id DESC
    `);
  }

  static async issueItem(data: any) {
    return await execute(`
      INSERT INTO item_issue (issue_type, issue_to, issue_by, issue_date, return_date, item_category_id, item_id, quantity, note, is_returned, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'yes')
    `, [
      data.issue_type || 'student',
      data.issue_to || '',
      data.issue_by || 'Admin',
      data.issue_date || new Date().toISOString().split('T')[0],
      data.return_date || null,
      data.item_category_id || 1,
      data.item_id,
      data.quantity || 1,
      data.note || ''
    ]);
  }

  static async returnItem(id: any, returnDate?: string) {
    return await execute(`
      UPDATE item_issue
      SET is_returned = 1, return_date = ?
      WHERE id = ?
    `, [returnDate || new Date().toISOString().split('T')[0], id]);
  }

  static async deleteIssue(id: any) {
    return await execute(`DELETE FROM item_issue WHERE id = ?`, [id]);
  }
}
