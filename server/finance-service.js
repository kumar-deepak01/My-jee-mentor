import { getSetting, setSetting, deleteSetting } from './finance-db.js';

export const FINANCE_SPREADSHEET_TITLE = 'My JEE Mentor – Finance Management';

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

export const DEFAULT_FINANCE_SPREADSHEET_ID = '13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8';
export const TARGET_GOOGLE_ACCOUNT = 'amjeementor@gmail.com';

/**
 * Returns the active or default Finance Google Spreadsheet ID.
 */
export function getFinanceSpreadsheetId() {
  return (
    getSetting('finance_spreadsheet_id') ||
    process.env.FINANCE_SPREADSHEET_ID ||
    DEFAULT_FINANCE_SPREADSHEET_ID
  );
}

export function getSpreadsheetUrl(spreadsheetId) {
  if (!spreadsheetId) return '';
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Returns OAuth Client ID & Secret from Settings or Environment.
 */
export function getOAuthConfig() {
  const clientId = getSetting('google_client_id') || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = getSetting('google_client_secret') || process.env.GOOGLE_CLIENT_SECRET || '';
  return { clientId, clientSecret };
}

/**
 * Generates Google OAuth 2.0 authorization URL.
 * Requests minimum required permissions (https://www.googleapis.com/auth/spreadsheets)
 * and hints the authorized target account (amjeementor@gmail.com).
 */
export function generateAuthUrl(redirectUri, state = 'finance_setup') {
  const { clientId } = getOAuthConfig();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is not configured. Please add it in settings or environment.');
  }

  // Minimum required Google Sheets permissions:
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets'
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    login_hint: TARGET_GOOGLE_ACCOUNT,
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for Access & Refresh tokens.
 */
export async function exchangeAuthCode(code, redirectUri) {
  const { clientId, clientSecret } = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client ID or Client Secret is missing.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code.');
  }

  if (data.refresh_token) {
    setSetting('google_refresh_token', data.refresh_token);
  }
  if (data.access_token) {
    setSetting('google_access_token', data.access_token);
    const expiresAt = Date.now() + ((data.expires_in || 3600) - 120) * 1000;
    setSetting('google_access_token_expires_at', String(expiresAt));
  }

  return data;
}

/**
 * Retrieves a valid Google Access Token (auto-refreshes if expired).
 */
export async function getValidAccessToken() {
  const directToken = process.env.GOOGLE_ACCESS_TOKEN;
  if (directToken) return directToken;

  const cachedToken = getSetting('google_access_token');
  const expiresAt = Number(getSetting('google_access_token_expires_at') || 0);

  if (cachedToken && expiresAt > Date.now()) {
    return cachedToken;
  }

  const refreshToken = getSetting('google_refresh_token') || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error('No Google Refresh Token found. Please authorize your Google account first.');
  }

  const { clientId, clientSecret } = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client ID or Client Secret is missing.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to refresh access token.');
  }

  setSetting('google_access_token', data.access_token);
  const newExpiresAt = Date.now() + ((data.expires_in || 3600) - 120) * 1000;
  setSetting('google_access_token_expires_at', String(newExpiresAt));

  return data.access_token;
}

/**
 * Connects and verifies the Finance Management spreadsheet in Google Drive.
 * Connects to the target spreadsheet (13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8)
 * and initializes missing worksheets without duplicating or overwriting data.
 */
export async function createFinanceSpreadsheet(accessToken) {
  // Idempotency check: Always prefer configured or default target spreadsheet
  const targetId = getFinanceSpreadsheetId();
  if (targetId) {
    try {
      const verified = await verifySpreadsheet(targetId, accessToken);
      if (verified.ok) {
        return {
          ok: true,
          spreadsheetId: targetId,
          spreadsheetUrl: getSpreadsheetUrl(targetId),
          alreadyExisted: true,
          missingSheetsAdded: verified.missingSheetsAdded,
          message: 'Target Finance Google Spreadsheet successfully connected and verified.'
        };
      }
    } catch (err) {
      console.warn('Target spreadsheet verification warning:', err.message);
    }
  }

  // Fallback: Create new spreadsheet only if no target ID is available
  const sheetsPayload = SHEET_NAMES.map(sheetName => ({
    properties: {
      title: sheetName,
      gridProperties: { rowCount: 1000, columnCount: 20 }
    }
  }));

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: FINANCE_SPREADSHEET_TITLE },
      sheets: sheetsPayload
    })
  });

  const createdData = await createRes.json();
  if (!createRes.ok || !createdData.spreadsheetId) {
    throw new Error(createdData.error?.message || 'Google Sheets API failed to create spreadsheet.');
  }

  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = getSpreadsheetUrl(spreadsheetId);

  // 2. Populate Headers and Initial Rows for each sheet
  const valueRanges = [];
  for (const sheetName of SHEET_NAMES) {
    const schema = FINANCE_SCHEMAS[sheetName];
    const rows = [schema.headers];
    if (schema.initialRows && schema.initialRows.length) {
      rows.push(...schema.initialRows);
    }
    valueRanges.push({
      range: `${sheetName}!A1`,
      values: rows
    });
  }

  const populateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges
      })
    }
  );

  const populateData = await populateRes.json();
  if (!populateRes.ok) {
    throw new Error(populateData.error?.message || 'Failed to populate sheet headers and initial data.');
  }

  // 3. Format Header Rows (Bold, navy background, white text)
  try {
    const sheetIdMap = {};
    for (const sheet of createdData.sheets || []) {
      sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
    }

    const formatRequests = SHEET_NAMES.map(sheetName => {
      const sheetId = sheetIdMap[sheetName];
      return {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.16, blue: 0.32 }, // Dark navy
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      };
    });

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: formatRequests })
    });
  } catch (fmtErr) {
    console.warn('Non-fatal: could not apply custom cell formatting to headers:', fmtErr);
  }

  // 4. Save Spreadsheet ID securely
  setSetting('finance_spreadsheet_id', spreadsheetId);
  setSetting('finance_spreadsheet_url', spreadsheetUrl);
  setSetting('finance_connection_status', 'Connected');
  setSetting('finance_last_synced_at', new Date().toISOString());
  setSetting('finance_last_error', '');

  return {
    ok: true,
    spreadsheetId,
    spreadsheetUrl,
    alreadyExisted: false,
    message: 'Finance Google Spreadsheet automatically created and initialized successfully.'
  };
}

/**
 * Verifies that a Google Spreadsheet has all required tabs, headers, and read/write access.
 */
export async function verifySpreadsheet(spreadsheetId, accessToken) {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required for verification.');
  }

  // 1. Get Spreadsheet Metadata
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const metaData = await metaRes.json();
  if (!metaRes.ok || metaData.error) {
    const msg = metaData.error?.message || 'Cannot access Google Spreadsheet. Check permissions.';
    setSetting('finance_connection_status', 'Sync Error');
    setSetting('finance_last_error', msg);
    throw new Error(msg);
  }

  const existingSheetTitles = new Set(
    (metaData.sheets || []).map(s => s.properties.title)
  );

  // 2. Identify missing sheets
  const missingSheets = SHEET_NAMES.filter(name => !existingSheetTitles.has(name));

  // If any sheets are missing, create them automatically
  if (missingSheets.length > 0) {
    const addSheetRequests = missingSheets.map(title => ({
      addSheet: { properties: { title } }
    }));

    const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: addSheetRequests })
    });

    if (!addRes.ok) {
      const errData = await addRes.json();
      throw new Error(`Failed to create missing worksheets (${missingSheets.join(', ')}): ${errData.error?.message || 'API error'}`);
    }

    // Populate headers for newly created sheets
    const valueRanges = missingSheets.map(name => ({
      range: `${name}!A1`,
      values: [FINANCE_SCHEMAS[name].headers]
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges
      })
    });
  }

  // 3. Test Write Access by appending a verification entry to AuditLog
  const verifyLogId = `LOG-${Date.now().toString().slice(-6)}`;
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AuditLog!A:G:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          [
            verifyLogId,
            new Date().toISOString(),
            'Admin Portal',
            'VERIFY_CONNECTION',
            'Connection Check',
            'Automated read/write verification succeeded.',
            'Server'
          ]
        ]
      })
    }
  );

  if (!writeRes.ok) {
    const writeErr = await writeRes.json();
    throw new Error(`Write verification failed: ${writeErr.error?.message || 'Check edit permissions on the sheet.'}`);
  }

  // 4. Mark status as Connected
  setSetting('finance_spreadsheet_id', spreadsheetId);
  setSetting('finance_spreadsheet_url', getSpreadsheetUrl(spreadsheetId));
  setSetting('finance_connection_status', 'Connected');
  setSetting('finance_last_synced_at', new Date().toISOString());
  setSetting('finance_last_error', '');

  return {
    ok: true,
    spreadsheetId,
    spreadsheetUrl: getSpreadsheetUrl(spreadsheetId),
    missingSheetsAdded: missingSheets,
    message: 'Spreadsheet connection and read/write access successfully verified.'
  };
}

/**
 * Connects an existing Spreadsheet ID provided by the admin.
 * If no ID is provided, connects the target default spreadsheet (13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8).
 */
export async function connectExistingSpreadsheet(spreadsheetId) {
  const targetId = spreadsheetId || getFinanceSpreadsheetId();
  if (!targetId) {
    throw new Error('Please provide a valid Google Spreadsheet ID.');
  }

  const cleanId = String(targetId).trim().match(/[-\w]{25,}/)?.[0] || String(targetId).trim();
  const accessToken = await getValidAccessToken();

  return await verifySpreadsheet(cleanId, accessToken);
}

/**
 * Returns comprehensive connection status for the Finance Portal.
 */
export async function getFinanceConnectionStatus() {
  const spreadsheetId = getFinanceSpreadsheetId();
  const lastError = getSetting('finance_last_error') || '';
  const lastSyncedAt = getSetting('finance_last_synced_at') || '';
  const { clientId, clientSecret } = getOAuthConfig();
  const hasOAuthConfig = Boolean(clientId && clientSecret);
  const refreshToken = getSetting('google_refresh_token') || process.env.GOOGLE_REFRESH_TOKEN || '';
  const hasRefreshToken = Boolean(refreshToken);

  let status = 'Setup Required';
  if (!hasOAuthConfig && !hasRefreshToken) {
    status = 'Setup Required';
  } else if (!hasRefreshToken) {
    status = 'Not Connected';
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
    hasOAuthConfig,
    hasRefreshToken,
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
