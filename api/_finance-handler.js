import {
  getFinanceConnectionStatus,
  generateAuthUrl,
  exchangeAuthCode,
  createFinanceSpreadsheet,
  connectExistingSpreadsheet,
  getValidAccessToken,
  verifySpreadsheet
} from '../server/finance-service.js';
import { setSetting, getSetting } from '../server/finance-db.js';
import {
  isPasswordConfigured,
  setAdminPassword,
  verifyAdminPassword,
  hasAdminSession,
  makeSessionCookie,
  clearSessionCookie,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit
} from '../server/admin-auth.js';

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

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

    // 1. Auth Status check (public: tells frontend if setup is needed or if already logged in)
    if (method === 'GET' && action === 'auth-status') {
      return json({
        ok: true,
        isSetupRequired: !isPasswordConfigured(),
        authenticated: hasAdminSession(request)
      });
    }

    // 2. First-time Admin Password Setup
    if (method === 'POST' && action === 'setup-password') {
      checkOrigin(request);
      checkRateLimit(clientIp, 5);

      const body = await request.json().catch(() => ({}));
      const { password, confirmPassword } = body;

      if (!password || typeof password !== 'string') {
        return json({ ok: false, message: 'Password is required.' }, 400);
      }
      if (password.length < 8) {
        return json({ ok: false, message: 'Password must be at least 8 characters long.' }, 400);
      }
      if (password !== confirmPassword) {
        return json({ ok: false, message: 'Passwords do not match.' }, 400);
      }

      try {
        setAdminPassword(password, clientIp);
        clearRateLimit(clientIp);
        return json(
          { ok: true, message: 'Master admin password successfully configured.' },
          200,
          { 'set-cookie': makeSessionCookie() }
        );
      } catch (err) {
        recordFailedAttempt(clientIp);
        return json({ ok: false, message: err.message }, err.status || 400);
      }
    }

    // 3. Admin Login
    if (method === 'POST' && action === 'login') {
      checkOrigin(request);
      checkRateLimit(clientIp, 10);

      const body = await request.json().catch(() => ({}));
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!isPasswordConfigured()) {
        return json({ ok: false, message: 'Admin password has not been created yet. Please complete initial setup.' }, 400);
      }

      if (!verifyAdminPassword(password)) {
        recordFailedAttempt(clientIp);
        return json({ ok: false, message: 'Password does not match.' }, 401);
      }

      clearRateLimit(clientIp);
      return json({ ok: true }, 200, { 'set-cookie': makeSessionCookie() });
    }

    // 4. Admin Logout
    if (method === 'POST' && action === 'logout') {
      return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
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

    // 6. All other management endpoints STRICTLY REQUIRE Admin Authentication
    if (!hasAdminSession(request)) {
      // Allow read-only status check so UI can display connection pills if permitted
      if (method === 'GET' && action === 'status') {
        const publicStatus = await getFinanceConnectionStatus();
        return json({
          ok: true,
          authenticated: false,
          isSetupRequired: !isPasswordConfigured(),
          status: publicStatus.status,
          spreadsheetConfigured: Boolean(publicStatus.spreadsheetId),
          spreadsheetUrl: publicStatus.spreadsheetUrl
        });
      }
      return json({ ok: false, code: 'AUTH_REQUIRED', message: 'Admin authentication required.' }, 401);
    }

    // Authenticated GET actions
    if (method === 'GET') {
      if (action === 'status') {
        const status = await getFinanceConnectionStatus();
        return json({ ok: true, authenticated: true, isSetupRequired: false, ...status });
      }

      if (action === 'auth-url') {
        const redirectUri = new URL('/api/finance?action=oauth-callback', url.origin).toString();
        const authUrl = generateAuthUrl(redirectUri);
        return json({ ok: true, authUrl });
      }

      if (action === 'summary') {
        const status = await getFinanceConnectionStatus();
        // Read fee income stats from existing Fee Collection sheet
        let feeTotal = 0;
        let feeCount = 0;
        try {
          const feesReq = new Request(new URL('/api/fees', url.origin).toString(), {
            headers: request.headers
          });
          const feesHandler = (await import('./_fees-handler.js')).handleFeesRequest;
          const feesRes = await feesHandler(feesReq);
          const feesPayload = await feesRes.json();
          if (feesPayload.ok && Array.isArray(feesPayload.records)) {
            feeCount = feesPayload.records.length;
            feeTotal = feesPayload.records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
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
        const { clientId, clientSecret, feeSpreadsheetId } = body;
        if (clientId !== undefined) setSetting('google_client_id', String(clientId).trim());
        if (clientSecret !== undefined) setSetting('google_client_secret', String(clientSecret).trim());
        if (feeSpreadsheetId !== undefined) setSetting('fee_spreadsheet_id', String(feeSpreadsheetId).trim());

        const updatedStatus = await getFinanceConnectionStatus();
        return json({ ok: true, message: 'Configuration saved.', status: updatedStatus });
      }

      if (action === 'auto-create') {
        const accessToken = await getValidAccessToken();
        const result = await createFinanceSpreadsheet(accessToken);
        return json(result);
      }

      if (action === 'connect-existing') {
        const { spreadsheetId } = body;
        if (!spreadsheetId) {
          return json({ ok: false, message: 'Spreadsheet ID is required.' }, 400);
        }
        const result = await connectExistingSpreadsheet(spreadsheetId);
        return json(result);
      }

      if (action === 'sync') {
        const spreadsheetId = getSetting('finance_spreadsheet_id') || process.env.FINANCE_SPREADSHEET_ID;
        if (!spreadsheetId) {
          return json({ ok: false, message: 'No Finance Spreadsheet is configured.' }, 400);
        }
        const accessToken = await getValidAccessToken();
        const verified = await verifySpreadsheet(spreadsheetId, accessToken);
        return json(verified);
      }

      return json({ ok: false, message: 'Invalid POST action.' }, 404);
    }

    return json({ ok: false, message: 'Method not allowed.' }, 405);
  } catch (error) {
    console.error('Finance API error:', error);
    return json({ ok: false, code: 'FINANCE_ERROR', message: error.message || 'Finance service error.' }, 500);
  }
}
