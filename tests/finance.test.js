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
  FINANCE_COOKIE,
  getFinanceEnvPassword,
  isFinancePasswordConfigured,
  setFinancePassword,
  verifyFinancePassword,
  hasFinanceSession,
  makeFinanceSessionCookie,
  clearFinanceSessionCookie
} from '../server/admin-auth.js';
import { handleFinanceRequest } from '../api/_finance-handler.js';
import { handleFeesRequest } from '../api/_fees-handler.js';

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

test('Finance Auth: strictly reads process.env.Finance_PASSWORDS and ignores ADMIN_PASSWORD', () => {
  // Clear any existing test state
  delete process.env.Finance_PASSWORDS;
  process.env.ADMIN_PASSWORD = 'FeePasswordOnly@123';
  deleteSetting('admin_password_hash');
  deleteSetting('admin_password_salt');
  deleteSetting('admin_session_secret');

  // ADMIN_PASSWORD is set, but Finance_PASSWORDS is not -> Finance password is NOT configured
  assert.equal(isFinancePasswordConfigured(), false);
  assert.equal(getFinanceEnvPassword(), '');
  assert.equal(verifyFinancePassword('FeePasswordOnly@123'), false);

  // Set Finance_PASSWORDS (with accidental whitespace/newline)
  process.env.Finance_PASSWORDS = '  FinanceSecret@2026\n';
  assert.equal(isFinancePasswordConfigured(), true);
  assert.equal(getFinanceEnvPassword(), 'FinanceSecret@2026');

  // Verify correct password succeeds even with surrounding whitespace in candidate
  assert.equal(verifyFinancePassword('FinanceSecret@2026'), true);
  assert.equal(verifyFinancePassword('  FinanceSecret@2026  '), true);

  // Verify wrong password fails
  assert.equal(verifyFinancePassword('WrongPassword123'), false);
  // Verify Fee Register password fails for Finance
  assert.equal(verifyFinancePassword('FeePasswordOnly@123'), false);

  // Clean up env
  delete process.env.Finance_PASSWORDS;
  delete process.env.ADMIN_PASSWORD;
});

test('Finance Auth: Database PBKDF2 hashing fallback when Finance_PASSWORDS is not set', () => {
  delete process.env.Finance_PASSWORDS;
  delete process.env.ADMIN_PASSWORD;
  deleteSetting('admin_password_hash');
  deleteSetting('admin_password_salt');
  deleteSetting('admin_session_secret');

  assert.equal(isFinancePasswordConfigured(), false);

  // Reject too-short password (< 8 chars)
  assert.throws(() => {
    setFinancePassword('short');
  }, /at least 8 characters/);

  // Successfully set a strong password
  const testPass = 'AdminSecret@2026';
  const success = setFinancePassword(testPass, '127.0.0.1');
  assert.equal(success, true);
  assert.equal(isFinancePasswordConfigured(), true);

  // Verify hash and salt were stored in settings
  const hash = getSetting('admin_password_hash');
  const salt = getSetting('admin_password_salt');
  assert.ok(hash && hash.length === 128); // 64 bytes hex
  assert.ok(salt && salt.length === 64);  // 32 bytes hex

  // Verify correct password succeeds
  assert.equal(verifyFinancePassword(testPass), true);
  assert.equal(verifyFinancePassword('WrongPassword123'), false);

  // Verify overwrite protection
  assert.throws(() => {
    setFinancePassword('AnotherPassword2026', '127.0.0.1');
  }, /already been configured/);

  // Clean up
  deleteSetting('admin_password_hash');
  deleteSetting('admin_password_salt');
  deleteSetting('admin_session_secret');
});

test('Independent Session Cookies: mjm_finance_admin vs mjm_fees_admin', () => {
  process.env.Finance_PASSWORDS = 'FinanceSecretKey@999';
  process.env.ADMIN_PASSWORD = 'FeeSecretKey@888';

  const financeCookie = makeFinanceSessionCookie();
  assert.ok(financeCookie.includes(`${FINANCE_COOKIE}=`));
  assert.ok(financeCookie.includes('HttpOnly'));

  const financeToken = financeCookie.split(';')[0].replace(`${FINANCE_COOKIE}=`, '');

  // Finance session accepts mjm_finance_admin
  const validFinanceReq = new Request('https://www.myjeementor.com/api/finance', {
    headers: { cookie: `${FINANCE_COOKIE}=${financeToken}` }
  });
  assert.equal(hasFinanceSession(validFinanceReq), true);

  // Finance session strictly REJECTS mjm_fees_admin
  const feesCookieReq = new Request('https://www.myjeementor.com/api/finance', {
    headers: { cookie: `mjm_fees_admin=${financeToken}` }
  });
  assert.equal(hasFinanceSession(feesCookieReq), false);

  // Clear cookie header
  const clearHeader = clearFinanceSessionCookie();
  assert.ok(clearHeader.includes('Max-Age=0'));
  assert.ok(clearHeader.includes(`${FINANCE_COOKIE}=`));

  delete process.env.Finance_PASSWORDS;
  delete process.env.ADMIN_PASSWORD;
});

test('Cross-Portal Auth Independence: One portal password does not authenticate the other', async () => {
  process.env.Finance_PASSWORDS = 'FinancePassword#1';
  process.env.ADMIN_PASSWORD = 'FeesPassword#2';
  process.env.SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbx_mock/exec';
  process.env.SHEET_SECRET = 'MockSecret123';

  // 1. Finance Login with Fees password must FAIL with 401
  const financeWrongReq = new Request('https://www.myjeementor.com/api/finance?action=login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'FeesPassword#2' })
  });
  const financeWrongRes = await handleFinanceRequest(financeWrongReq);
  assert.equal(financeWrongRes.status, 401);

  // 2. Finance Login with Finance password must SUCCEED with 200 and mjm_finance_admin cookie
  const financeCorrectReq = new Request('https://www.myjeementor.com/api/finance?action=login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'FinancePassword#1' })
  });
  const financeCorrectRes = await handleFinanceRequest(financeCorrectReq);
  assert.equal(financeCorrectRes.status, 200);
  const financeCookieHeader = financeCorrectRes.headers.get('set-cookie');
  assert.ok(financeCookieHeader.includes('mjm_finance_admin='));

  // 3. Fees Login with Finance password must FAIL with 401
  const feesWrongReq = new Request('https://www.myjeementor.com/api/fees?action=login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'FinancePassword#1' })
  });
  const feesWrongRes = await handleFeesRequest(feesWrongReq);
  assert.equal(feesWrongRes.status, 401);

  // 4. Fees Login with Fees password must SUCCEED with 200 and mjm_fees_admin cookie
  const feesCorrectReq = new Request('https://www.myjeementor.com/api/fees?action=login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'FeesPassword#2' })
  });
  const feesCorrectRes = await handleFeesRequest(feesCorrectReq);
  assert.equal(feesCorrectRes.status, 200);
  const feesCookieHeader = feesCorrectRes.headers.get('set-cookie');
  assert.ok(feesCookieHeader.includes('mjm_fees_admin='));

  // Clean up
  delete process.env.Finance_PASSWORDS;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.SHEET_WEBAPP_URL;
  delete process.env.SHEET_SECRET;
});
