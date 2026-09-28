import { InventoryRepository } from './inventory.repository';

export class InventoryService {
  // Items
  static async getItems(id?: any) {
    return await InventoryRepository.getItems(id);
  }

  static async addItem(data: any) {
    return await InventoryRepository.addItem(data);
  }

  static async updateItem(id: any, data: any) {
    return await InventoryRepository.updateItem(id, data);
  }

  static async deleteItem(id: any) {
    return await InventoryRepository.deleteItem(id);
  }

  // Categories
  static async getCategories(id?: any) {
    return await InventoryRepository.getCategories(id);
  }

  static async addCategory(data: { item_category: string; description?: string }) {
    return await InventoryRepository.addCategory(data);
  }

  static async updateCategory(id: any, data: any) {
    return await InventoryRepository.updateCategory(id, data);
  }

  static async deleteCategory(id: any) {
    return await InventoryRepository.deleteCategory(id);
  }

  // Stores
  static async getStores(id?: any) {
    return await InventoryRepository.getStores(id);
  }

  static async addStore(data: { item_store: string; code?: string; description?: string }) {
    return await InventoryRepository.addStore(data);
  }

  static async updateStore(id: any, data: any) {
    return await InventoryRepository.updateStore(id, data);
  }

  static async deleteStore(id: any) {
    return await InventoryRepository.deleteStore(id);
  }

  // Suppliers
  static async getSuppliers(id?: any) {
    return await InventoryRepository.getSuppliers(id);
  }

  static async addSupplier(data: any) {
    return await InventoryRepository.addSupplier(data);
  }

  static async updateSupplier(id: any, data: any) {
    return await InventoryRepository.updateSupplier(id, data);
  }

  static async deleteSupplier(id: any) {
    return await InventoryRepository.deleteSupplier(id);
  }

  // Stock
  static async getStock(id?: any) {
    return await InventoryRepository.getStock(id);
  }

  static async addStock(data: any) {
    return await InventoryRepository.addStock(data);
  }

  static async updateStock(id: any, data: any) {
    return await InventoryRepository.updateStock(id, data);
  }

  static async deleteStock(id: any) {
    return await InventoryRepository.deleteStock(id);
  }

  // Issues & Returns
  static async getIssues() {
    return await InventoryRepository.getIssues();
  }

  static async issueItem(data: any) {
    return await InventoryRepository.issueItem(data);
  }

  static async returnItem(id: any, returnDate?: string) {
    return await InventoryRepository.returnItem(id, returnDate);
  }

  static async deleteIssue(id: any) {
    return await InventoryRepository.deleteIssue(id);
  }
}
