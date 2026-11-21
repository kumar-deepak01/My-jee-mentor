/**
 * My JEE Mentor - Finance Management Portal
 * 
 * Complete automated Google Sheets integration for Expenses, Salaries, Employees,
 * Other Income, Categories, and Audit Log.
 */

const ENDPOINT = '/api/finance';
const FEES_ENDPOINT = '/api/fees';

const escapeHtml = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

const formatInr = (amount, { showDecimals = false } = {}) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(Number(amount) || 0);
};

export function financePageMarkup() {
  return `
    <section class="fees-portal finance-portal">
      <div class="container">
        <!-- Admin Auth / First-time Setup Panel -->
        <section class="fees-panel fees-login-panel" data-finance-auth>
          <!-- First-time Setup View (shown only when no admin password exists) -->
          <div data-finance-setup-view hidden>
            <span class="eyebrow" style="color: #ea580c;">INITIAL ADMIN SETUP</span>
            <h2>Create Admin Password</h2>
            <p class="fees-help" style="margin-top: 6px; margin-bottom: 20px;">
              No admin password has been created yet. Create your private master password to secure the Finance Portal and Google Sheets data.
            </p>
            <form data-finance-setup-password-form>
              <label for="newAdminPassword">Choose Master Admin Password
                <input id="newAdminPassword" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters">
              </label>
              <label for="confirmAdminPassword" style="margin-top: 14px;">Confirm Admin Password
                <input id="confirmAdminPassword" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Re-enter password">
              </label>
              <button class="btn btn-primary" type="submit" data-finance-setup-button style="width: 100%; margin-top: 18px;">
                Set Password &amp; Unlock Finance Portal
              </button>
              <p class="fees-status" data-finance-setup-status role="status" aria-live="polite"></p>
            </form>
          </div>

          <!-- Normal Login View -->
          <div data-finance-login-view>
            <span class="eyebrow">FINANCE ADMIN LOGIN</span>
            <h2>Enter Admin Password</h2>
            <form data-finance-login>
              <label for="financePassword">Admin Password</label>
              <div class="fees-login-row">
                <input id="financePassword" name="password" type="password" required autocomplete="current-password" maxlength="300">
                <button class="btn btn-primary" type="submit" data-finance-login-button>Unlock Finance</button>
              </div>
              <p class="fees-status" data-finance-login-status role="status" aria-live="polite"></p>
            </form>
          </div>
        </section>

        <!-- Finance Dashboard -->
        <section class="fees-dashboard finance-dashboard" data-finance-dashboard hidden>
          <!-- Header & Connection Status -->
          <div class="finance-header">
            <div>
              <span class="eyebrow">PRIVATE FINANCE &amp; EXPENSES REGISTER</span>
              <h1 class="finance-heading">My JEE Mentor – Finance Management</h1>
              <p class="finance-sub">Automated Google Sheets integration, payroll, expenses, and revenue tracking.</p>
            </div>
            <div class="finance-header-actions">
              <!-- Live Connection Status Pill -->
              <div class="finance-status-pill status-loading" data-finance-status-pill>
                <span class="status-dot"></span>
                <span data-status-text>Checking connection…</span>
              </div>
              <button type="button" class="btn btn-outline finance-btn-sync" data-finance-sync title="Sync with Google Sheets">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="finance-sync-icon" data-finance-sync-icon>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Sync</span>
              </button>
              <a href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary finance-btn-open-sheet" data-open-sheet-link hidden>
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1.5 inline-block"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path></svg>
                <span>Open Finance Google Sheet</span>
              </a>
              <button class="btn btn-outline" type="button" data-finance-logout>Logout</button>
            </div>
          </div>

          <!-- Notification Banner -->
          <div class="finance-alert" data-finance-alert hidden role="status"></div>

          <!-- Automated Google Sheets Setup Box (Visible when setup required or not connected) -->
          <section class="fees-panel finance-setup-card" data-finance-setup-card>
            <div class="finance-setup-head">
              <div class="finance-setup-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <h3 class="finance-setup-title">Automated Google Sheets Initialization</h3>
                <p class="finance-setup-desc">
                  Initialize <strong>"My JEE Mentor – Finance Management"</strong> in your own Google Drive.
                  Automatically creates 6 configured worksheets: <em>Expenses, Salaries, Employees, OtherIncome, Categories,</em> and <em>AuditLog</em> with styled headers.
                </p>
              </div>
            </div>

            <!-- Verification Progress Checklist -->
            <div class="finance-checklist" data-finance-checklist>
              <div class="checklist-item" data-check="drive">
                <span class="checklist-icon">○</span>
                <span>Personal Google Drive Authorization</span>
              </div>
              <div class="checklist-item" data-check="sheet">
                <span class="checklist-icon">○</span>
                <span>Spreadsheet Creation: "My JEE Mentor – Finance Management"</span>
              </div>
              <div class="checklist-item" data-check="tabs">
                <span class="checklist-icon">○</span>
                <span>6 Worksheets &amp; Headers Initialized</span>
              </div>
              <div class="checklist-item" data-check="access">
                <span class="checklist-icon">○</span>
                <span>Read &amp; Write Access Verification</span>
              </div>
            </div>

            <!-- Setup Actions -->
            <div class="finance-setup-actions">
              <a href="#" class="btn btn-primary finance-btn-oauth" data-btn-oauth>
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mr-2 inline-block"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                <span>Authorize &amp; Auto-Create Finance Spreadsheet</span>
              </a>

              <button type="button" class="btn btn-outline" data-toggle-manual-setup>
                Connect Existing Spreadsheet ID / Settings
              </button>
            </div>

            <!-- Manual / Advanced Setup Accordion (collapsed by default) -->
            <div class="finance-manual-setup" data-manual-setup-box hidden>
              <hr class="finance-divider">
              <h4>Connect Existing Google Spreadsheet ID</h4>
              <p class="text-sm text-gray-500 mb-3">If you already created a spreadsheet or want to link a specific sheet, enter its ID below. We will verify and automatically add any missing worksheets.</p>
              <form class="finance-connect-form" data-form-connect-existing>
                <div class="finance-input-row">
                  <input type="text" name="spreadsheetId" placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" required class="fees-filter-input">
                  <button type="submit" class="btn btn-primary" data-btn-connect-existing>Verify &amp; Connect</button>
                </div>
              </form>

              <hr class="finance-divider">
              <h4>Google Cloud OAuth Settings (Optional)</h4>
              <p class="text-sm text-gray-500 mb-3">Configure your own Google Cloud OAuth 2.0 Client credentials if self-hosting outside default environment.</p>
              <form class="finance-oauth-config-form" data-form-oauth-config>
                <div class="finance-grid-two">
                  <label>Google Client ID
                    <input type="text" name="clientId" placeholder="xxxx.apps.googleusercontent.com" class="fees-filter-input">
                  </label>
                  <label>Google Client Secret
                    <input type="password" name="clientSecret" placeholder="••••••••••••••••" class="fees-filter-input">
                  </label>
                </div>
                <button type="submit" class="btn btn-outline mt-2" data-btn-save-config>Save OAuth Credentials</button>
              </form>
            </div>
          </section>

          <!-- Read-Only Fee Income Connection Banner -->
          <div class="finance-fee-source-banner">
            <div class="flex items-center gap-2">
              <span class="source-badge">Read-Only</span>
              <strong>Fee Collection Income Stream:</strong>
              <span data-fee-source-info>Connecting to Google Sheets fee register…</span>
            </div>
            <a href="/fees.html" class="text-orange-600 font-semibold text-xs hover:underline">View Fee Portal →</a>
          </div>

          <!-- High-Level Financial Summary KPI Grid -->
          <div class="fees-kpi-grid finance-summary-grid">
            <article class="fees-kpi-card kpi-total">
              <div class="fees-kpi-top">
                <span class="fees-kpi-label">Total Revenue Inflow</span>
                <span class="fees-kpi-icon icon-rupee">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 3h12M6 8h12M6 13l7.5 8M6 13h3a4.5 4.5 0 000-9H6"></path></svg>
                </span>
              </div>
              <div class="fees-kpi-value" data-kpi-finance="totalInflow">₹0</div>
              <div class="fees-kpi-sub" data-kpi-finance-sub="totalInflow">Fees + Other Income</div>
            </article>

            <article class="fees-kpi-card kpi-students">
              <div class="fees-kpi-top">
                <span class="fees-kpi-label">Student Fees (Read-Only)</span>
                <span class="fees-kpi-icon icon-students">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h5"></path></svg>
                </span>
              </div>
              <div class="fees-kpi-value" data-kpi-finance="feeIncome">₹0</div>
              <div class="fees-kpi-sub" data-kpi-finance-sub="feeIncome">0 fee receipts recorded</div>
            </article>

            <article class="fees-kpi-card kpi-highest">
              <div class="fees-kpi-top">
                <span class="fees-kpi-label">Operational Expenses</span>
                <span class="fees-kpi-icon icon-highest">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg>
                </span>
              </div>
              <div class="fees-kpi-value" data-kpi-finance="expenses">₹0</div>
              <div class="fees-kpi-sub" data-kpi-finance-sub="expenses">Rent, ads, printing &amp; utilities</div>
            </article>

            <article class="fees-kpi-card kpi-average">
              <div class="fees-kpi-top">
                <span class="fees-kpi-label">Salaries &amp; Payroll</span>
                <span class="fees-kpi-icon icon-average">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"></path></svg>
                </span>
              </div>
              <div class="fees-kpi-value" data-kpi-finance="salaries">₹0</div>
              <div class="fees-kpi-sub" data-kpi-finance-sub="salaries">Faculty &amp; staff honorarium</div>
            </article>

            <article class="fees-kpi-card kpi-month">
              <div class="fees-kpi-top">
                <span class="fees-kpi-label">Net Operating Balance</span>
                <span class="fees-kpi-icon icon-calendar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3v18h18"></path><path d="M18 9l-5 5-4-4-3 3"></path></svg>
                </span>
              </div>
              <div class="fees-kpi-value" data-kpi-finance="netMargin">₹0</div>
              <div class="fees-kpi-sub" data-kpi-finance-sub="netMargin">Inflow - Outflow</div>
            </article>
          </div>

          <!-- Finance Sheets Tabs & Structure Preview -->
          <section class="fees-panel finance-structure-panel">
            <div class="fees-history-heading">
              <div>
                <span class="eyebrow">AUTOMATED GOOGLE SHEETS TABS</span>
                <h3>Worksheets &amp; Column Structure</h3>
              </div>
              <div class="text-xs text-gray-500" data-finance-last-synced>Last checked: Never</div>
            </div>

            <div class="finance-tabs-grid">
              <div class="finance-tab-card">
                <div class="tab-card-head">
                  <h4>1. Expenses</h4>
                  <span class="tab-badge">Active</span>
                </div>
                <p>Vendor bills, institute rent, advertisements, utilities, study material printing, and supplies.</p>
                <div class="tab-columns">Columns: Expense ID, Date, Category, Description, Amount, Payment Mode, Vendor, Bill URL, Status, Notes</div>
              </div>

              <div class="finance-tab-card">
                <div class="tab-card-head">
                  <h4>2. Salaries</h4>
                  <span class="tab-badge">Active</span>
                </div>
                <p>Monthly disbursements to teaching faculty, student counselors, and administrative staff.</p>
                <div class="tab-columns">Columns: Salary ID, Payment Date, Period, Employee Name, Role, Basic, Bonus, Deductions, Net Paid, Mode, Status</div>
              </div>

              <div class="finance-tab-card">
                <div class="tab-card-head">
                  <h4>3. Employees</h4>
                  <span class="tab-badge">Active</span>
                </div>
                <p>Staff and faculty directory, compensation structure, phone, email, joining date, and status.</p>
                <div class="tab-columns">Columns: Employee ID, Full Name, Role, Department, Phone, Email, Monthly Salary, Status, Bank/UPI</div>
              </div>

              <div class="finance-tab-card">
                <div class="tab-card-head">
                  <h4>4. OtherIncome</h4>
                  <span class="tab-badge">Active</span>
                </div>
                <p>Non-tuition revenue streams: study material book sales, test series enrollments, private counselling.</p>
                <div class="tab-columns">Columns: Income ID, Date, Source, Description, Amount, Payment Mode, Reference No, Received By, Status</div>
              </div>

              <div class="finance-tab-card">
                <div class="tab-card-head">
                  <h4>5. Categories</h4>
                  <span class="tab-badge">Active</span>
                </div>
                <p>Budget categories and allocation caps for rent, honorarium, digital ads, web infrastructure, and books.</p>
                <div class="tab-columns">Columns: Category ID, Type, Category Name, Description, Monthly Budget, Status</div>
              </div>

              <div class="finance-tab-card">
                <div class="tab-card-head">
                  <h4>6. AuditLog</h4>
                  <span class="tab-badge">Active</span>
                </div>
                <p>Immutable record of all financial changes, disbursements, updates, and connection verifications.</p>
                <div class="tab-columns">Columns: Log ID, Timestamp, Actor, Action, Entity, Details, IP Address</div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>
  `;
}

async function api(endpoint, options = {}) {
  const { query, ...fetchOptions } = options;
  const url = new URL(endpoint, location.origin);
  for (const [k, v] of Object.entries(query || {})) {
    if (v) url.searchParams.set(k, v);
  }
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...fetchOptions
  });
  const payload = await response.json().catch(() => ({ message: 'Invalid response from server.' }));
  if (!response.ok) {
    throw Object.assign(new Error(payload.message || 'Request failed.'), { status: response.status });
  }
  return payload;
}

export function initFinancePage() {
  const authPanel = document.querySelector('[data-finance-auth]');
  const dashboardPanel = document.querySelector('[data-finance-dashboard]');
  if (!authPanel || !dashboardPanel) return;

  const loginForm = authPanel.querySelector('[data-finance-login]');
  const loginStatus = authPanel.querySelector('[data-finance-login-status]');
  const loginButton = authPanel.querySelector('[data-finance-login-button]');
  const setupView = authPanel.querySelector('[data-finance-setup-view]');
  const loginView = authPanel.querySelector('[data-finance-login-view]');
  const setupForm = authPanel.querySelector('[data-finance-setup-password-form]');
  const setupStatus = authPanel.querySelector('[data-finance-setup-status]');
  const setupButton = authPanel.querySelector('[data-finance-setup-button]');
  const logoutButton = dashboardPanel.querySelector('[data-finance-logout]');
  const statusPill = dashboardPanel.querySelector('[data-finance-status-pill]');
  const statusText = statusPill?.querySelector('[data-status-text]');
  const syncBtn = dashboardPanel.querySelector('[data-finance-sync]');
  const syncIcon = dashboardPanel.querySelector('[data-finance-sync-icon]');
  const openSheetLink = dashboardPanel.querySelector('[data-open-sheet-link]');
  const alertBox = dashboardPanel.querySelector('[data-finance-alert]');
  const setupCard = dashboardPanel.querySelector('[data-finance-setup-card]');
  const btnOAuth = dashboardPanel.querySelector('[data-btn-oauth]');
  const toggleManualBtn = dashboardPanel.querySelector('[data-toggle-manual-setup]');
  const manualSetupBox = dashboardPanel.querySelector('[data-manual-setup-box]');
  const formConnectExisting = dashboardPanel.querySelector('[data-form-connect-existing]');
  const formOAuthConfig = dashboardPanel.querySelector('[data-form-oauth-config]');
  const feeSourceInfo = dashboardPanel.querySelector('[data-fee-source-info]');
  const lastSyncedEl = dashboardPanel.querySelector('[data-finance-last-synced]');

  // Check URL params for setup results
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('setup') === 'success') {
    showAlert('Google Sheets setup completed successfully! Your finance spreadsheet has been created and verified.', false);
    history.replaceState(null, '', window.location.pathname);
  } else if (urlParams.get('error')) {
    showAlert(`Google Authorization Error: ${decodeURIComponent(urlParams.get('error'))}`, true);
    history.replaceState(null, '', window.location.pathname);
  }

  function showAlert(msg, isError = false) {
    if (!alertBox) return;
    alertBox.hidden = !msg;
    alertBox.textContent = msg || '';
    alertBox.className = `finance-alert ${isError ? 'is-error' : 'is-success'}`;
    if (!isError && msg) {
      setTimeout(() => { if (alertBox) alertBox.hidden = true; }, 6000);
    }
  }

  function setStatus(status, spreadsheetUrl = '') {
    if (!statusPill) return;
    statusPill.className = `finance-status-pill status-${status.toLowerCase().replace(/\s+/g, '-')}`;
    if (statusText) statusText.textContent = status;

    if (setupCard) {
      // If connected, collapse setup card or show compact verified state
      if (status === 'Connected') {
        setupCard.classList.add('is-connected');
        updateChecklist({ drive: true, sheet: true, tabs: true, access: true });
      } else {
        setupCard.classList.remove('is-connected');
      }
    }

    if (openSheetLink) {
      if (status === 'Connected' && spreadsheetUrl) {
        openSheetLink.href = spreadsheetUrl;
        openSheetLink.hidden = false;
      } else {
        openSheetLink.hidden = true;
      }
    }
  }

  function updateChecklist(states = {}) {
    Object.entries(states).forEach(([key, done]) => {
      const item = dashboardPanel.querySelector(`[data-check="${key}"]`);
      if (item) {
        item.classList.toggle('is-done', Boolean(done));
        const icon = item.querySelector('.checklist-icon');
        if (icon) icon.textContent = done ? '✓' : '○';
      }
    });
  }

  async function loadStatus() {
    try {
      const res = await api(ENDPOINT, { query: { action: 'status' } });
      setStatus(res.status || 'Not Connected', res.spreadsheetUrl);

      if (res.lastSyncedAt && lastSyncedEl) {
        const d = new Date(res.lastSyncedAt);
        lastSyncedEl.textContent = `Last synced: ${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      }

      if (res.feeIntegration && feeSourceInfo) {
        feeSourceInfo.textContent = res.feeIntegration.connected
          ? `Connected (${res.feeIntegration.source}) • 0 changes made to fee records`
          : 'Fee collection sheet not linked yet';
      }

      // Prepare OAuth URL
      try {
        const authUrlRes = await api(ENDPOINT, { query: { action: 'auth-url' } });
        if (authUrlRes.ok && authUrlRes.authUrl && btnOAuth) {
          btnOAuth.href = authUrlRes.authUrl;
        }
      } catch {
        // OAuth client ID not set in environment yet
      }

      // Load Summary KPIs
      loadSummary();
    } catch (err) {
      if (err.status === 401) {
        showLogin();
      } else {
        setStatus('Sync Error');
        showAlert(err.message || 'Could not connect to finance service.', true);
      }
    }
  }

  async function loadSummary() {
    try {
      const summary = await api(ENDPOINT, { query: { action: 'summary' } });
      if (summary.ok && summary.revenue) {
        const inflowNode = dashboardPanel.querySelector('[data-kpi-finance="totalInflow"]');
        const feeNode = dashboardPanel.querySelector('[data-kpi-finance="feeIncome"]');
        const feeSubNode = dashboardPanel.querySelector('[data-kpi-finance-sub="feeIncome"]');
        const expNode = dashboardPanel.querySelector('[data-kpi-finance="expenses"]');
        const salNode = dashboardPanel.querySelector('[data-kpi-finance="salaries"]');
        const netNode = dashboardPanel.querySelector('[data-kpi-finance="netMargin"]');

        if (inflowNode) inflowNode.textContent = formatInr(summary.revenue.totalInflow);
        if (feeNode) feeNode.textContent = formatInr(summary.revenue.feeCollection);
        if (feeSubNode) feeSubNode.textContent = `${summary.revenue.feeTransactions} fee receipts recorded`;
        if (expNode) expNode.textContent = formatInr(summary.expenses.operationalExpenses);
        if (salNode) salNode.textContent = formatInr(summary.expenses.salariesDisbursed);
        if (netNode) netNode.textContent = formatInr(summary.netMargin);
      }
    } catch (e) {
      console.warn('Could not load finance summary:', e);
    }
  }

  function showDashboard() {
    authPanel.hidden = true;
    dashboardPanel.hidden = false;
    loadStatus();
  }

  function showSetupView() {
    dashboardPanel.hidden = true;
    authPanel.hidden = false;
    if (setupView) setupView.hidden = false;
    if (loginView) loginView.hidden = true;
  }

  function showLogin(msg = '') {
    dashboardPanel.hidden = true;
    authPanel.hidden = false;
    if (setupView) setupView.hidden = true;
    if (loginView) loginView.hidden = false;
    if (loginStatus) {
      loginStatus.textContent = msg;
      loginStatus.className = `fees-status ${msg ? 'is-error' : ''}`;
    }
  }

  async function checkAuth() {
    try {
      const authRes = await api(ENDPOINT, { query: { action: 'auth-status' } });
      if (authRes.authenticated) {
        showDashboard();
      } else if (authRes.isSetupRequired) {
        showSetupView();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  setupForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (setupButton) setupButton.disabled = true;
    if (setupStatus) {
      setupStatus.textContent = 'Securing admin password…';
      setupStatus.className = 'fees-status';
    }

    const password = setupForm.elements.password.value;
    const confirmPassword = setupForm.elements.confirmPassword.value;

    if (password !== confirmPassword) {
      if (setupStatus) {
        setupStatus.textContent = 'Passwords do not match.';
        setupStatus.className = 'fees-status is-error';
      }
      if (setupButton) setupButton.disabled = false;
      return;
    }

    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'setup-password' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword })
      });
      if (res.ok) {
        showAlert('Admin master password successfully configured! You are now logged in.', false);
        setupForm.reset();
        showDashboard();
      } else {
        throw new Error(res.message || 'Failed to set password.');
      }
    } catch (err) {
      if (setupStatus) {
        setupStatus.textContent = err.message;
        setupStatus.className = 'fees-status is-error';
      }
    } finally {
      if (setupButton) setupButton.disabled = false;
    }
  });

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (loginButton) loginButton.disabled = true;
    if (loginStatus) {
      loginStatus.textContent = 'Verifying admin password…';
      loginStatus.className = 'fees-status';
    }
    try {
      const password = loginForm.elements.password.value;
      await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'login' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      loginForm.reset();
      showDashboard();
    } catch (err) {
      if (loginStatus) {
        loginStatus.textContent = err.message || 'Password does not match.';
        loginStatus.className = 'fees-status is-error';
      }
    } finally {
      if (loginButton) loginButton.disabled = false;
    }
  });

  logoutButton?.addEventListener('click', async () => {
    try {
      await api(ENDPOINT, { method: 'POST', query: { action: 'logout' } });
    } catch {}
    showLogin('You have been logged out.');
  });

  syncBtn?.addEventListener('click', async () => {
    if (syncIcon) syncIcon.classList.add('is-spinning');
    syncBtn.disabled = true;
    showAlert('Syncing and verifying Google Spreadsheet access…', false);
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'sync' }
      });
      if (res.ok) {
        showAlert('Google Spreadsheet successfully verified & synced!', false);
        loadStatus();
      }
    } catch (err) {
      showAlert(`Sync failed: ${err.message}`, true);
      setStatus('Sync Error');
    } finally {
      if (syncIcon) syncIcon.classList.remove('is-spinning');
      syncBtn.disabled = false;
    }
  });

  toggleManualBtn?.addEventListener('click', () => {
    if (manualSetupBox) manualSetupBox.hidden = !manualSetupBox.hidden;
  });

  formConnectExisting?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formConnectExisting.querySelector('[data-btn-connect-existing]');
    if (btn) btn.disabled = true;
    const spreadsheetId = formConnectExisting.elements.spreadsheetId.value.trim();
    showAlert(`Connecting and verifying spreadsheet ${spreadsheetId}…`, false);
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'connect-existing' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId })
      });
      if (res.ok) {
        showAlert('Spreadsheet connected successfully! All 6 worksheets verified.', false);
        formConnectExisting.reset();
        if (manualSetupBox) manualSetupBox.hidden = true;
        loadStatus();
      }
    } catch (err) {
      showAlert(`Connection failed: ${err.message}`, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  formOAuthConfig?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formOAuthConfig.querySelector('[data-btn-save-config]');
    if (btn) btn.disabled = true;
    const clientId = formOAuthConfig.elements.clientId.value.trim();
    const clientSecret = formOAuthConfig.elements.clientSecret.value.trim();
    try {
      await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'save-config' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      showAlert('Google OAuth credentials saved. You can now click "Authorize with Google Account".', false);
      loadStatus();
    } catch (err) {
      showAlert(`Failed to save OAuth config: ${err.message}`, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Check authentication status and determine if setup or login is needed
  checkAuth();
}
