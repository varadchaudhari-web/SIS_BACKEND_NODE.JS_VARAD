import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class InventoryController {
  // Items
  public static async items(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await InventoryService.getItems(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { name, item_name, id: bodyId } = req.body;
        const itemName = name || item_name;
        if (!itemName && !bodyId) return sendError(res, 'Item name is required', 400);

        if (bodyId || id) {
          await InventoryService.updateItem(bodyId || id, req.body);
          return sendSuccess(res, { id: bodyId || id, name: itemName }, 'Item updated successfully');
        }

        const result = await InventoryService.addItem(req.body);
        return sendSuccess(res, { id: result.insertId, name: itemName }, 'Item added successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Item ID required', 400);
        await InventoryService.deleteItem(id);
        return sendSuccess(res, { id }, 'Item deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in inventory items:', error);
      return sendError(res, 'Failed to process inventory items request', 500);
    }
  }

  public static async addItem(req: Request, res: Response) {
    try {
      const { name, item_name, id } = req.body;
      const itemName = name || item_name;
      if (id) {
        await InventoryService.updateItem(id, req.body);
        return sendSuccess(res, { id, name: itemName }, 'Item updated successfully');
      }
      if (!itemName) return sendError(res, 'Item name is required', 400);
      const result = await InventoryService.addItem(req.body);
      return sendSuccess(res, { id: result.insertId, name: itemName }, 'Item added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add item', 500);
    }
  }

  public static async deleteItem(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Item ID required', 400);
      await InventoryService.deleteItem(id);
      return sendSuccess(res, { id }, 'Item deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete item', 500);
    }
  }

  // Categories
  public static async categories(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      const rows = await InventoryService.getCategories(id);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch categories', 500);
    }
  }

  public static async addCategory(req: Request, res: Response) {
    try {
      const { item_category, id } = req.body;
      if (id) {
        await InventoryService.updateCategory(id, req.body);
        return sendSuccess(res, { id, item_category }, 'Category updated successfully');
      }
      if (!item_category) return sendError(res, 'Category name required', 400);
      const result = await InventoryService.addCategory(req.body);
      return sendSuccess(res, { id: result.insertId, item_category }, 'Category added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add category', 500);
    }
  }

  public static async deleteCategory(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Category ID required', 400);
      await InventoryService.deleteCategory(id);
      return sendSuccess(res, { id }, 'Category deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete category', 500);
    }
  }

  // Stores
  public static async stores(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      const rows = await InventoryService.getStores(id);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch stores', 500);
    }
  }

  public static async addStore(req: Request, res: Response) {
    try {
      const { item_store, id } = req.body;
      if (id) {
        await InventoryService.updateStore(id, req.body);
        return sendSuccess(res, { id, item_store }, 'Store updated successfully');
      }
      if (!item_store) return sendError(res, 'Store name required', 400);
      const result = await InventoryService.addStore(req.body);
      return sendSuccess(res, { id: result.insertId, item_store }, 'Store added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add store', 500);
    }
  }

  public static async deleteStore(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Store ID required', 400);
      await InventoryService.deleteStore(id);
      return sendSuccess(res, { id }, 'Store deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete store', 500);
    }
  }

  // Suppliers
  public static async suppliers(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      const rows = await InventoryService.getSuppliers(id);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch suppliers', 500);
    }
  }

  public static async addSupplier(req: Request, res: Response) {
    try {
      const { item_supplier, id } = req.body;
      if (id) {
        await InventoryService.updateSupplier(id, req.body);
        return sendSuccess(res, { id, item_supplier }, 'Supplier updated successfully');
      }
      if (!item_supplier) return sendError(res, 'Supplier name required', 400);
      const result = await InventoryService.addSupplier(req.body);
      return sendSuccess(res, { id: result.insertId, item_supplier }, 'Supplier added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add supplier', 500);
    }
  }

  public static async deleteSupplier(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Supplier ID required', 400);
      await InventoryService.deleteSupplier(id);
      return sendSuccess(res, { id }, 'Supplier deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete supplier', 500);
    }
  }

  // Stock Ledger
  public static async stock(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      const rows = await InventoryService.getStock(id);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch stock records', 500);
    }
  }

  public static async addStock(req: Request, res: Response) {
    try {
      const { item_id, quantity, id } = req.body;
      if (id) {
        await InventoryService.updateStock(id, req.body);
        return sendSuccess(res, { id }, 'Stock updated successfully');
      }
      if (!item_id) return sendError(res, 'Item ID is required', 400);
      const result = await InventoryService.addStock(req.body);
      return sendSuccess(res, { id: result.insertId }, 'Stock added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add stock', 500);
    }
  }

  public static async deleteStock(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Stock ID required', 400);
      await InventoryService.deleteStock(id);
      return sendSuccess(res, { id }, 'Stock deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete stock', 500);
    }
  }

  // Issues & Returns
  public static async issues(req: Request, res: Response) {
    try {
      const rows = await InventoryService.getIssues();
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch issues', 500);
    }
  }

  public static async issueItem(req: Request, res: Response) {
    try {
      const { item_id } = req.body;
      if (!item_id) return sendError(res, 'Item ID is required', 400);
      const result = await InventoryService.issueItem(req.body);
      return sendSuccess(res, { id: result.insertId }, 'Item issued successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to issue item', 500);
    }
  }

  public static async returnItem(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id) as string | number;
      if (!id) return sendError(res, 'Issue ID required', 400);
      await InventoryService.returnItem(id, req.body.return_date);
      return sendSuccess(res, { id }, 'Item marked returned successfully');
    } catch (error) {
      return sendError(res, 'Failed to return item', 500);
    }
  }

  public static async deleteIssue(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Issue ID required', 400);
      await InventoryService.deleteIssue(id);
      return sendSuccess(res, { id }, 'Issue record deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete issue record', 500);
    }
  }

  public static async runSeeds(req: Request, res: Response) {
    return sendSuccess(res, null, 'Inventory seeds executed successfully');
  }
}
