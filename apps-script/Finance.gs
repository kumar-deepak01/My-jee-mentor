/**
 * My JEE Mentor – Finance Management
 * Google Apps Script Automation & Web App Bridge
 *
 * Automatically creates and initializes the complete Finance Management Spreadsheet
 * in the admin's personal Google Drive with all 6 worksheets, headers, and seed categories.
 */

const FINANCE_TITLE = 'My JEE Mentor – Finance Management';

const SCHEMAS = {
  Expenses: [
    'Expense ID', 'Date', 'Category', 'Description', 'Amount (₹)',
    'Payment Mode', 'Paid To / Vendor', 'Invoice / Bill URL', 'Recorded By', 'Status', 'Notes'
  ],
  Salaries: [
    'Salary ID', 'Payment Date', 'Period / Month', 'Employee ID', 'Employee Name',
    'Role', 'Basic Salary (₹)', 'Incentive / Bonus (₹)', 'Deductions (₹)', 'Net Paid (₹)',
    'Payment Mode', 'Transaction Ref', 'Status', 'Notes'
  ],
  Employees: [
    'Employee ID', 'Full Name', 'Role / Designation', 'Department', 'Phone',
    'Email', 'Monthly Salary (₹)', 'Joining Date', 'Status', 'Bank / UPI Details', 'Notes'
  ],
  OtherIncome: [
    'Income ID', 'Date', 'Source', 'Description', 'Amount (₹)',
    'Payment Mode', 'Reference No', 'Received By', 'Status', 'Notes'
  ],
  Categories: [
    'Category ID', 'Type', 'Category Name', 'Description', 'Monthly Budget (₹)', 'Status'
  ],
  AuditLog: [
    'Log ID', 'Timestamp', 'Actor', 'Action', 'Entity', 'Details', 'IP Address'
  ]
};

const SEED_CATEGORIES = [
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
];

/**
 * 1-Click Setup: Automatically creates "My JEE Mentor – Finance Management"
 * in the admin's personal Google Drive.
 */
function initFinanceSpreadsheet() {
  const spreadsheet = SpreadsheetApp.create(FINANCE_TITLE);
  const spreadsheetId = spreadsheet.getId();
  const spreadsheetUrl = spreadsheet.getUrl();

  // Create each sheet and set headers
  const sheetNames = Object.keys(SCHEMAS);
  sheetNames.forEach(function(name, index) {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name, index);
    }

    const headers = SCHEMAS[name];
    sheet.appendRow(headers);

    // Header styling: Dark navy background, white bold text, freeze top row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#15284F');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // Auto-populate seed categories
    if (name === 'Categories') {
      SEED_CATEGORIES.forEach(function(cat) {
        sheet.appendRow(cat);
      });
    }

    // Auto-populate initial audit entry
    if (name === 'AuditLog') {
      sheet.appendRow([
        'LOG-0001',
        new Date().toISOString(),
        'Apps Script Auto-Init',
        'CREATE_SPREADSHEET',
        'Finance Management',
        'Automatically created Google Spreadsheet in admin drive with all 6 worksheets and schemas.',
        'Google Cloud Apps Script'
      ]);
    }
  });

  // Delete default 'Sheet1' if present
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }

  Logger.log('Created Finance Spreadsheet:');
  Logger.log('ID: ' + spreadsheetId);
  Logger.log('URL: ' + spreadsheetUrl);

  return {
    ok: true,
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: spreadsheetUrl,
    title: FINANCE_TITLE
  };
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function expectedSecret() {
  return PropertiesService.getScriptProperties().getProperty('FINANCE_SECRET') || '';
}

function validSecret(provided) {
  const expected = expectedSecret();
  if (!expected || !provided) return false;
  return String(expected) === String(provided);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'status';

    if (action === 'init') {
      if (!validSecret(params.secret)) {
        return jsonOutput({ ok: false, message: 'Unauthorized request.' });
      }
      const result = initFinanceSpreadsheet();
      return jsonOutput(result);
    }

    if (action === 'status') {
      return jsonOutput({
        ok: true,
        service: 'My JEE Mentor Finance Apps Script',
        sheets: Object.keys(SCHEMAS),
        timestamp: new Date().toISOString()
      });
    }

    return jsonOutput({ ok: false, message: 'Unknown action.' });
  } catch (error) {
    return jsonOutput({ ok: false, message: String(error.message || error) });
  }
}
