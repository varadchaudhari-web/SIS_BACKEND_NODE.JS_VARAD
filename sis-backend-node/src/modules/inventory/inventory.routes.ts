import { Router } from 'express';
import { InventoryController } from './inventory.controller';

const router = Router();

// Items
router.all('/items', InventoryController.items);
router.all('/items/:id', InventoryController.items);
router.post('/add_item', InventoryController.addItem);
router.post('/delete_item', InventoryController.deleteItem);
router.delete('/delete_item/:id', InventoryController.deleteItem);

// Categories
router.all('/categories', InventoryController.categories);
router.all('/categories/:id', InventoryController.categories);
router.post('/add_category', InventoryController.addCategory);
router.post('/delete_category', InventoryController.deleteCategory);
router.delete('/delete_category/:id', InventoryController.deleteCategory);

// Stores
router.all('/stores', InventoryController.stores);
router.all('/stores/:id', InventoryController.stores);
router.post('/add_store', InventoryController.addStore);
router.post('/delete_store', InventoryController.deleteStore);
router.delete('/delete_store/:id', InventoryController.deleteStore);

// Suppliers
router.all('/suppliers', InventoryController.suppliers);
router.all('/suppliers/:id', InventoryController.suppliers);
router.post('/add_supplier', InventoryController.addSupplier);
router.post('/delete_supplier', InventoryController.deleteSupplier);
router.delete('/delete_supplier/:id', InventoryController.deleteSupplier);

// Stock
router.all('/stock', InventoryController.stock);
router.all('/stock/:id', InventoryController.stock);
router.post('/add_stock', InventoryController.addStock);
router.post('/delete_stock', InventoryController.deleteStock);
router.delete('/delete_stock/:id', InventoryController.deleteStock);

// Issues & Returns
router.all('/issues', InventoryController.issues);
router.post('/issue_item', InventoryController.issueItem);
router.post('/return_item', InventoryController.returnItem);
router.post('/delete_issue', InventoryController.deleteIssue);
router.delete('/delete_issue/:id', InventoryController.deleteIssue);

// Seeds
router.post('/run_seeds', InventoryController.runSeeds);
router.all('/', InventoryController.items);

export const inventoryRoutes = router;
