import {
  getFinanceConnectionStatus,
  getFinanceSpreadsheetId,
  getFinanceWebAppUrl,
  getFinanceSheetSecret,
  verifySpreadsheetConnection,
  testFinanceReadWrite,
  getExpenses,
  addExpense,
  deleteExpense,
  getSalaries,
  addSalary,
  deleteSalary,
  getEmployees,
  addEmployee,
  getOtherIncome,
  addOtherIncome,
  deleteOtherIncome,
  getCategories,
  getAuditLog
} from '../server/finance-service.js';
import { setSetting, getSetting } from '../server/finance-db.js';
import {
  isFinancePasswordConfigured,
  setFinancePassword,
  verifyFinancePassword,
  hasFinanceSession,
  makeFinanceSessionCookie,
  clearFinanceSessionCookie,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  getFinanceEnvPassword
} from '../server/admin-auth.js';
import { fetchRawFeeRecords } from './_fees-handler.js';

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

function sanitizeFinanceMessage(error) {
  let message = String(error?.message || error || 'Finance service error.');
  const sensitiveKeys = [
    'Finance_PASSWORDS',
    'ADMIN_PASSWORD',
    'FINANCE_SHEET_SECRET',
    'FINANCE_WEBAPP_URL',
    'SHEET_SECRET',
    'SHEET_WEBAPP_URL',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_ACCESS_TOKEN'
  ];
  for (const name of sensitiveKeys) {
    if (process.env[name]) {
      message = message.split(process.env[name]).join('[redacted]');
    }
  }
  const dbSecret = getSetting('finance_sheet_secret');
  if (dbSecret) message = message.split(dbSecret).join('[redacted]');
  return message.slice(0, 500);
}

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  ).split(',')[0].trim().slice(0, 100);
}

function checkOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    const error = new Error('This request origin is not allowed.');
    error.status = 403;
    throw error;
  }
}

function getKolkataYmd(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {}
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let feeRecordsCache = {
  records: [],
  totalCollection: 0,
  totalTransactions: 0,
  todayCollection: 0,
  currentMonthCollection: 0,
  lastFetchedAt: 0
};

export async function getVerifiedFeeRecords({ forceRefresh = false } = {}) {
  const now = Date.now();
  // Return recent memory cache if within 15 seconds unless forced
  if (!forceRefresh && feeRecordsCache.records.length > 0 && (now - feeRecordsCache.lastFetchedAt) < 15000) {
    return feeRecordsCache;
  }

  let raw = [];
  try {
    raw = await fetchRawFeeRecords();
  } catch (err) {
    console.warn('Could not fetch raw fee records:', err.message);
  }

  if (Array.isArray(raw) && raw.length > 0) {
    const kolkataToday = getKolkataYmd();
    const kolkataMonth = kolkataToday.slice(0, 7);
    const seen = new Set();
    const records = [];
    let totalCollection = 0;
    let todayCollection = 0;
    let currentMonthCollection = 0;

    for (const r of raw) {
      const receiptNo = String(r.receiptNo || '').trim();
      if (!receiptNo || seen.has(receiptNo)) continue;
      seen.add(receiptNo);

      const amount = Number(r.amount) || 0;
      if (amount <= 0) continue; // Only successful payments > 0

      totalCollection += amount;
      const rDate = String(r.date || '').trim();
      if (rDate === kolkataToday) {
        todayCollection += amount;
      }
      if (rDate.startsWith(kolkataMonth)) {
        currentMonthCollection += amount;
      }

      records.push({
        receiptNo,
        date: rDate,
        studentName: r.studentName || '-',
        parentName: r.parentName || '-',
        phone: r.phone || '-',
        course: r.course || '-',
        batch: r.batch || '-',
        feePeriod: r.feePeriod || '-',
        amount,
        paymentMode: r.paymentMode || 'UPI',
        balanceDue: Number(r.balanceDue) || 0,
        collectedBy: r.collectedBy || '',
        remarks: r.remarks || '',
        status: 'Success',
        source: 'Fee Register'
      });
    }

    records.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    feeRecordsCache = {
      records,
      totalCollection,
      totalTransactions: records.length,
      todayCollection,
      currentMonthCollection,
      lastFetchedAt: now
    };

    try {
      setSetting('last_verified_fee_summary', {
        totalCollection,
        totalTransactions: records.length,
        todayCollection,
        currentMonthCollection,
        lastFetchedAt: now
      });
    } catch {}
  } else if (feeRecordsCache.records.length === 0) {
    // If memory is empty and sheet fetch was empty/failed, check persistent setting
    const saved = getSetting('last_verified_fee_summary');
    if (saved && saved.totalTransactions > 0) {
      return {
        ...saved,
        records: []
      };
    }
  }

  return feeRecordsCache;
}

export async function handleFinanceRequest(request) {
  try {
    const url = new URL(request.url);
    const method = request.method;
    const action = url.searchParams.get('action') || 'status';
    const clientIp = getClientIp(request);

    // 1. Auth Status check (public: reports whether Finance password exists and if session is active)
    if (method === 'GET' && action === 'auth-status') {
      const hasEnvPassword = Boolean(getFinanceEnvPassword());
      const hasDbPassword = Boolean(getSetting('admin_password_hash') && getSetting('admin_password_salt'));
      const isConfigured = isFinancePasswordConfigured();
      return json({
        ok: true,
        isSetupRequired: !isConfigured,
        authenticated: hasFinanceSession(request),
        authSource: hasEnvPassword ? 'environment' : (hasDbPassword ? 'database' : 'none'),
        hasEnvPassword,
        hasDbPassword
      });
    }

    // 2. First-time Admin Password Setup (only allowed when no Finance_PASSWORDS and no DB password exists)
    if (method === 'POST' && action === 'setup-password') {
      checkOrigin(request);
      checkRateLimit(clientIp, 5);

      const body = await request.json().catch(() => ({}));
      const { password, confirmPassword } = body;

      if (!password || typeof password !== 'string') {
        return json({ ok: false, message: 'Password is required.' }, 400);
      }
      if (password.trim().length < 8) {
        return json({ ok: false, message: 'Password must be at least 8 characters long.' }, 400);
      }
      if (password.trim() !== String(confirmPassword || '').trim()) {
        return json({ ok: false, message: 'Passwords do not match.' }, 400);
      }

      try {
        setFinancePassword(password, clientIp);
        clearRateLimit(clientIp);
        return json(
          { ok: true, message: 'Finance admin password successfully configured.' },
          200,
          { 'set-cookie': makeFinanceSessionCookie() }
        );
      } catch (err) {
        recordFailedAttempt(clientIp);
        return json({ ok: false, message: err.message }, err.status || 400);
      }
    }

    // 3. Finance Admin Login (strictly uses Finance_PASSWORDS or database hash)
    if (method === 'POST' && action === 'login') {
      checkOrigin(request);
      checkRateLimit(clientIp, 10);

      const body = await request.json().catch(() => ({}));
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!isFinancePasswordConfigured()) {
        return json({ ok: false, message: 'Finance password has not been created yet. Please complete initial setup.' }, 400);
      }

      if (!verifyFinancePassword(password)) {
        recordFailedAttempt(clientIp);
        return json({ ok: false, message: 'Password does not match.' }, 401);
      }

      clearRateLimit(clientIp);
      return json({ ok: true }, 200, { 'set-cookie': makeFinanceSessionCookie() });
    }

    // 4. Finance Admin Logout
    if (method === 'POST' && action === 'logout') {
      return json({ ok: true }, 200, { 'set-cookie': clearFinanceSessionCookie() });
    }

    // 5. All other management endpoints STRICTLY REQUIRE Finance Admin Authentication
    if (!hasFinanceSession(request)) {
      // Allow read-only status check so UI can display connection pills if permitted
      if (method === 'GET' && action === 'status') {
        const publicStatus = await getFinanceConnectionStatus();
        return json({
          ok: true,
          authenticated: false,
          isSetupRequired: !isFinancePasswordConfigured(),
          status: publicStatus.status,
          spreadsheetConfigured: Boolean(publicStatus.spreadsheetId),
          spreadsheetUrl: publicStatus.spreadsheetUrl
        });
      }
      return json({ ok: false, code: 'AUTH_REQUIRED', message: 'Finance admin authentication required.' }, 401);
    }

    // Authenticated GET actions
    if (method === 'GET') {
      if (action === 'status') {
        const status = await getFinanceConnectionStatus();
        return json({ ok: true, authenticated: true, isSetupRequired: false, ...status });
      }

      if (action === 'expenses') {
        const category = url.searchParams.get('category') || '';
        const search = url.searchParams.get('search') || '';
        const expenses = await getExpenses({ category, search });
        return json({ ok: true, expenses });
      }

      if (action === 'salaries') {
        const period = url.searchParams.get('period') || '';
        const salaries = await getSalaries({ period });
        return json({ ok: true, salaries });
      }

      if (action === 'employees') {
        const employees = await getEmployees();
        return json({ ok: true, employees });
      }

      if (action === 'other-income') {
        const records = await getOtherIncome();
        // Safeguard: Ensure no fee collections or tuition receipts leaked into other income
        const cleanRecords = records.filter(i => {
          const src = String(i.source || '').toLowerCase();
          const desc = String(i.description || '').toLowerCase();
          return !src.includes('fee collection') && !src.includes('tuition fee');
        });
        return json({ ok: true, records: cleanRecords });
      }

      if (action === 'fee-records') {
        const forceRefresh = url.searchParams.get('refresh') === 'true';
        const feeData = await getVerifiedFeeRecords({ forceRefresh });
        return json({
          ok: true,
          totalCollection: feeData.totalCollection,
          totalTransactions: feeData.totalTransactions,
          todayCollection: feeData.todayCollection,
          currentMonthCollection: feeData.currentMonthCollection,
          lastFetchedAt: feeData.lastFetchedAt,
          records: feeData.records
        });
      }

      if (action === 'categories') {
        const categories = await getCategories();
        return json({ ok: true, categories });
      }

      if (action === 'audit-log') {
        const limit = Number(url.searchParams.get('limit')) || 100;
        const logs = await getAuditLog(limit);
        return json({ ok: true, logs });
      }

      if (action === 'summary') {
        const status = await getFinanceConnectionStatus();

        // 1. Read student fee revenue directly from Fee Register via SHEET_SECRET (Read-only)
        const feeData = await getVerifiedFeeRecords({ forceRefresh: false });
        const feeTotal = feeData.totalCollection;
        const feeCount = feeData.totalTransactions;
        const todayCollection = feeData.todayCollection;
        const currentMonthCollection = feeData.currentMonthCollection;

        // 2. Read live expenses & salaries from Finance spreadsheet
        let operationalExpenses = 0;
        let salariesDisbursed = 0;
        let otherIncomeTotal = 0;

        if (status.hasConfig) {
          try {
            const expList = await getExpenses();
            operationalExpenses = expList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          } catch (eErr) {
            console.warn('Could not fetch expenses for summary:', eErr.message);
          }

          try {
            const salList = await getSalaries();
            salariesDisbursed = salList.reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
          } catch (sErr) {
            console.warn('Could not fetch salaries for summary:', sErr.message);
          }

          try {
            const incList = await getOtherIncome();
            // Filter out any potential fee collection duplicates
            otherIncomeTotal = incList
              .filter(i => {
                const src = String(i.source || '').toLowerCase();
                const desc = String(i.description || '').toLowerCase();
                return !src.includes('fee collection') && !src.includes('tuition fee');
              })
              .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          } catch (iErr) {
            console.warn('Could not fetch other income for summary:', iErr.message);
          }
        }

        const totalInflow = feeTotal + otherIncomeTotal;
        const totalOutflow = operationalExpenses + salariesDisbursed;
        const netMargin = totalInflow - totalOutflow;

        return json({
          ok: true,
          status: status.status,
          spreadsheetId: status.spreadsheetId,
          spreadsheetUrl: status.spreadsheetUrl,
          revenue: {
            feeCollection: feeTotal,
            feeTransactions: feeCount,
            todayCollection,
            currentMonthCollection,
            otherIncome: otherIncomeTotal,
            totalInflow
          },
          expenses: {
            operationalExpenses,
            salariesDisbursed,
            totalOutflow
          },
          netMargin
        });
      }

      return json({ ok: false, message: 'Invalid GET action.' }, 404);
    }

    // Authenticated POST actions
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));

      if (action === 'save-config') {
        const { webappUrl, secret, spreadsheetId, feeSpreadsheetId } = body;
        if (webappUrl !== undefined) setSetting('finance_webapp_url', String(webappUrl).trim());
        if (secret !== undefined) setSetting('finance_sheet_secret', String(secret).trim());
        if (spreadsheetId !== undefined) setSetting('finance_spreadsheet_id', String(spreadsheetId).trim());
        if (feeSpreadsheetId !== undefined) setSetting('fee_spreadsheet_id', String(feeSpreadsheetId).trim());

        const updatedStatus = await getFinanceConnectionStatus();
        return json({ ok: true, message: 'Finance configuration saved successfully.', status: updatedStatus });
      }

      if (action === 'sync') {
        const [feeData, sheetResult] = await Promise.all([
          getVerifiedFeeRecords({ forceRefresh: true }),
          verifySpreadsheetConnection().catch(err => ({ ok: false, message: err.message }))
        ]);
        setSetting('finance_last_synced_at', new Date().toISOString());
        return json({
          ok: true,
          message: 'Fee Register and Finance data synchronized successfully.',
          feeData: {
            totalCollection: feeData.totalCollection,
            totalTransactions: feeData.totalTransactions,
            todayCollection: feeData.todayCollection,
            currentMonthCollection: feeData.currentMonthCollection,
            lastFetchedAt: feeData.lastFetchedAt
          },
          sheetResult
        });
      }

      if (action === 'test-connection') {
        const testResult = await testFinanceReadWrite('Admin Verification', clientIp);
        return json(testResult);
      }

      if (action === 'add-expense') {
        const amount = Number(body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return json({ ok: false, message: 'Enter a valid expense amount greater than zero.' }, 400);
        }
        const result = await addExpense({
          ...body,
          amount,
          clientIp,
          recordedBy: body?.recordedBy || 'Admin'
        });
        return json(result, 201);
      }

      if (action === 'delete-expense') {
        const id = String(body?.id || '').trim();
        if (!id) {
          return json({ ok: false, message: 'Expense ID is required.' }, 400);
        }
        const result = await deleteExpense(id, 'Admin', clientIp);
        return json(result);
      }

      if (action === 'add-salary') {
        const employeeName = String(body?.employeeName || '').trim();
        if (!employeeName) {
          return json({ ok: false, message: 'Employee name is required.' }, 400);
        }
        const result = await addSalary({
          ...body,
          clientIp,
          actor: 'Admin'
        });
        return json(result, 201);
      }

      if (action === 'add-employee') {
        const name = String(body?.name || '').trim();
        if (!name) {
          return json({ ok: false, message: 'Employee full name is required.' }, 400);
        }
        const result = await addEmployee({
          ...body,
          clientIp,
          actor: 'Admin'
        });
        return json(result, 201);
      }

      if (action === 'delete-salary') {
        const id = String(body?.id || '').trim();
        if (!id) {
          return json({ ok: false, message: 'Salary ID is required.' }, 400);
        }
        const result = await deleteSalary(id, 'Admin', clientIp);
        return json(result);
      }

      if (action === 'add-other-income') {
        const amount = Number(body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return json({ ok: false, message: 'Enter a valid income amount greater than zero.' }, 400);
        }
        const result = await addOtherIncome({
          ...body,
          amount,
          clientIp,
          receivedBy: 'Admin'
        });
        return json(result, 201);
      }

      if (action === 'delete-other-income') {
        const id = String(body?.id || '').trim();
        if (!id) {
          return json({ ok: false, message: 'Income ID is required.' }, 400);
        }
        const result = await deleteOtherIncome(id, 'Admin', clientIp);
        return json(result);
      }

      return json({ ok: false, message: 'Invalid POST action.' }, 404);
    }

    return json({ ok: false, message: 'Method not allowed.' }, 405);
  } catch (error) {
    const safeMsg = sanitizeFinanceMessage(error);
    console.error('Finance API error:', safeMsg);
    return json({ ok: false, code: 'FINANCE_ERROR', message: safeMsg }, 500);
  }
}
