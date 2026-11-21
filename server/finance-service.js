import { getSetting, setSetting, deleteSetting } from './finance-db.js';
import { fetchRawFeeRecords } from '../api/_fees-handler.js';

export const FINANCE_SPREADSHEET_TITLE = 'My JEE Mentor – Finance Management';
export const DEFAULT_FINANCE_SPREADSHEET_ID = '13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8';
export const TARGET_GOOGLE_ACCOUNT = 'amjeementor@gmail.com';

export const FINANCE_SCHEMAS = {
  Expenses: {
    headers: [
      'Expense ID',
      'Date',
      'Category',
      'Description',
      'Amount (₹)',
      'Payment Mode',
      'Paid To / Vendor',
      'Invoice / Bill URL',
      'Recorded By',
      'Status',
      'Notes'
    ]
  },
  Salaries: {
    headers: [
      'Salary ID',
      'Payment Date',
      'Period / Month',
      'Employee ID',
      'Employee Name',
      'Role',
      'Basic Salary (₹)',
      'Incentive / Bonus (₹)',
      'Deductions (₹)',
      'Net Paid (₹)',
      'Payment Mode',
      'Transaction Ref',
      'Status',
      'Notes'
    ]
  },
  Employees: {
    headers: [
      'Employee ID',
      'Full Name',
      'Role / Designation',
      'Department',
      'Phone',
      'Email',
      'Monthly Salary (₹)',
      'Joining Date',
      'Status',
      'Bank / UPI Details',
      'Notes'
    ]
  },
  OtherIncome: {
    headers: [
      'Income ID',
      'Date',
      'Source',
      'Description',
      'Amount (₹)',
      'Payment Mode',
      'Reference No',
      'Received By',
      'Status',
      'Notes'
    ]
  },
  Categories: {
    headers: [
      'Category ID',
      'Type',
      'Category Name',
      'Description',
      'Monthly Budget (₹)',
      'Status'
    ],
    initialRows: [
      ['CAT-001', 'Expense', 'Office Rent', 'Premises rental for institute classrooms and admin office', 35000, 'Active'],
      ['CAT-002', 'Expense', 'Teacher Honorarium & Faculty', 'Faculty lecture fees and academic honorarium', 80000, 'Active'],
      ['CAT-003', 'Expense', 'Electricity & Utilities', 'Power, broadband internet, water, maintenance', 8000, 'Active'],
      ['CAT-004', 'Expense', 'Marketing & Digital Ads', 'Meta/Google ads, banners, student lead generation', 25000, 'Active'],
      ['CAT-005', 'Expense', 'Study Material & Printing', 'Modules, test papers, DPP sheets, books printing', 15000, 'Active'],
      ['CAT-006', 'Expense', 'Software & Web Infrastructure', 'Domain, cloud hosting, AI APIs, SMS gateway', 6000, 'Active'],
      ['CAT-007', 'Expense', 'Office Supplies & Miscellaneous', 'Stationery, refreshments, emergency operational expenses', 5000, 'Active'],
      ['CAT-008', 'Income', 'Study Material Sales', 'Hardcopy study modules and books sold to students', 0, 'Active'],
      ['CAT-009', 'Income', 'Test Series / Crash Course Registration', 'Direct enrollment in mock test series and crash programs', 0, 'Active'],
      ['CAT-010', 'Income', 'Consulting & Mentorship Sessions', '1-on-1 private counselling and academic mentoring sessions', 0, 'Active']
    ]
  },
  AuditLog: {
    headers: [
      'Log ID',
      'Timestamp',
      'Actor',
      'Action',
      'Entity',
      'Details',
      'IP Address'
    ],
    initialRows: [
      [
        'LOG-0001',
        new Date().toISOString(),
        'Admin Auto-Setup',
        'INITIALIZE_SPREADSHEET',
        'Finance Management',
        'Automatically created Google Spreadsheet with Expenses, Salaries, Employees, OtherIncome, Categories, and AuditLog.',
        'Server Internal'
      ]
    ]
  }
};

export const SHEET_NAMES = Object.keys(FINANCE_SCHEMAS);

export function getSpreadsheetUrl(spreadsheetId) {
  if (!spreadsheetId) return '';
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export function getFinanceSpreadsheetId() {
  return (
    getSetting('finance_spreadsheet_id') ||
    process.env.FINANCE_SPREADSHEET_ID ||
    DEFAULT_FINANCE_SPREADSHEET_ID
  );
}

/**
 * Returns configured Finance Apps Script Web App URL.
 * Checks environment variable FINANCE_WEBAPP_URL first, then stored setting, then SHEET_WEBAPP_URL fallback.
 */
export function getFinanceWebAppUrl() {
  const url = (
    process.env.FINANCE_WEBAPP_URL ||
    getSetting('finance_webapp_url') ||
    ''
  ).trim();
  return url;
}

/**
 * Returns configured Finance Apps Script secret.
 * Checks environment variable FINANCE_SHEET_SECRET first, then stored setting.
 */
export function getFinanceSheetSecret() {
  const secret = (
    process.env.FINANCE_SHEET_SECRET ||
    getSetting('finance_sheet_secret') ||
    process.env.SHEET_SECRET ||
    ''
  ).trim();
  return secret;
}

/**
 * Executes an HTTP call to the Finance Google Apps Script Web App.
 * Uses exact same secure POST/GET request shape as Fee Register.
 */
export async function callFinanceSheet(method, { action = 'status', query = {}, body = {} } = {}) {
  const rawUrl = getFinanceWebAppUrl();
  if (!rawUrl) {
    throw new Error('Finance Apps Script Web App is not configured. Configure FINANCE_WEBAPP_URL in Vercel Environment Variables.');
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Configured FINANCE_WEBAPP_URL is not a valid HTTPS URL.');
  }

  const secret = getFinanceSheetSecret();
  if (!secret) {
    throw new Error('Finance sheet secret is not configured. Configure FINANCE_SHEET_SECRET in Vercel Environment Variables.');
  }

  if (method === 'GET') {
    url.searchParams.set('secret', secret);
    if (action) url.searchParams.set('action', action);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: method === 'POST' ? { 'content-type': 'text/plain;charset=utf-8' } : undefined,
      body: method === 'POST' ? JSON.stringify({ ...body, action, secret }) : undefined,
      signal: controller.signal,
      redirect: 'follow'
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      throw new Error(payload?.message || `Google Sheets did not confirm request (HTTP ${response.status}).`);
    }

    return payload;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Finance Google Sheets request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns comprehensive connection status for the Finance Portal.
 */
export async function getFinanceConnectionStatus() {
  const spreadsheetId = getFinanceSpreadsheetId();
  const webappUrl = getFinanceWebAppUrl();
  const secret = getFinanceSheetSecret();
  const hasConfig = Boolean(webappUrl && secret);
  const lastError = getSetting('finance_last_error') || '';
  const lastSyncedAt = getSetting('finance_last_synced_at') || '';

  let status = 'Setup Required';
  if (!hasConfig) {
    status = 'Setup Required';
  } else if (lastError) {
    status = 'Sync Error';
  } else {
    status = getSetting('finance_connection_status') || 'Connected';
  }

  // Check Fee Collection Sheet status (read-only integration)
  const feeWebAppUrl = process.env.SHEET_WEBAPP_URL || '';
  const feeSpreadsheetId = getSetting('fee_spreadsheet_id') || process.env.FEES_SPREADSHEET_ID || '';
  const feeIntegrationConnected = Boolean(feeWebAppUrl || feeSpreadsheetId);

  return {
    status, // 'Connected' | 'Not Connected' | 'Setup Required' | 'Sync Error'
    googleAccount: TARGET_GOOGLE_ACCOUNT,
    spreadsheetId,
    spreadsheetUrl: getSpreadsheetUrl(spreadsheetId),
    lastSyncedAt,
    lastError,
    hasConfig,
    hasWebAppUrl: Boolean(webappUrl),
    hasSecret: Boolean(secret),
    integrationMethod: 'Google Apps Script Web App',
    feeIntegration: {
      connected: feeIntegrationConnected,
      source: feeWebAppUrl ? 'Google Apps Script Web App' : feeSpreadsheetId ? 'Direct Sheets ID' : 'None',
      readOnly: true
    },
    feeSheet: {
      connected: feeIntegrationConnected,
      source: feeWebAppUrl ? 'Google Apps Script Web App' : feeSpreadsheetId ? 'Direct Sheets ID' : 'None',
      readOnly: true
    },
    sheets: SHEET_NAMES,
    sheetNames: SHEET_NAMES
  };
}

/**
 * Verifies live connection to Finance Google Spreadsheet via Apps Script.
 */
export async function verifySpreadsheetConnection() {
  const result = await callFinanceSheet('GET', { action: 'status' });
  setSetting('finance_connection_status', 'Connected');
  setSetting('finance_last_synced_at', new Date().toISOString());
  deleteSetting('finance_last_error');
  return result;
}

/**
 * Executes a full live read/write test on production Google Sheets:
 * 1. Checks connection & reads sheet metadata
 * 2. Writes a temporary test expense
 * 3. Reads back expenses to verify the test record is recorded
 * 4. Deletes the temporary test expense
 * 5. Returns verified diagnostics
 */
export async function testFinanceReadWrite(actor = 'Admin Verification', clientIp = '127.0.0.1') {
  const statusRes = await callFinanceSheet('GET', { action: 'status' });

  // 1. Add temporary test expense
  const testDesc = `[TEST-VERIFY] Automated Read/Write Check ${Date.now()}`;
  const addRes = await callFinanceSheet('POST', {
    action: 'add-expense',
    body: {
      amount: 1.00,
      category: 'Software & Web Infrastructure',
      description: testDesc,
      paidTo: 'Automated Test Harness',
      recordedBy: actor,
      clientIp,
      notes: 'Temporary diagnostic test record for live production verification'
    }
  });

  const createdId = addRes.expenseId;
  if (!createdId) {
    throw new Error('Test expense was not assigned an ID by Google Sheets.');
  }

  // 2. Read back expenses to verify presence in Google Sheets
  const readRes = await callFinanceSheet('GET', { action: 'get-expenses' });
  const found = (readRes.expenses || []).find(e => e.id === createdId || e.description === testDesc);
  if (!found) {
    throw new Error(`Write verification failed: Could not read back test record ${createdId} from Google Sheets.`);
  }

  // 3. Clean up: Delete the temporary test expense
  const deleteRes = await callFinanceSheet('POST', {
    action: 'delete-expense',
    body: {
      id: createdId,
      actor,
      clientIp
    }
  });

  setSetting('finance_connection_status', 'Connected');
  setSetting('finance_last_synced_at', new Date().toISOString());
  deleteSetting('finance_last_error');

  return {
    ok: true,
    verified: true,
    spreadsheetId: statusRes.spreadsheetId || DEFAULT_FINANCE_SPREADSHEET_ID,
    testRecordId: createdId,
    readBackConfirmed: true,
    cleanedUp: deleteRes.ok === true,
    sheetCounts: statusRes.sheets || {},
    timestamp: new Date().toISOString(),
    message: 'Live Google Sheets read, write, and cleanup test successfully passed!'
  };
}

/**
 * Reads Expenses from Google Sheets.
 */
export async function getExpenses(filters = {}) {
  const result = await callFinanceSheet('GET', { action: 'get-expenses', query: filters });
  return result.expenses || [];
}

/**
 * Records a new Expense in Google Sheets.
 */
export async function addExpense(data) {
  return await callFinanceSheet('POST', { action: 'add-expense', body: data });
}

/**
 * Deletes an Expense from Google Sheets.
 */
export async function deleteExpense(id, actor = 'Admin', clientIp = '127.0.0.1') {
  return await callFinanceSheet('POST', { action: 'delete-expense', body: { id, actor, clientIp } });
}

/**
 * Reads Salaries from Google Sheets.
 */
export async function getSalaries(filters = {}) {
  const result = await callFinanceSheet('GET', { action: 'get-salaries', query: filters });
  return result.salaries || [];
}

/**
 * Records a new Salary in Google Sheets.
 */
export async function addSalary(data) {
  return await callFinanceSheet('POST', { action: 'add-salary', body: data });
}

/**
 * Deletes a Salary record from Google Sheets.
 */
export async function deleteSalary(id, actor = 'Admin', clientIp = '127.0.0.1') {
  return await callFinanceSheet('POST', { action: 'delete-salary', body: { id, actor, clientIp } });
}

/**
 * Reads Employees from Google Sheets.
 */
export async function getEmployees(filters = {}) {
  const result = await callFinanceSheet('GET', { action: 'get-employees', query: filters });
  return result.employees || [];
}

/**
 * Adds an Employee to Google Sheets.
 */
export async function addEmployee(data) {
  return await callFinanceSheet('POST', { action: 'add-employee', body: data });
}

/**
 * Reads OtherIncome from Google Sheets.
 */
export async function getOtherIncome(filters = {}) {
  const result = await callFinanceSheet('GET', { action: 'get-other-income', query: filters });
  return result.records || [];
}

/**
 * Records OtherIncome in Google Sheets.
 */
export async function addOtherIncome(data) {
  return await callFinanceSheet('POST', { action: 'add-other-income', body: data });
}

/**
 * Deletes an OtherIncome record from Google Sheets.
 */
export async function deleteOtherIncome(id, actor = 'Admin', clientIp = '127.0.0.1') {
  return await callFinanceSheet('POST', { action: 'delete-other-income', body: { id, actor, clientIp } });
}

/**
 * Reads Categories from Google Sheets.
 */
export async function getCategories() {
  const result = await callFinanceSheet('GET', { action: 'get-categories' });
  return result.categories || [];
}

/**
 * Reads AuditLog from Google Sheets.
 */
export async function getAuditLog(limit = 100) {
  const result = await callFinanceSheet('GET', { action: 'get-audit-log', query: { limit } });
  return result.logs || [];
}
