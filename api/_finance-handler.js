import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
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

const COOKIE = 'mjm_fees_admin';
const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

function hasAdminSession(request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const cookieHeader = request.headers.get('cookie') || '';
  const value = cookieHeader
    .split(';')
    .map(p => p.trim())
    .find(p => p.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);

  if (!value) return false;
  try {
    const [payload, signature, ...rest] = decodeURIComponent(value).split('.');
    if (!payload || !signature || rest.length) return false;
    const expected = createHmac('sha256', adminPassword).update(payload).digest('base64url');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function handleFinanceRequest(request) {
  try {
    const url = new URL(request.url);
    const method = request.method;
    const action = url.searchParams.get('action') || 'status';

    // OAuth callback endpoint (from Google redirect)
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

      // Automatically create Finance Google Spreadsheet in the user's Google Drive
      await createFinanceSpreadsheet(accessToken);

      return Response.redirect(new URL('/finance.html?setup=success', url.origin).toString(), 302);
    }

    // All other management endpoints require Admin Authentication
    if (!hasAdminSession(request)) {
      // Allow status check so the frontend knows if setup is required before login
      if (method === 'GET' && action === 'status') {
        const publicStatus = await getFinanceConnectionStatus();
        return json({
          ok: true,
          authenticated: false,
          status: publicStatus.status,
          spreadsheetConfigured: Boolean(publicStatus.spreadsheetId),
          spreadsheetUrl: publicStatus.spreadsheetUrl
        });
      }
      return json({ ok: false, code: 'AUTH_REQUIRED', message: 'Admin authentication required.' }, 401);
    }

    if (method === 'GET') {
      if (action === 'status') {
        const status = await getFinanceConnectionStatus();
        return json({ ok: true, authenticated: true, ...status });
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
