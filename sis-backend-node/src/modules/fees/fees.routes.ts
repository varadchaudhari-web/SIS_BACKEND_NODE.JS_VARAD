import { Router } from 'express';
import { FeesController } from './fees.controller';
import { FinanceController } from './finance.controller';
import { upload } from '../../middlewares/upload.middleware';

const feesRouter = Router();

// ==========================================
// 1. FEES GROUPS
// ==========================================
feesRouter.all('/fees-groups', FeesController.feeGroups);
feesRouter.all('/fees-groups/:id', FeesController.feeGroups);
feesRouter.all('/fees_groups', FeesController.feeGroups);
feesRouter.all('/fees_groups/:id', FeesController.feeGroups);
feesRouter.all('/feegroup', FeesController.feeGroups);
feesRouter.all('/feegroup/:id', FeesController.feeGroups);

// ==========================================
// 2. FEES TYPES
// ==========================================
feesRouter.all('/fees-type', FeesController.feeTypes);
feesRouter.all('/fees-type/:id', FeesController.feeTypes);
feesRouter.all('/fees_type', FeesController.feeTypes);
feesRouter.all('/fees_type/:id', FeesController.feeTypes);
feesRouter.all('/feetype', FeesController.feeTypes);
feesRouter.all('/feetype/:id', FeesController.feeTypes);

// ==========================================
// 3. FEES MASTER
// ==========================================
feesRouter.all('/fees-master', FeesController.feeMasters);
feesRouter.all('/fees-master/:id', FeesController.feeMasters);
feesRouter.all('/fees_master', FeesController.feeMasters);
feesRouter.all('/fees_master/:id', FeesController.feeMasters);
feesRouter.all('/feemaster', FeesController.feeMasters);
feesRouter.all('/feemaster/:id', FeesController.feeMasters);

// ==========================================
// 4. COLLECT FEES
// ==========================================
feesRouter.all('/collect-fees', FeesController.collectFees);
feesRouter.all('/collect_fees', FeesController.collectFees);
feesRouter.all('/collect', FeesController.collectFees);

// ==========================================
// 5. SEARCH PAYMENTS & DUE FEES
// ==========================================
feesRouter.get('/search-fees-payment', FeesController.searchFeesPayment);
feesRouter.get('/search_fees_payment', FeesController.searchFeesPayment);
feesRouter.get('/search-due-fees', FeesController.searchDueFees);
feesRouter.get('/search_due_fees', FeesController.searchDueFees);

// ==========================================
// 6. FEES DISCOUNT & ASSIGNMENT
// ==========================================
feesRouter.all('/fees-discount', FeesController.feeDiscounts);
feesRouter.all('/fees-discount/:id', FeesController.feeDiscounts);
feesRouter.all('/fees_discount', FeesController.feeDiscounts);
feesRouter.all('/fees_discount/:id', FeesController.feeDiscounts);
feesRouter.all('/fees-discount-assign', FeesController.feeDiscountAssign);
feesRouter.all('/fees_discount_assign', FeesController.feeDiscountAssign);

// ==========================================
// 7. CARRY FORWARD
// ==========================================
feesRouter.all('/fees-carry-forward', FeesController.feesCarryForward);
feesRouter.all('/fees_carry_forward', FeesController.feesCarryForward);

// ==========================================
// 8. FEES REMINDERS & BULK ALERTS
// ==========================================
feesRouter.all('/fees-reminder', FeesController.feesReminder);
feesRouter.all('/fees-reminder/:id', FeesController.feesReminder);
feesRouter.all('/fees_reminder', FeesController.feesReminder);
feesRouter.all('/fees_reminder/:id', FeesController.feesReminder);
feesRouter.post('/send_bulk_fees_email_reminder', FeesController.sendBulkFeeReminder);
feesRouter.post('/send_bulk_fee_reminder', FeesController.sendBulkFeeReminder);

// ==========================================
// 9. FEES RECEIPT & EMAIL
// ==========================================
feesRouter.all('/fees-receipt', FeesController.feesReceipt);
feesRouter.all('/fees-receipt/:id', FeesController.feesReceipt);
feesRouter.all('/fees-receipt/:id/:inv_no', FeesController.feesReceipt);
feesRouter.all('/fees_receipt', FeesController.feesReceipt);
feesRouter.all('/fees_receipt/:id', FeesController.feesReceipt);
feesRouter.all('/fees_receipt/:id/:inv_no', FeesController.feesReceipt);
feesRouter.post('/send_receipt_email', FeesController.sendReceiptEmail);

// ==========================================
// 10. DASHBOARD SUMMARY
// ==========================================
feesRouter.get('/dashboard-summary', FeesController.dashboardSummary);
feesRouter.get('/dashboard_summary', FeesController.dashboardSummary);

export const feesRoutes = feesRouter;

// ==========================================
// FINANCE: INCOME ROUTES
// ==========================================
export const incomeRouter = Router();

// Income Heads
incomeRouter.all('/setup/income-heads', FinanceController.incomeHeads);
incomeRouter.all('/setup/income-heads/:id', FinanceController.incomeHeads);
incomeRouter.all('/heads', FinanceController.incomeHeads);
incomeRouter.all('/heads/:id', FinanceController.incomeHeads);
incomeRouter.all('/list_heads', FinanceController.incomeHeads);

// Income Search
incomeRouter.post('/search', FinanceController.searchIncome);

// Core Income Transactions
incomeRouter.get('/', FinanceController.income);
incomeRouter.post('/', upload.single('documents'), FinanceController.income);
incomeRouter.get('/:id', FinanceController.income);
incomeRouter.put('/:id', upload.single('documents'), FinanceController.income);
incomeRouter.delete('/:id', FinanceController.income);

// ==========================================
// FINANCE: EXPENSE ROUTES
// ==========================================
export const expenseRouter = Router();

// Expense Heads
expenseRouter.all('/setup/expense-heads', FinanceController.expenseHeads);
expenseRouter.all('/setup/expense-heads/:id', FinanceController.expenseHeads);
expenseRouter.all('/heads', FinanceController.expenseHeads);
expenseRouter.all('/heads/:id', FinanceController.expenseHeads);
expenseRouter.all('/list_heads', FinanceController.expenseHeads);

// Expense Search
expenseRouter.post('/search', FinanceController.searchExpense);

// Core Expense Transactions
expenseRouter.get('/', FinanceController.expense);
expenseRouter.post('/', upload.single('documents'), FinanceController.expense);
expenseRouter.get('/:id', FinanceController.expense);
expenseRouter.put('/:id', upload.single('documents'), FinanceController.expense);
expenseRouter.delete('/:id', FinanceController.expense);
