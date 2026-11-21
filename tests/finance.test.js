import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCE_SPREADSHEET_TITLE,
  FINANCE_SCHEMAS,
  SHEET_NAMES,
  getSpreadsheetUrl,
  getFinanceConnectionStatus
} from '../server/finance-service.js';
import {
  getSetting,
  setSetting,
  deleteSetting,
  getAllSettings
} from '../server/finance-db.js';

test('FINANCE_SPREADSHEET_TITLE is accurate', () => {
  assert.equal(FINANCE_SPREADSHEET_TITLE, 'My JEE Mentor – Finance Management');
});

test('FINANCE_SCHEMAS defines all 6 required worksheets with headers', () => {
  const expectedSheets = [
    'Expenses',
    'Salaries',
    'Employees',
    'OtherIncome',
    'Categories',
    'AuditLog'
  ];

  assert.deepEqual(SHEET_NAMES, expectedSheets);

  for (const sheetName of expectedSheets) {
    const schema = FINANCE_SCHEMAS[sheetName];
    assert.ok(schema, `Schema for ${sheetName} should exist`);
    assert.ok(Array.isArray(schema.headers), `${sheetName} headers should be an array`);
    assert.ok(schema.headers.length >= 5, `${sheetName} should have at least 5 columns`);
  }

  // Check specific essential headers
  assert.ok(FINANCE_SCHEMAS.Expenses.headers.includes('Expense ID'));
  assert.ok(FINANCE_SCHEMAS.Expenses.headers.includes('Amount (₹)'));
  assert.ok(FINANCE_SCHEMAS.Salaries.headers.includes('Salary ID'));
  assert.ok(FINANCE_SCHEMAS.Salaries.headers.includes('Net Paid (₹)'));
  assert.ok(FINANCE_SCHEMAS.Employees.headers.includes('Employee ID'));
  assert.ok(FINANCE_SCHEMAS.Employees.headers.includes('Monthly Salary (₹)'));
  assert.ok(FINANCE_SCHEMAS.OtherIncome.headers.includes('Income ID'));
  assert.ok(FINANCE_SCHEMAS.OtherIncome.headers.includes('Amount (₹)'));
  assert.ok(FINANCE_SCHEMAS.Categories.headers.includes('Category ID'));
  assert.ok(FINANCE_SCHEMAS.AuditLog.headers.includes('Log ID'));
});

test('Categories schema contains 10 default seeded categories', () => {
  const categories = FINANCE_SCHEMAS.Categories.initialRows;
  assert.ok(Array.isArray(categories));
  assert.equal(categories.length, 10);

  // Check Expense and Income category types
  const expenseCats = categories.filter(c => c[1] === 'Expense');
  const incomeCats = categories.filter(c => c[1] === 'Income');
  assert.equal(expenseCats.length, 7);
  assert.equal(incomeCats.length, 3);
});

test('AuditLog schema contains initial setup entry', () => {
  const initialAudit = FINANCE_SCHEMAS.AuditLog.initialRows;
  assert.ok(Array.isArray(initialAudit));
  assert.equal(initialAudit.length, 1);
  assert.equal(initialAudit[0][0], 'LOG-0001');
  assert.equal(initialAudit[0][3], 'INITIALIZE_SPREADSHEET');
});

test('getSpreadsheetUrl generates correct Google Sheets URL', () => {
  const testId = '1AbCdEfGhIjKlMnOpQrStUvWxYz';
  assert.equal(
    getSpreadsheetUrl(testId),
    'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit'
  );
  assert.equal(getSpreadsheetUrl(''), '');
  assert.equal(getSpreadsheetUrl(null), '');
});

test('finance-db handles set, get, getAll, and delete operations', () => {
  const testKey = 'test_finance_key_' + Date.now();
  const testVal = 'test_value_' + Math.random();

  // Test set
  const saved = setSetting(testKey, testVal);
  assert.equal(saved, true);

  // Test get
  const retrieved = getSetting(testKey);
  assert.equal(retrieved, testVal);

  // Test default value
  const missing = getSetting('non_existent_random_key_xyz', 'fallback');
  assert.equal(missing, 'fallback');

  // Test getAllSettings
  const all = getAllSettings();
  assert.equal(all[testKey], testVal);

  // Test delete
  const deleted = deleteSetting(testKey);
  assert.equal(deleted, true);
  assert.equal(getSetting(testKey), null);
});

test('getFinanceConnectionStatus returns comprehensive status object', async () => {
  const status = await getFinanceConnectionStatus();

  assert.ok(status);
  assert.ok(typeof status.status === 'string');
  assert.ok(['Connected', 'Not Connected', 'Setup Required', 'Sync Error'].includes(status.status));
  assert.ok(Array.isArray(status.sheetNames));
  assert.equal(status.sheetNames.length, 6);
  assert.ok(typeof status.feeSheet === 'object');
  assert.ok(typeof status.feeSheet.connected === 'boolean');
  assert.equal(status.feeSheet.readOnly, true);
});
