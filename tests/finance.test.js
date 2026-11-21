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
import {
  isPasswordConfigured,
  setAdminPassword,
  verifyAdminPassword,
  hasAdminSession,
  makeSessionCookie,
  clearSessionCookie
} from '../server/admin-auth.js';
import { handleFinanceRequest } from '../api/_finance-handler.js';

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

test('Admin Auth: First-time setup, PBKDF2 hashing, and verification', () => {
  // Clear any existing test passwords first
  deleteSetting('admin_password_hash');
  deleteSetting('admin_password_salt');
  deleteSetting('admin_session_secret');

  assert.equal(isPasswordConfigured(), false);

  // Reject too-short password (< 8 chars)
  assert.throws(() => {
    setAdminPassword('short');
  }, /at least 8 characters/);

  // Successfully set a strong password
  const testPass = 'AdminSecret@2026';
  const success = setAdminPassword(testPass, '127.0.0.1');
  assert.equal(success, true);
  assert.equal(isPasswordConfigured(), true);

  // Verify hash and salt were stored in settings
  const hash = getSetting('admin_password_hash');
  const salt = getSetting('admin_password_salt');
  assert.ok(hash && hash.length === 128); // 64 bytes hex
  assert.ok(salt && salt.length === 64);  // 32 bytes hex

  // Verify correct password succeeds
  assert.equal(verifyAdminPassword(testPass), true);

  // Verify incorrect password fails
  assert.equal(verifyAdminPassword('WrongPassword123'), false);
  assert.equal(verifyAdminPassword(''), false);

  // Verify overwrite protection (cannot call setAdminPassword again once configured)
  assert.throws(() => {
    setAdminPassword('AnotherPassword2026', '127.0.0.1');
  }, /already been configured/);
});

test('Admin Auth: Session cookie creation, signing, and verification', () => {
  const cookieHeader = makeSessionCookie();
  assert.ok(cookieHeader.includes('mjm_fees_admin='));
  assert.ok(cookieHeader.includes('HttpOnly'));
  assert.ok(cookieHeader.includes('Max-Age=14400'));

  // Extract token from Set-Cookie header
  const token = cookieHeader.split(';')[0].replace('mjm_fees_admin=', '');

  // Valid session request
  const validReq = new Request('https://www.myjeementor.com/api/finance', {
    headers: { cookie: `mjm_fees_admin=${token}` }
  });
  assert.equal(hasAdminSession(validReq), true);

  // Tampered token request
  const tamperedReq = new Request('https://www.myjeementor.com/api/finance', {
    headers: { cookie: `mjm_fees_admin=${token}tampered` }
  });
  assert.equal(hasAdminSession(tamperedReq), false);

  // No cookie request
  const noCookieReq = new Request('https://www.myjeementor.com/api/finance');
  assert.equal(hasAdminSession(noCookieReq), false);

  // Clear cookie header
  const clearHeader = clearSessionCookie();
  assert.ok(clearHeader.includes('Max-Age=0'));
});

test('handleFinanceRequest: Auth status check and protected actions', async () => {
  // Test public auth-status action
  const statusReq = new Request('https://www.myjeementor.com/api/finance?action=auth-status');
  const statusRes = await handleFinanceRequest(statusReq);
  const statusData = await statusRes.json();
  assert.equal(statusRes.status, 200);
  assert.equal(statusData.ok, true);
  assert.equal(statusData.isSetupRequired, false); // because we set password in previous test

  // Test unauthorized request to protected endpoint (summary)
  const unauthReq = new Request('https://www.myjeementor.com/api/finance?action=summary');
  const unauthRes = await handleFinanceRequest(unauthReq);
  assert.equal(unauthRes.status, 401);
  const unauthData = await unauthRes.json();
  assert.equal(unauthData.code, 'AUTH_REQUIRED');

  // Test authorized request with session cookie
  const cookieHeader = makeSessionCookie();
  const token = cookieHeader.split(';')[0].replace('mjm_fees_admin=', '');
  const authReq = new Request('https://www.myjeementor.com/api/finance?action=summary', {
    headers: { cookie: `mjm_fees_admin=${token}` }
  });
  const authRes = await handleFinanceRequest(authReq);
  assert.equal(authRes.status, 200);
  const authData = await authRes.json();
  assert.equal(authData.ok, true);
  assert.ok(authData.revenue);

  // Clean up test credentials so storage stays pristine
  deleteSetting('admin_password_hash');
  deleteSetting('admin_password_salt');
  deleteSetting('admin_session_secret');
  deleteSetting('admin_password_created_at');
});
