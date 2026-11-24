import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCE_SPREADSHEET_TITLE,
  FINANCE_SCHEMAS,
  SHEET_NAMES,
  DEFAULT_FINANCE_SPREADSHEET_ID,
  TARGET_GOOGLE_ACCOUNT,
  getFinanceSpreadsheetId,
  getSpreadsheetUrl,
  getFinanceWebAppUrl,
  getFinanceSheetSecret,
  getFinanceConnectionStatus,
  callFinanceSheet
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
import { handleFinanceRequest } from '../server/_finance-handler.js';
import { handleFeesRequest } from '../server/_fees-handler.js';

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

test('Finance Google Integration: Target account and spreadsheet configuration', () => {
  assert.equal(DEFAULT_FINANCE_SPREADSHEET_ID, '13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8');
  assert.equal(TARGET_GOOGLE_ACCOUNT, 'amjeementor@gmail.com');

  // Default fallback
  delete process.env.FINANCE_SPREADSHEET_ID;
  deleteSetting('finance_spreadsheet_id');
  assert.equal(getFinanceSpreadsheetId(), '13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8');

  // Environment override
  process.env.FINANCE_SPREADSHEET_ID = 'CustomEnvSpreadsheetId12345';
  assert.equal(getFinanceSpreadsheetId(), 'CustomEnvSpreadsheetId12345');

  // Setting override
  setSetting('finance_spreadsheet_id', 'CustomSettingSpreadsheetId67890');
  assert.equal(getFinanceSpreadsheetId(), 'CustomSettingSpreadsheetId67890');

  // Cleanup
  deleteSetting('finance_spreadsheet_id');
  delete process.env.FINANCE_SPREADSHEET_ID;
});

test('Finance Apps Script Integration: Web App URL, Secret & Settings fallbacks', () => {
  // Clear env and settings
  delete process.env.FINANCE_WEBAPP_URL;
  delete process.env.FINANCE_SHEET_SECRET;
  delete process.env.SHEET_WEBAPP_URL;
  delete process.env.SHEET_SECRET;
  deleteSetting('finance_webapp_url');
  deleteSetting('finance_sheet_secret');

  assert.equal(getFinanceWebAppUrl(), '');
  assert.equal(getFinanceSheetSecret(), '');

  // Setting override
  setSetting('finance_webapp_url', 'https://script.google.com/macros/s/AKfy_setting/exec');
  setSetting('finance_sheet_secret', 'SettingSecret123');
  assert.equal(getFinanceWebAppUrl(), 'https://script.google.com/macros/s/AKfy_setting/exec');
  assert.equal(getFinanceSheetSecret(), 'SettingSecret123');

  // Environment override takes priority over setting
  process.env.FINANCE_WEBAPP_URL = 'https://script.google.com/macros/s/AKfy_env/exec';
  process.env.FINANCE_SHEET_SECRET = 'EnvSecret456';
  assert.equal(getFinanceWebAppUrl(), 'https://script.google.com/macros/s/AKfy_env/exec');
  assert.equal(getFinanceSheetSecret(), 'EnvSecret456');

  // Cleanup
  delete process.env.FINANCE_WEBAPP_URL;
  delete process.env.FINANCE_SHEET_SECRET;
  deleteSetting('finance_webapp_url');
  deleteSetting('finance_sheet_secret');
});

test('Finance callFinanceSheet validates missing URL and secret', async () => {
  delete process.env.FINANCE_WEBAPP_URL;
  delete process.env.FINANCE_SHEET_SECRET;
  delete process.env.SHEET_WEBAPP_URL;
  delete process.env.SHEET_SECRET;
  deleteSetting('finance_webapp_url');
  deleteSetting('finance_sheet_secret');

  await assert.rejects(async () => {
    await callFinanceSheet('GET', { action: 'status' });
  }, /FINANCE_WEBAPP_URL/);

  setSetting('finance_webapp_url', 'https://script.google.com/macros/s/AKfy_test/exec');
  await assert.rejects(async () => {
    await callFinanceSheet('GET', { action: 'status' });
  }, /FINANCE_SHEET_SECRET/);

  deleteSetting('finance_webapp_url');
});

test('Finance Status & Security: Never exposes secrets or tokens in status', async () => {
  process.env.FINANCE_WEBAPP_URL = 'https://script.google.com/macros/s/AKfy_secret_test/exec';
  process.env.FINANCE_SHEET_SECRET = 'SuperSecretSheetKey999';

  const status = await getFinanceConnectionStatus();
  assert.equal(status.googleAccount, 'amjeementor@gmail.com');
  assert.equal(status.hasConfig, true);
  assert.equal(status.hasWebAppUrl, true);
  assert.equal(status.hasSecret, true);
  assert.equal(status.spreadsheetId, '13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8');
  assert.ok(status.spreadsheetUrl.includes('13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8'));
  assert.equal(status.integrationMethod, 'Google Apps Script Web App');

  // Ensure secrets and tokens are NEVER present in status object
  assert.equal('FINANCE_SHEET_SECRET' in status, false);
  assert.equal('secret' in status, false);
  assert.equal('client_secret' in status, false);
  assert.equal('refresh_token' in status, false);
  assert.equal(JSON.stringify(status).includes('SuperSecretSheetKey999'), false);

  delete process.env.FINANCE_WEBAPP_URL;
  delete process.env.FINANCE_SHEET_SECRET;
});

test('Finance Add Expense: rejects non-positive amount and missing category', async () => {
  process.env.Finance_PASSWORDS = 'TestPassword123';
  const cookie = makeFinanceSessionCookie();

  // 1. Missing / invalid amount (0)
  const reqZero = new Request('https://www.myjeementor.com/api/finance?action=add-expense', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie
    },
    body: JSON.stringify({ category: 'Office Rent', amount: 0 })
  });
  const resZero = await handleFinanceRequest(reqZero);
  assert.equal(resZero.status, 400);
  const dataZero = await resZero.json();
  assert.equal(dataZero.success, false);
  assert.ok(/greater than zero/i.test(dataZero.message));

  // 2. Negative amount (-500)
  const reqNeg = new Request('https://www.myjeementor.com/api/finance?action=add-expense', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie
    },
    body: JSON.stringify({ category: 'Office Rent', amount: -500 })
  });
  const resNeg = await handleFinanceRequest(reqNeg);
  assert.equal(resNeg.status, 400);

  // 3. Missing category
  const reqNoCat = new Request('https://www.myjeementor.com/api/finance?action=add-expense', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie
    },
    body: JSON.stringify({ category: '   ', amount: 2000 })
  });
  const resNoCat = await handleFinanceRequest(reqNoCat);
  assert.equal(resNoCat.status, 400);
  const dataNoCat = await resNoCat.json();
  assert.equal(dataNoCat.success, false);
  assert.ok(/category is required/i.test(dataNoCat.message));

  delete process.env.Finance_PASSWORDS;
});

test('Finance Apps Script Web App: Robust response parsing and HTML error diagnosis', async () => {
  // Test simulated fetch responses
  const originalFetch = globalThis.fetch;

  try {
    process.env.FINANCE_WEBAPP_URL = 'https://script.google.com/macros/s/AKfy_mock/exec';
    process.env.FINANCE_SHEET_SECRET = 'MockSecret123';

    // 1. Normal JSON success with success: true and expenseId
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      message: 'Expense saved successfully',
      expenseId: 'EXP-2026-0042'
    }), { status: 200, headers: { 'content-type': 'application/json' } });

    const successResult = await callFinanceSheet('POST', {
      action: 'add-expense',
      body: { amount: 2000, category: 'Marketing - Google Ads' }
    });
    assert.equal(successResult.success, true);
    assert.equal(successResult.ok, true);
    assert.equal(successResult.expenseId, 'EXP-2026-0042');
    assert.equal(successResult.message, 'Expense saved successfully');

    // 2. HTML Google Sign-In page response (e.g. When deployed with "Only myself")
    globalThis.fetch = async () => new Response(
      '<!DOCTYPE html><html><head><title>Sign in - Google Accounts</title></head><body>accounts.google.com/ServiceLogin</body></html>',
      { status: 200, headers: { 'content-type': 'text/html' } }
    );

    await assert.rejects(async () => {
      await callFinanceSheet('POST', { action: 'add-expense', body: { amount: 2000 } });
    }, /Google Apps Script requires Google authentication/);

    // 2b. HTML "Script function not found: doPost" when doPost is missing from Apps Script
    globalThis.fetch = async () => new Response(
      '<!DOCTYPE html><html><head><title>Error</title></head><body>Script function not found: doPost</body></html>',
      { status: 200, headers: { 'content-type': 'text/html' } }
    );

    await assert.rejects(async () => {
      await callFinanceSheet('POST', { action: 'add-expense', body: { amount: 2000 } });
    }, /Script function not found/i);

    // 3. HTML Apps Script Exception error
    globalThis.fetch = async () => new Response(
      '<!DOCTYPE html><html><head><title>Error</title></head><body>Exception: You do not have permission to call SpreadsheetApp.openById</body></html>',
      { status: 200, headers: { 'content-type': 'text/html' } }
    );

    await assert.rejects(async () => {
      await callFinanceSheet('POST', { action: 'add-expense', body: { amount: 2000 } });
    }, /Exception: You do not have permission to call SpreadsheetApp\.openById/);

    // 4. Apps Script failure JSON response
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: false,
      message: 'Expense category is required'
    }), { status: 200, headers: { 'content-type': 'application/json' } });

    await assert.rejects(async () => {
      await callFinanceSheet('POST', { action: 'add-expense', body: { amount: 2000 } });
    }, /Expense category is required/);

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.FINANCE_WEBAPP_URL;
    delete process.env.FINANCE_SHEET_SECRET;
  }
});

