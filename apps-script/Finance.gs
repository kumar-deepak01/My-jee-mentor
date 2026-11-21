/**
 * My JEE Mentor – Finance Management
 * Production Google Apps Script Web App Handler
 *
 * Dedicated handler for Finance Management bound to spreadsheet:
 * 13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8
 *
 * Supports:
 * - Read / Add / Update / Delete Expenses
 * - Read / Record monthly Salaries
 * - Manage Employees directory
 * - Read / Record OtherIncome
 * - Budget Categories & AuditLog
 */

const TARGET_SPREADSHEET_ID = '13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8';
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

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function expectedSecret() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('FINANCE_SECRET') || props.getProperty('SHEET_SECRET') || '';
}

function validSecret(provided) {
  const expected = expectedSecret();
  if (!expected || !provided) return false;
  const expectedDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected);
  const providedDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(provided));
  let difference = 0;
  for (let i = 0; i < expectedDigest.length; i++) difference |= expectedDigest[i] ^ providedDigest[i];
  return difference === 0;
}

function getSpreadsheet() {
  const bound = SpreadsheetApp.getActiveSpreadsheet();
  if (bound) return bound;
  const propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const targetId = propId || TARGET_SPREADSHEET_ID;
  return SpreadsheetApp.openById(targetId);
}

function ensureSheet(spreadsheet, name) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  const headers = SCHEMAS[name];
  if (sheet.getLastRow() === 0 && headers) {
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground('#15284F');
    range.setFontColor('#FFFFFF');
    range.setFontWeight('bold');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    if (name === 'Categories') {
      SEED_CATEGORIES.forEach(function(row) { sheet.appendRow(row); });
    }
    if (name === 'AuditLog') {
      sheet.appendRow([
        'LOG-0001',
        new Date().toISOString(),
        'Finance Init',
        'INIT_SHEETS',
        'Finance System',
        'Spreadsheet initialized with all 6 worksheets and schemas.',
        '127.0.0.1'
      ]);
    }
  }
  return sheet;
}

function cleanCell(value, maxLength) {
  const text = String(value == null ? '' : value).trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength || 500);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function appendAudit(spreadsheet, actor, action, entity, details, ip) {
  try {
    const sheet = ensureSheet(spreadsheet, 'AuditLog');
    const logId = 'LOG-' + Date.now().toString().slice(-6);
    sheet.appendRow([
      logId,
      new Date().toISOString(),
      cleanCell(actor || 'Admin Portal', 100),
      cleanCell(action, 50),
      cleanCell(entity, 80),
      cleanCell(details, 500),
      cleanCell(ip || 'Server', 50)
    ]);
  } catch (e) {
    Logger.log('Audit log error: ' + e.message);
  }
}

function getNextId(sheet, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + '0001';
  const cells = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  let maxSeq = 0;
  const escapedPrefix = prefix.replace(/-/g, '\\-');
  const regex = new RegExp('^' + escapedPrefix + '(\\d+)$');
  cells.forEach(function(row) {
    const match = String(row[0]).match(regex);
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  });
  return prefix + String(maxSeq + 1).padStart(4, '0');
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'status';

    if (!validSecret(params.secret)) {
      return jsonOutput({ ok: false, code: 'UNAUTHORIZED', message: 'Unauthorized request. Secret does not match.' });
    }

    const spreadsheet = getSpreadsheet();

    // 1. Status / Connection check
    if (action === 'status' || action === 'ping') {
      const sheetNames = Object.keys(SCHEMAS);
      const counts = {};
      sheetNames.forEach(function(name) {
        const s = ensureSheet(spreadsheet, name);
        counts[name] = Math.max(0, s.getLastRow() - 1);
      });
      return jsonOutput({
        ok: true,
        connected: true,
        spreadsheetId: spreadsheet.getId(),
        spreadsheetTitle: spreadsheet.getName(),
        sheets: counts,
        headers: SCHEMAS,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Read Expenses
    if (action === 'get-expenses') {
      const sheet = ensureSheet(spreadsheet, 'Expenses');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOutput({ ok: true, expenses: [] });
      const values = sheet.getRange(2, 1, lastRow - 1, SCHEMAS.Expenses.length).getDisplayValues();
      const categoryFilter = String(params.category || '').trim().toLowerCase();
      const search = String(params.search || '').trim().toLowerCase();

      const expenses = values.map(function(row) {
        return {
          id: row[0],
          date: row[1],
          category: row[2],
          description: row[3],
          amount: Number(String(row[4]).replace(/,/g, '')) || 0,
          paymentMode: row[5],
          paidTo: row[6],
          billUrl: row[7],
          recordedBy: row[8],
          status: row[9],
          notes: row[10]
        };
      }).filter(function(r) {
        if (!r.id || r.status === 'Deleted') return false;
        if (categoryFilter && r.category.toLowerCase() !== categoryFilter) return false;
        if (search) {
          const haystack = [r.id, r.category, r.description, r.paidTo, r.notes].join(' ').toLowerCase();
          if (haystack.indexOf(search) === -1) return false;
        }
        return true;
      }).reverse();

      return jsonOutput({ ok: true, expenses: expenses });
    }

    // 3. Read Salaries
    if (action === 'get-salaries') {
      const sheet = ensureSheet(spreadsheet, 'Salaries');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOutput({ ok: true, salaries: [] });
      const values = sheet.getRange(2, 1, lastRow - 1, SCHEMAS.Salaries.length).getDisplayValues();
      const periodFilter = String(params.period || '').trim().toLowerCase();

      const salaries = values.map(function(row) {
        return {
          id: row[0],
          paymentDate: row[1],
          period: row[2],
          employeeId: row[3],
          employeeName: row[4],
          role: row[5],
          basicSalary: Number(String(row[6]).replace(/,/g, '')) || 0,
          incentive: Number(String(row[7]).replace(/,/g, '')) || 0,
          deductions: Number(String(row[8]).replace(/,/g, '')) || 0,
          netPaid: Number(String(row[9]).replace(/,/g, '')) || 0,
          paymentMode: row[10],
          transactionRef: row[11],
          status: row[12],
          notes: row[13]
        };
      }).filter(function(r) {
        if (!r.id || r.status === 'Deleted') return false;
        if (periodFilter && r.period.toLowerCase() !== periodFilter) return false;
        return true;
      }).reverse();

      return jsonOutput({ ok: true, salaries: salaries });
    }

    // 4. Read Employees
    if (action === 'get-employees') {
      const sheet = ensureSheet(spreadsheet, 'Employees');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOutput({ ok: true, employees: [] });
      const values = sheet.getRange(2, 1, lastRow - 1, SCHEMAS.Employees.length).getDisplayValues();

      const employees = values.map(function(row) {
        return {
          id: row[0],
          name: row[1],
          role: row[2],
          department: row[3],
          phone: row[4],
          email: row[5],
          monthlySalary: Number(String(row[6]).replace(/,/g, '')) || 0,
          joiningDate: row[7],
          status: row[8],
          bankUpi: row[9],
          notes: row[10]
        };
      }).filter(function(r) { return Boolean(r.id); });

      return jsonOutput({ ok: true, employees: employees });
    }

    // 5. Read OtherIncome
    if (action === 'get-other-income') {
      const sheet = ensureSheet(spreadsheet, 'OtherIncome');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOutput({ ok: true, records: [] });
      const values = sheet.getRange(2, 1, lastRow - 1, SCHEMAS.OtherIncome.length).getDisplayValues();

      const records = values.map(function(row) {
        return {
          id: row[0],
          date: row[1],
          source: row[2],
          description: row[3],
          amount: Number(String(row[4]).replace(/,/g, '')) || 0,
          paymentMode: row[5],
          referenceNo: row[6],
          receivedBy: row[7],
          status: row[8],
          notes: row[9]
        };
      }).filter(function(r) { return r.id && r.status !== 'Deleted'; }).reverse();

      return jsonOutput({ ok: true, records: records });
    }

    // 6. Read Categories
    if (action === 'get-categories') {
      const sheet = ensureSheet(spreadsheet, 'Categories');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOutput({ ok: true, categories: [] });
      const values = sheet.getRange(2, 1, lastRow - 1, SCHEMAS.Categories.length).getDisplayValues();
      const categories = values.map(function(row) {
        return {
          id: row[0],
          type: row[1],
          name: row[2],
          description: row[3],
          monthlyBudget: Number(String(row[4]).replace(/,/g, '')) || 0,
          status: row[5]
        };
      }).filter(function(r) { return Boolean(r.id); });

      return jsonOutput({ ok: true, categories: categories });
    }

    // 7. Read AuditLog
    if (action === 'get-audit-log') {
      const sheet = ensureSheet(spreadsheet, 'AuditLog');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOutput({ ok: true, logs: [] });
      const limit = Math.min(Number(params.limit) || 100, 500);
      const startRow = Math.max(2, lastRow - limit + 1);
      const numRows = lastRow - startRow + 1;
      const values = sheet.getRange(startRow, 1, numRows, SCHEMAS.AuditLog.length).getDisplayValues();

      const logs = values.map(function(row) {
        return {
          id: row[0],
          timestamp: row[1],
          actor: row[2],
          action: row[3],
          entity: row[4],
          details: row[5],
          ip: row[6]
        };
      }).reverse();

      return jsonOutput({ ok: true, logs: logs });
    }

    return jsonOutput({ ok: false, code: 'UNKNOWN_ACTION', message: 'Action not supported: ' + action });
  } catch (error) {
    return jsonOutput({ ok: false, code: 'SCRIPT_ERROR', message: String(error.message || error) });
  }
}

/**
 * Handle POST requests (Add/Edit/Delete with ScriptLock)
 */
function doPost(e) {
  let lock;
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!validSecret(data.secret)) {
      return jsonOutput({ ok: false, code: 'UNAUTHORIZED', message: 'Unauthorized request. Secret does not match.' });
    }

    const action = data.action;
    if (!action) {
      return jsonOutput({ ok: false, message: 'Action parameter is required.' });
    }

    lock = LockService.getScriptLock();
    lock.waitLock(30000);

    const spreadsheet = getSpreadsheet();
    const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy');

    // 1. Add Expense
    if (action === 'add-expense') {
      const sheet = ensureSheet(spreadsheet, 'Expenses');
      const idPrefix = 'EXP-' + year + '-';
      const expenseId = getNextId(sheet, idPrefix);
      const amount = Number(data.amount);
      if (!isFinite(amount) || amount <= 0) {
        return jsonOutput({ ok: false, message: 'Valid expense amount greater than zero is required.' });
      }

      const row = [
        expenseId,
        cleanCell(data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), 10),
        cleanCell(data.category || 'General', 50),
        cleanCell(data.description, 200),
        Number(amount.toFixed(2)),
        cleanCell(data.paymentMode || 'UPI', 30),
        cleanCell(data.paidTo, 100),
        cleanCell(data.billUrl, 250),
        cleanCell(data.recordedBy || 'Admin', 100),
        cleanCell(data.status || 'Paid', 30),
        cleanCell(data.notes, 500)
      ];

      sheet.appendRow(row);
      appendAudit(spreadsheet, data.recordedBy, 'ADD_EXPENSE', 'Expenses', 'Added ' + expenseId + ' of ₹' + amount + ' (' + data.category + ')', data.clientIp);

      return jsonOutput({ ok: true, expenseId: expenseId, message: 'Expense recorded successfully.' });
    }

    // 2. Delete Expense
    if (action === 'delete-expense') {
      const sheet = ensureSheet(spreadsheet, 'Expenses');
      const targetId = cleanCell(data.id, 50);
      if (!targetId) return jsonOutput({ ok: false, message: 'Expense ID is required.' });

      const lastRow = sheet.getLastRow();
      let foundRow = -1;
      if (lastRow > 1) {
        const idCells = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
        for (let i = 0; i < idCells.length; i++) {
          if (String(idCells[i][0]).trim() === targetId) {
            foundRow = i + 2;
            break;
          }
        }
      }

      if (foundRow === -1) {
        return jsonOutput({ ok: false, message: 'Expense not found: ' + targetId });
      }

      sheet.deleteRow(foundRow);
      appendAudit(spreadsheet, data.actor, 'DELETE_EXPENSE', 'Expenses', 'Deleted ' + targetId, data.clientIp);

      return jsonOutput({ ok: true, deletedId: targetId, message: 'Expense successfully deleted.' });
    }

    // 3. Add Salary
    if (action === 'add-salary') {
      const sheet = ensureSheet(spreadsheet, 'Salaries');
      const idPrefix = 'SAL-' + year + '-';
      const salaryId = getNextId(sheet, idPrefix);
      const netPaid = Number(data.netPaid || data.basicSalary || 0);

      const row = [
        salaryId,
        cleanCell(data.paymentDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), 10),
        cleanCell(data.period, 30),
        cleanCell(data.employeeId, 30),
        cleanCell(data.employeeName, 100),
        cleanCell(data.role, 80),
        Number(Number(data.basicSalary || 0).toFixed(2)),
        Number(Number(data.incentive || 0).toFixed(2)),
        Number(Number(data.deductions || 0).toFixed(2)),
        Number(netPaid.toFixed(2)),
        cleanCell(data.paymentMode || 'Bank Transfer', 30),
        cleanCell(data.transactionRef, 100),
        cleanCell(data.status || 'Disbursed', 30),
        cleanCell(data.notes, 500)
      ];

      sheet.appendRow(row);
      appendAudit(spreadsheet, data.actor, 'ADD_SALARY', 'Salaries', 'Disbursed ' + salaryId + ' of ₹' + netPaid + ' to ' + data.employeeName, data.clientIp);

      return jsonOutput({ ok: true, salaryId: salaryId, message: 'Salary disbursed and recorded successfully.' });
    }

    // 4. Add Employee
    if (action === 'add-employee') {
      const sheet = ensureSheet(spreadsheet, 'Employees');
      const empId = getNextId(sheet, 'EMP-');
      const name = cleanCell(data.name, 100);
      if (!name) return jsonOutput({ ok: false, message: 'Employee name is required.' });

      const row = [
        empId,
        name,
        cleanCell(data.role, 80),
        cleanCell(data.department, 80),
        cleanCell(data.phone, 30),
        cleanCell(data.email, 100),
        Number(Number(data.monthlySalary || 0).toFixed(2)),
        cleanCell(data.joiningDate, 10),
        cleanCell(data.status || 'Active', 30),
        cleanCell(data.bankUpi, 100),
        cleanCell(data.notes, 500)
      ];

      sheet.appendRow(row);
      appendAudit(spreadsheet, data.actor, 'ADD_EMPLOYEE', 'Employees', 'Registered ' + empId + ' (' + name + ')', data.clientIp);

      return jsonOutput({ ok: true, employeeId: empId, message: 'Employee added successfully.' });
    }

    // 5. Add OtherIncome
    if (action === 'add-other-income') {
      const sheet = ensureSheet(spreadsheet, 'OtherIncome');
      const incId = getNextId(sheet, 'INC-' + year + '-');
      const amount = Number(data.amount);
      if (!isFinite(amount) || amount <= 0) {
        return jsonOutput({ ok: false, message: 'Valid income amount greater than zero is required.' });
      }

      const row = [
        incId,
        cleanCell(data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), 10),
        cleanCell(data.source, 80),
        cleanCell(data.description, 200),
        Number(amount.toFixed(2)),
        cleanCell(data.paymentMode || 'UPI', 30),
        cleanCell(data.referenceNo, 100),
        cleanCell(data.receivedBy || 'Admin', 100),
        cleanCell(data.status || 'Received', 30),
        cleanCell(data.notes, 500)
      ];

      sheet.appendRow(row);
      appendAudit(spreadsheet, data.receivedBy, 'ADD_INCOME', 'OtherIncome', 'Recorded ' + incId + ' of ₹' + amount + ' (' + data.source + ')', data.clientIp);

      return jsonOutput({ ok: true, incomeId: incId, message: 'Other income recorded successfully.' });
    }

    // 6. Manual Audit Log Entry
    if (action === 'log-audit') {
      appendAudit(spreadsheet, data.actor, data.actionName || 'CUSTOM_ACTION', data.entity || 'General', data.details || '', data.clientIp);
      return jsonOutput({ ok: true, message: 'Audit entry recorded.' });
    }

    return jsonOutput({ ok: false, code: 'UNKNOWN_ACTION', message: 'Action not supported: ' + action });
  } catch (error) {
    return jsonOutput({ ok: false, code: 'SCRIPT_ERROR', message: String(error.message || error) });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
