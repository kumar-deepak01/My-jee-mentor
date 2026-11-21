import {
  getFinanceConnectionStatus,
  getFinanceSpreadsheetId,
  getOAuthConfig,
  generateAuthUrl,
  exchangeAuthCode,
  createFinanceSpreadsheet,
  connectExistingSpreadsheet,
  getValidAccessToken,
  verifySpreadsheet
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
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_ACCESS_TOKEN'
  ];
  for (const name of sensitiveKeys) {
    if (process.env[name]) {
      message = message.split(process.env[name]).join('[redacted]');
    }
  }
  const dbRefresh = getSetting('google_refresh_token');
  if (dbRefresh) message = message.split(dbRefresh).join('[redacted]');
  const dbSecret = getSetting('google_client_secret');
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

    // 5. OAuth callback endpoint (from Google redirect)
    if (method === 'GET' && action === 'oauth-callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        return Response.redirect(new URL(`/finance.html?error=${encodeURIComponent(error)}`, url.origin).toString(), 302);
      }

      if (!code) {
        return Response.redirect(new URL('/finance.html?error=no_code_provided', url.origin).toString(), 302);
      }

      const redirectUri = new URL('/api/finance?action=oauth-callback', url.origin).toString();
      const tokenData = await exchangeAuthCode(code, redirectUri);
      const accessToken = tokenData.access_token || (await getValidAccessToken());

      // Automatically create Finance Google Spreadsheet in user's Google Drive
      await createFinanceSpreadsheet(accessToken);

      return Response.redirect(new URL('/finance.html?setup=success', url.origin).toString(), 302);
    }

    // 6. All other management endpoints STRICTLY REQUIRE Finance Admin Authentication
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

      if (action === 'auth-url') {
        const { clientId } = getOAuthConfig();
        if (!clientId) {
          return json({
            ok: false,
            needsConfig: true,
            message: 'Google OAuth Client ID is not configured. Please configure it in settings or environment variables.'
          }, 400);
        }
        const redirectUri = new URL('/api/finance?action=oauth-callback', url.origin).toString();
        const authUrl = generateAuthUrl(redirectUri);
        return json({ ok: true, authUrl });
      }

      if (action === 'summary') {
        const status = await getFinanceConnectionStatus();
        // Read student fee revenue directly from Google Sheets via SHEET_SECRET
        let feeTotal = 0;
        let feeCount = 0;
        try {
          const records = await fetchRawFeeRecords();
          if (Array.isArray(records)) {
            feeCount = records.length;
            feeTotal = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          }
        } catch (fErr) {
          console.warn('Could not read fee summary:', fErr.message);
        }

        return json({
          ok: true,
          status: status.status,
          spreadsheetId: status.spreadsheetId,
          spreadsheetUrl: status.spreadsheetUrl,
          revenue: {
            feeCollection: feeTotal,
            feeTransactions: feeCount,
            otherIncome: 0,
            totalInflow: feeTotal
          },
          expenses: {
            operationalExpenses: 0,
            salariesDisbursed: 0,
            totalOutflow: 0
          },
          netMargin: feeTotal
        });
      }

      return json({ ok: false, message: 'Invalid GET action.' }, 404);
    }

    // Authenticated POST actions
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));

      if (action === 'save-config') {
        const { clientId, clientSecret, refreshToken, spreadsheetId, feeSpreadsheetId } = body;
        if (clientId !== undefined) setSetting('google_client_id', String(clientId).trim());
        if (clientSecret !== undefined) setSetting('google_client_secret', String(clientSecret).trim());
        if (refreshToken !== undefined) setSetting('google_refresh_token', String(refreshToken).trim());
        if (spreadsheetId !== undefined) setSetting('finance_spreadsheet_id', String(spreadsheetId).trim());
        if (feeSpreadsheetId !== undefined) setSetting('fee_spreadsheet_id', String(feeSpreadsheetId).trim());

        const updatedStatus = await getFinanceConnectionStatus();
        return json({ ok: true, message: 'Configuration saved successfully.', status: updatedStatus });
      }

      if (action === 'auto-create') {
        const accessToken = await getValidAccessToken();
        const result = await createFinanceSpreadsheet(accessToken);
        return json(result);
      }

      if (action === 'connect-existing') {
        const spreadsheetId = body?.spreadsheetId || getFinanceSpreadsheetId();
        const result = await connectExistingSpreadsheet(spreadsheetId);
        return json(result);
      }

      if (action === 'sync') {
        const spreadsheetId = getFinanceSpreadsheetId();
        const accessToken = await getValidAccessToken();
        const verified = await verifySpreadsheet(spreadsheetId, accessToken);
        return json(verified);
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
