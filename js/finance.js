/**
 * My JEE Mentor - SaaS Finance Management Portal
 * 
 * High-performance, executive financial management dashboard matching
 * the reference SaaS design with 10 sidebar navigation modules, interactive SVG charts,
 * real-time Google Sheets sync, and native multi-sheet Excel export.
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

const formatInr = (amount, { compact = false, showDecimals = false } = {}) => {
  const num = Number(amount) || 0;
  if (compact) {
    const abs = Math.abs(num);
    if (abs >= 10000000) return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    if (abs >= 100000) return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    if (abs >= 1000) return `₹${(num / 1000).toFixed(1).replace(/\.0$/, '')} k`;
    return `₹${Math.round(num)}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(num);
};

const getKolkataYmd = (date = new Date()) => {
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
};

const formatKolkataDateTime = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export function financePageMarkup() {
  const todayYmd = getKolkataYmd();

  return `
    <div class="finance-portal-wrapper">
      <!-- Admin Authentication Modal Panel (when not authenticated) -->
      <div class="finance-auth-container" data-finance-auth>
        <div class="finance-auth-card">
          <div class="finance-auth-logo">
            <div class="finance-logo-box">M</div>
            <div>
              <div class="finance-brand-name">My JEE Mentor</div>
              <div class="finance-brand-sub">Private Finance Portal</div>
            </div>
          </div>

          <!-- First-Time Master Setup View -->
          <div data-finance-setup-view hidden>
            <span class="finance-private-pill" style="margin-bottom: 12px;">FIRST-TIME SETUP</span>
            <h2 class="finance-auth-title">Create Master Password</h2>
            <p class="finance-auth-desc">Set your private master password to protect institute accounts, payroll, and financial records.</p>
            <form data-finance-setup-password-form>
              <div class="fn-form-group">
                <label class="fn-form-label" for="setupPass">Master Password</label>
                <input class="fn-input" id="setupPass" name="password" type="password" required minlength="8" placeholder="At least 8 characters">
              </div>
              <div class="fn-form-group">
                <label class="fn-form-label" for="setupPassConf">Confirm Password</label>
                <input class="fn-input" id="setupPassConf" name="confirmPassword" type="password" required minlength="8" placeholder="Re-enter password">
              </div>
              <button class="btn-fn-primary" type="submit" data-finance-setup-button style="margin-top: 14px;">Set Password &amp; Unlock</button>
              <p class="fees-status" data-finance-setup-status role="status" aria-live="polite"></p>
            </form>
          </div>

          <!-- Normal Admin Login View -->
          <div data-finance-login-view>
            <span class="finance-private-pill" style="margin-bottom: 12px;">🔒 RESTRICTED PORTAL</span>
            <h2 class="finance-auth-title">Admin Login</h2>
            <p class="finance-auth-desc">Enter your master administrator password to access institute financial analytics.</p>
            <p data-auth-note hidden style="font-size: 0.78rem; color: #64748b; margin-top: -8px; margin-bottom: 14px;"></p>
            <form data-finance-login>
              <div class="fn-form-group">
                <label class="fn-form-label" for="financePassword">Password</label>
                <input class="fn-input" id="financePassword" name="password" type="password" required autocomplete="current-password" placeholder="••••••••••••••••">
              </div>
              <button class="btn-fn-primary" type="submit" data-finance-login-button style="margin-top: 14px;">Unlock Dashboard</button>
              <p class="fees-status" data-finance-login-status role="status" aria-live="polite"></p>
            </form>
          </div>
        </div>
      </div>

      <!-- Main Authenticated SaaS Finance Shell -->
      <div class="finance-dashboard-shell" data-finance-dashboard hidden>
        <!-- Topbar Header -->
        <header class="finance-topbar">
          <div class="finance-topbar-left">
            <a href="/finance.html" class="finance-brand-wrap">
              <div class="finance-logo-box">M</div>
              <div>
                <div class="finance-brand-name">My JEE Mentor</div>
                <div class="finance-brand-sub">Online Institute</div>
              </div>
            </a>
            <span class="finance-private-pill">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
              PRIVATE FINANCE PORTAL
            </span>
          </div>

          <div class="finance-topbar-right">
            <!-- Google Sheets / Excel Live Sync Pill -->
            <div class="finance-data-pill" data-finance-status-pill>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
              </svg>
              <span class="finance-pulse-dot"></span>
              <span data-status-text>Data: Google Sheets (Live Sync)</span>
            </div>

            <!-- Last Sync Timestamp -->
            <span class="finance-last-sync" data-finance-last-synced>Last Sync: Today</span>

            <!-- Sync Now Button -->
            <button type="button" class="btn-fn-sync" data-finance-sync title="Sync with Google Sheets">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" data-finance-sync-icon>
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
              </svg>
              <span>Sync Now</span>
            </button>

            <!-- User Menu -->
            <div class="finance-user-menu">
              <button type="button" class="finance-user-btn" data-fn-user-toggle>
                <div class="finance-avatar-circle">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <span>Admin</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="finance-user-dropdown" data-fn-user-dropdown hidden>
                <button type="button" class="finance-dropdown-item" data-nav-target="settings">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                  <span>Sheet Settings</span>
                </button>
                <a href="https://docs.google.com/spreadsheets/d/13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8/edit" target="_blank" rel="noopener noreferrer" class="finance-dropdown-item">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <span>Open Google Sheet</span>
                </a>
                <button type="button" class="finance-dropdown-item" data-finance-logout style="color: #ef4444;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Body Shell: Sidebar + Content -->
        <div class="finance-shell">
          <!-- Dark Navy Sidebar with 10 Navigation Items -->
          <aside class="finance-sidebar">
            <div class="finance-nav-group">
              <button type="button" class="finance-nav-item active" data-view-btn="dashboard">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                <span>Finance Dashboard</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="fee-details">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h5"></path></svg>
                <span>Fee Collection</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="income">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg>
                <span>Add Income</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="expense">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Add Expense</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="salary">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"></path></svg>
                <span>Salary Management</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="transactions">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h5"></path></svg>
                <span>Transactions</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="categories">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0110 10H12V2z"></path></svg>
                <span>Expense Categories</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="marketing">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.2 8.4c.5.38.8.97.8 1.6v4a2 2 0 01-.8 1.6l-8 6a2 2 0 01-2.4 0l-8-6A2 2 0 012 14V10a2 2 0 01.8-1.6l8-6a2 2 0 012.4 0l8 6z"></path><line x1="12" y1="12" x2="12" y2="22"></line><line x1="12" y1="12" x2="21" y2="8.5"></line><line x1="12" y1="12" x2="3" y2="8.5"></line></svg>
                <span>Marketing Analytics</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="reports">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span>Reports</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="export">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Excel Export</span>
              </button>

              <button type="button" class="finance-nav-item" data-view-btn="settings">
                <svg class="finance-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                <span>Settings</span>
              </button>
            </div>

            <!-- Bottom Privacy Card -->
            <div class="finance-sidebar-footer">
              <div class="finance-private-card">
                <div class="finance-private-card-head">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                  <span>Private Access</span>
                </div>
                <p class="finance-private-card-text">This finance panel is hidden and accessible only via direct link.</p>
              </div>
            </div>
          </aside>

          <!-- Main Content View Area -->
          <main class="finance-main">
            <!-- Global Flash Banner -->
            <div class="finance-alert" data-finance-alert hidden role="status"></div>

            <!-- VIEW 1: FINANCE DASHBOARD (Primary view matching the reference layout) -->
            <section class="fn-view-panel active" id="view-dashboard">
              <!-- View Header -->
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Finance Dashboard</h1>
                  <p class="finance-view-sub">Track income, expenses, profit and institute financial health in real-time <span style="color: #ea580c; font-weight: 600;">(Google Sheets &amp; Excel Powered)</span></p>
                </div>
                <div class="finance-view-controls">
                  <select class="fn-select-control" data-fn-month-filter>
                    <option value="current">📅 Nov 2026</option>
                    <option value="prev">Oct 2026</option>
                    <option value="all">All Time</option>
                  </select>
                  <select class="fn-select-control" data-fn-view-type>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                  <button type="button" class="btn-fn-export" data-quick-export-excel>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Export (Excel)</span>
                  </button>
                </div>
              </div>

              <!-- 6 Compact KPI Cards Grid -->
              <div class="finance-kpi-grid">
                <!-- 1: Total Income -->
                <article class="fn-kpi-card">
                  <div class="fn-kpi-top">
                    <div class="fn-kpi-icon-wrap" style="background: var(--fn-green-soft); color: var(--fn-green);">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                    </div>
                    <span class="fn-kpi-label">Total Income</span>
                  </div>
                  <div class="fn-kpi-val" data-kpi="totalIncome">₹0</div>
                  <div class="fn-kpi-sub pos" data-kpi-sub="totalIncome">Tuition fees &amp; other inflow</div>
                </article>

                <!-- 2: Total Expenses -->
                <article class="fn-kpi-card">
                  <div class="fn-kpi-top">
                    <div class="fn-kpi-icon-wrap" style="background: var(--fn-pink-soft); color: var(--fn-pink);">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <span class="fn-kpi-label">Total Expenses</span>
                  </div>
                  <div class="fn-kpi-val" data-kpi="totalExpenses">₹0</div>
                  <div class="fn-kpi-sub" data-kpi-sub="totalExpenses">Operational &amp; payroll outflow</div>
                </article>

                <!-- 3: Net Profit -->
                <article class="fn-kpi-card">
                  <div class="fn-kpi-top">
                    <div class="fn-kpi-icon-wrap" style="background: var(--fn-blue-soft); color: var(--fn-blue);">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3v18h18"></path><path d="M18 9l-5 5-4-4-3 3"></path></svg>
                    </div>
                    <span class="fn-kpi-label">Net Profit</span>
                  </div>
                  <div class="fn-kpi-val" data-kpi="netProfit">₹0</div>
                  <div class="fn-kpi-sub" data-kpi-sub="netProfit">Margin: 0%</div>
                </article>

                <!-- 4: Fee Collection -->
                <article class="fn-kpi-card" data-nav-target="fee-details" style="cursor: pointer;" title="Click to view detailed Fee Collection receipts">
                  <div class="fn-kpi-top">
                    <div class="fn-kpi-icon-wrap" style="background: var(--fn-purple-soft); color: var(--fn-purple);">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h5"></path></svg>
                    </div>
                    <span class="fn-kpi-label">Fee Collection</span>
                  </div>
                  <div class="fn-kpi-val" data-kpi="feeCollection">₹0</div>
                  <div class="fn-kpi-sub" data-kpi-sub="feeCollection">Verified Fee Receipts</div>
                </article>

                <!-- 5: Marketing Expense -->
                <article class="fn-kpi-card">
                  <div class="fn-kpi-top">
                    <div class="fn-kpi-icon-wrap" style="background: var(--fn-orange-soft); color: var(--fn-orange);">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path></svg>
                    </div>
                    <span class="fn-kpi-label">Marketing Expense</span>
                  </div>
                  <div class="fn-kpi-val" data-kpi="marketingExpense">₹0</div>
                  <div class="fn-kpi-sub" data-kpi-sub="marketingExpense">0.0% of Total Expense</div>
                </article>

                <!-- 6: Teacher Salary -->
                <article class="fn-kpi-card">
                  <div class="fn-kpi-top">
                    <div class="fn-kpi-icon-wrap" style="background: var(--fn-cyan-soft); color: var(--fn-cyan);">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <span class="fn-kpi-label">Teacher Salary</span>
                  </div>
                  <div class="fn-kpi-val" data-kpi="teacherSalary">₹0</div>
                  <div class="fn-kpi-sub" data-kpi-sub="teacherSalary">0 Disbursed</div>
                </article>
              </div>

              <!-- Main Split Grid: Left (Charts & Tables) + Right (Quick Add & Excel Card) -->
              <div class="finance-dashboard-grid">
                <!-- Left 70% Column -->
                <div class="finance-dashboard-left">
                  <!-- Row 1: Income vs Expense Trend + Donut Chart -->
                  <div class="finance-charts-row">
                    <!-- Income vs Expense Trend Bar Chart -->
                    <article class="fn-card">
                      <div class="fn-card-head">
                        <div>
                          <h3 class="fn-card-title">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--fn-orange)" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            <span>Income vs Expense Trend</span>
                          </h3>
                          <p class="fn-card-sub">Monthly income, expenses and profit comparison</p>
                        </div>
                        <div class="fn-legend">
                          <div class="fn-legend-item"><span class="fn-legend-dot" style="background: var(--fn-green);"></span><span>Income</span></div>
                          <div class="fn-legend-item"><span class="fn-legend-dot" style="background: #f87171;"></span><span>Expense</span></div>
                          <div class="fn-legend-item"><span class="fn-legend-dot" style="background: var(--fn-blue);"></span><span>Profit</span></div>
                        </div>
                      </div>
                      <div class="fn-chart-viewport" data-chart-trend-container>
                        <!-- Dynamic SVG Chart Rendered in JS -->
                      </div>
                    </article>

                    <!-- Expense Breakdown Donut Chart -->
                    <article class="fn-card">
                      <div class="fn-card-head">
                        <div>
                          <h3 class="fn-card-title">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--fn-orange)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0110 10H12V2z"></path></svg>
                            <span>Expense Breakdown</span>
                          </h3>
                        </div>
                      </div>
                      <div class="fn-donut-wrap" data-donut-container>
                        <!-- Dynamic SVG Donut + Legend Rendered in JS -->
                      </div>
                    </article>
                  </div>

                  <!-- Row 2: Expense by Category + Recent Transactions -->
                  <div class="finance-charts-row">
                    <!-- Expense by Category Horizontal Bars -->
                    <article class="fn-card">
                      <div class="fn-card-head">
                        <div>
                          <h3 class="fn-card-title">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--fn-orange)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle></svg>
                            <span>Expense by Category (₹)</span>
                          </h3>
                        </div>
                      </div>
                      <div class="fn-category-bar-list" data-cat-bars-container>
                        <!-- Dynamic Bars Rendered in JS -->
                      </div>
                    </article>

                    <!-- Recent Transactions Table -->
                    <article class="fn-card">
                      <div class="fn-card-head">
                        <div>
                          <h3 class="fn-card-title">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--fn-orange)" stroke-width="2.2"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V8z"></path></svg>
                            <span>Recent Transactions</span>
                          </h3>
                        </div>
                        <button type="button" class="btn btn-link" data-nav-target="transactions" style="font-size: 0.78rem; color: var(--fn-orange); font-weight: 700; border: none; background: none; cursor: pointer;">
                          View All →
                        </button>
                      </div>
                      <div class="fn-table-wrap">
                        <table class="fn-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Type</th>
                              <th>Category</th>
                              <th>Details</th>
                              <th style="text-align: right;">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody data-recent-tx-rows>
                            <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">Loading transactions…</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                </div>

                <!-- Right 30% Column: Quick Add + Excel Live Card -->
                <div class="finance-dashboard-right">
                  <!-- Card 1: + Quick Add Expense -->
                  <article class="fn-quick-add-card">
                    <h3 class="fn-card-title" style="margin-bottom: 14px;">
                      <span style="color: var(--fn-orange);">+</span> Quick Add Expense
                    </h3>
                    <form data-quick-expense-form>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Expense Category *</label>
                        <select class="fn-select" name="category" required>
                          <option value="Marketing - Google Ads">Marketing - Google Ads</option>
                          <option value="Marketing - Meta Ads">Marketing - Meta Ads</option>
                          <option value="Teacher Salary">Teacher Salary</option>
                          <option value="Counselor Salary">Counselor Salary</option>
                          <option value="Technical Team">Technical Team</option>
                          <option value="Study Material &amp; Printing">Study Material &amp; Printing</option>
                          <option value="Office Rent &amp; Utilities">Office Rent &amp; Utilities</option>
                          <option value="Other (Ops, Tools, etc.)">Other (Ops, Tools, etc.)</option>
                        </select>
                      </div>

                      <div class="fn-form-row-two">
                        <div class="fn-form-group">
                          <label class="fn-form-label">Amount (₹) *</label>
                          <input class="fn-input" type="number" name="amount" min="1" step="0.01" required placeholder="5000">
                        </div>
                        <div class="fn-form-group">
                          <label class="fn-form-label">Date *</label>
                          <input class="fn-input" type="date" name="date" value="${todayYmd}" required>
                        </div>
                      </div>

                      <div class="fn-form-group">
                        <label class="fn-form-label">Remarks (Optional)</label>
                        <input class="fn-input" type="text" name="notes" placeholder="e.g. Google Ads - JEE Campaign">
                      </div>

                      <button class="btn-fn-primary" type="submit" data-btn-quick-expense style="margin-top: 6px;">Add Expense</button>
                      <p class="fees-status" data-quick-expense-status role="status" aria-live="polite"></p>
                    </form>
                  </article>

                  <!-- Card 2: Excel Integration (Live) -->
                  <article class="fn-excel-live-card">
                    <div class="fn-excel-title">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                      </svg>
                      <span>Excel Integration (Live)</span>
                    </div>
                    <ul class="fn-check-list">
                      <li class="fn-check-item">
                        <span class="fn-check-icon">✓</span>
                        <span>All income &amp; expenses are saved to Google Sheets / Excel</span>
                      </li>
                      <li class="fn-check-item">
                        <span class="fn-check-icon">✓</span>
                        <span>Real-time sync with Google Sheets / Excel</span>
                      </li>
                      <li class="fn-check-item">
                        <span class="fn-check-icon">✓</span>
                        <span>No separate database required</span>
                      </li>
                      <li class="fn-check-item">
                        <span class="fn-check-icon">✓</span>
                        <span>Download complete finance report (Excel)</span>
                      </li>
                    </ul>
                  </article>
                </div>
              </div>
            </section>

            <!-- VIEW: FEE COLLECTION DETAILS (Imported from Fee Register) -->
            <section class="fn-view-panel" id="view-fee-details">
              <div class="finance-view-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap;">
                    <h1 class="finance-view-title" style="margin: 0;">Fee Collection Details</h1>
                    <span class="fn-badge income" style="font-size: 0.74rem; padding: 3px 8px;">Imported from Fee Register – Read Only</span>
                  </div>
                  <p class="finance-view-sub">Individual verified student tuition fee receipts directly imported from the Fee Register Google Sheet</p>
                </div>
                <div class="finance-view-controls">
                  <button type="button" class="btn-fn-export" data-export-type="fees">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Export Fee Receipts (.xlsx)</span>
                  </button>
                </div>
              </div>

              <!-- Top 4 Metrics Cards -->
              <div class="finance-kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Total Successful Collection</div>
                  <div class="fn-kpi-val" data-fee-kpi="totalCollection" style="color: var(--fn-green);">₹0</div>
                  <div class="fn-kpi-sub">All Verified Unique Receipts</div>
                </article>
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Total Successful Transactions</div>
                  <div class="fn-kpi-val" data-fee-kpi="totalCount">0</div>
                  <div class="fn-kpi-sub">Unique Receipt Numbers</div>
                </article>
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Today's Collection</div>
                  <div class="fn-kpi-val" data-fee-kpi="todayCollection">₹0</div>
                  <div class="fn-kpi-sub">Asia/Kolkata Timezone</div>
                </article>
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Current Month Collection</div>
                  <div class="fn-kpi-val" data-fee-kpi="monthCollection">₹0</div>
                  <div class="fn-kpi-sub">Monthly Student Inflow</div>
                </article>
              </div>

              <!-- Filter & Search Card -->
              <article class="fn-card" style="margin-bottom: 18px; padding: 14px 18px;">
                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                  <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; flex: 1;">
                    <div style="position: relative; min-width: 240px; flex: 1;">
                      <input type="search" class="fn-input" placeholder="Search student name, receipt no, parent, phone…" data-fee-search style="width: 100%;">
                    </div>
                    <select class="fn-select-control" data-fee-course-filter style="min-width: 140px;">
                      <option value="all">All Courses</option>
                    </select>
                    <select class="fn-select-control" data-fee-month-filter style="min-width: 130px;">
                      <option value="all">All Months</option>
                    </select>
                    <select class="fn-select-control" data-fee-mode-filter style="min-width: 130px;">
                      <option value="all">All Modes</option>
                      <option value="UPI">UPI</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                  <button type="button" class="btn btn-outline" data-fee-reset-filters style="padding: 6px 12px; font-size: 0.78rem;">
                    Reset Filters
                  </button>
                </div>
              </article>

              <!-- Detailed Fee Table -->
              <article class="fn-card">
                <div class="fn-table-wrap">
                  <table class="fn-table">
                    <thead>
                      <tr>
                        <th>Receipt No</th>
                        <th>Student Name</th>
                        <th>Course / Batch</th>
                        <th>Payment Date</th>
                        <th style="text-align: right;">Amount (₹)</th>
                        <th>Payment Mode</th>
                        <th>Payment Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody data-fee-table-rows>
                      <tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 28px;">Loading fee collection records…</td></tr>
                    </tbody>
                  </table>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--fn-border); font-size: 0.82rem; color: #64748b;">
                  <span data-fee-table-summary>Showing 0 of 0 receipts</span>
                  <span style="font-weight: 600; color: var(--fn-green);" data-fee-table-reconciled>✓ 100% Reconciled with Fee Collection KPI</span>
                </div>
              </article>
            </section>

            <!-- VIEW 2: ADD INCOME -->
            <section class="fn-view-panel" id="view-income">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Add Income</h1>
                  <p class="finance-view-sub">Record non-tuition revenue streams (test series, books, demo counselling, sponsorships)</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1.2fr 2fr; gap: 24px;">
                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 16px;">Record Income Stream</h3>
                  <form data-full-income-form>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Income Source / Category *</label>
                      <select class="fn-select" name="source" required>
                        <option value="Study Material &amp; Books">Study Material &amp; Books</option>
                        <option value="Test Series Enrollment">Test Series Enrollment</option>
                        <option value="Private Counselling Session">Private Counselling Session</option>
                        <option value="Merit Scholarship Grant">Merit Scholarship Grant</option>
                        <option value="Crash Course Tuition">Crash Course Tuition</option>
                        <option value="Other Income">Other Income</option>
                      </select>
                    </div>
                    <div class="fn-form-row-two">
                      <div class="fn-form-group">
                        <label class="fn-form-label">Amount (₹) *</label>
                        <input class="fn-input" type="number" name="amount" min="1" step="0.01" required placeholder="2500">
                      </div>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Date *</label>
                        <input class="fn-input" type="date" name="date" value="${todayYmd}" required>
                      </div>
                    </div>
                    <div class="fn-form-row-two">
                      <div class="fn-form-group">
                        <label class="fn-form-label">Payment Mode *</label>
                        <select class="fn-select" name="paymentMode" required>
                          <option value="UPI">UPI</option>
                          <option value="Net Banking">Net Banking</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Reference / UTR No.</label>
                        <input class="fn-input" type="text" name="referenceNo" placeholder="UPI Ref / Transaction ID">
                      </div>
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Description / Student Name</label>
                      <input class="fn-input" type="text" name="description" placeholder="e.g. JEE Rank Booster Test Series - Ravi K">
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Notes</label>
                      <input class="fn-input" type="text" name="notes" placeholder="Optional remarks">
                    </div>
                    <button class="btn-fn-primary" type="submit" data-btn-save-income style="margin-top: 10px;">Save Income to Google Sheets</button>
                    <p class="fees-status" data-income-form-status role="status" aria-live="polite"></p>
                  </form>
                </article>

                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 16px;">Recorded Other Income</h3>
                  <div class="fn-table-wrap">
                    <table class="fn-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Source</th>
                          <th>Description</th>
                          <th>Mode</th>
                          <th style="text-align: right;">Amount (₹)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody data-income-table-rows>
                        <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No other income recorded yet.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            </section>

            <!-- VIEW 3: ADD EXPENSE (Comprehensive Expense Manager) -->
            <section class="fn-view-panel" id="view-expense">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Add &amp; Manage Expenses</h1>
                  <p class="finance-view-sub">Track digital marketing ads, center rent, book printing, software, and vendor invoices</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1.2fr 2fr; gap: 24px;">
                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 16px;">Record Institute Expense</h3>
                  <form data-full-expense-form>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Category *</label>
                      <select class="fn-select" name="category" required>
                        <option value="Marketing - Google Ads">Marketing - Google Ads</option>
                        <option value="Marketing - Meta Ads">Marketing - Meta Ads</option>
                        <option value="Marketing - Print &amp; Hoardings">Marketing - Print &amp; Hoardings</option>
                        <option value="Teacher Salary">Teacher Salary</option>
                        <option value="Counselor Salary">Counselor Salary</option>
                        <option value="Technical Team">Technical Team</option>
                        <option value="Study Material &amp; Printing">Study Material &amp; Printing</option>
                        <option value="Office Rent &amp; Utilities">Office Rent &amp; Utilities</option>
                        <option value="Software &amp; Web Hosting">Software &amp; Web Hosting</option>
                        <option value="Other (Ops, Tools, etc.)">Other (Ops, Tools, etc.)</option>
                      </select>
                    </div>
                    <div class="fn-form-row-two">
                      <div class="fn-form-group">
                        <label class="fn-form-label">Amount (₹) *</label>
                        <input class="fn-input" type="number" name="amount" min="1" step="0.01" required placeholder="10000">
                      </div>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Date *</label>
                        <input class="fn-input" type="date" name="date" value="${todayYmd}" required>
                      </div>
                    </div>
                    <div class="fn-form-row-two">
                      <div class="fn-form-group">
                        <label class="fn-form-label">Paid To / Vendor *</label>
                        <input class="fn-input" type="text" name="paidTo" required placeholder="e.g. Google India / Cyber Printer">
                      </div>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Payment Mode *</label>
                        <select class="fn-select" name="paymentMode" required>
                          <option value="UPI">UPI</option>
                          <option value="Net Banking">Net Banking</option>
                          <option value="Card">Card</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Description *</label>
                      <input class="fn-input" type="text" name="description" required placeholder="e.g. Google Ads JEE November Sprint Campaign">
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Invoice / Bill URL (Optional)</label>
                      <input class="fn-input" type="url" name="invoiceUrl" placeholder="https://drive.google.com/file/...">
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Remarks</label>
                      <input class="fn-input" type="text" name="notes" placeholder="Approval reference or batch details">
                    </div>
                    <button class="btn-fn-primary" type="submit" data-btn-save-expense style="margin-top: 10px;">Save Expense to Google Sheets</button>
                    <p class="fees-status" data-expense-form-status role="status" aria-live="polite"></p>
                  </form>
                </article>

                <article class="fn-card">
                  <div class="fn-card-head">
                    <h3 class="fn-card-title">Expense Register</h3>
                    <input type="search" class="fn-input" placeholder="Search expenses…" data-search-expenses style="width: 200px; padding: 4px 10px; font-size: 0.78rem;">
                  </div>
                  <div class="fn-table-wrap">
                    <table class="fn-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Paid To</th>
                          <th style="text-align: right;">Amount (₹)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody data-expense-table-rows>
                        <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No expenses recorded yet.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            </section>

            <!-- VIEW 4: SALARY MANAGEMENT (Faculty & Staff Payroll) -->
            <section class="fn-view-panel" id="view-salary">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Salary Management</h1>
                  <p class="finance-view-sub">Manage faculty honorarium, counselors, and staff monthly payroll</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1.2fr 2fr; gap: 24px;">
                <div style="display: flex; flex-direction: column; gap: 20px;">
                  <!-- Disburse Salary Form -->
                  <article class="fn-card">
                    <h3 class="fn-card-title" style="margin-bottom: 16px;">Disburse Monthly Salary</h3>
                    <form data-salary-form>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Employee / Faculty *</label>
                        <select class="fn-select" name="employeeId" data-salary-emp-select required>
                          <option value="">Select Employee</option>
                        </select>
                      </div>
                      <div class="fn-form-row-two">
                        <div class="fn-form-group">
                          <label class="fn-form-label">Period / Month *</label>
                          <input class="fn-input" type="text" name="period" value="November 2026" required>
                        </div>
                        <div class="fn-form-group">
                          <label class="fn-form-label">Payment Date *</label>
                          <input class="fn-input" type="date" name="paymentDate" value="${todayYmd}" required>
                        </div>
                      </div>
                      <div class="fn-form-row-two">
                        <div class="fn-form-group">
                          <label class="fn-form-label">Basic Salary (₹) *</label>
                          <input class="fn-input" type="number" name="basicSalary" min="1" step="0.01" required placeholder="30000" data-sal-calc>
                        </div>
                        <div class="fn-form-group">
                          <label class="fn-form-label">Incentive / Bonus (₹)</label>
                          <input class="fn-input" type="number" name="bonus" min="0" step="0.01" value="0" data-sal-calc>
                        </div>
                      </div>
                      <div class="fn-form-row-two">
                        <div class="fn-form-group">
                          <label class="fn-form-label">Deductions (₹)</label>
                          <input class="fn-input" type="number" name="deductions" min="0" step="0.01" value="0" data-sal-calc>
                        </div>
                        <div class="fn-form-group">
                          <label class="fn-form-label">Net Paid (₹)</label>
                          <input class="fn-input" type="number" name="netPaid" readonly style="background: #f8fafc; font-weight: 700; color: var(--fn-green);" placeholder="30000">
                        </div>
                      </div>
                      <div class="fn-form-group">
                        <label class="fn-form-label">Payment Mode *</label>
                        <select class="fn-select" name="paymentMode" required>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                      <button class="btn-fn-primary" type="submit" data-btn-save-salary style="margin-top: 10px;">Record Salary Payment</button>
                      <p class="fees-status" data-salary-form-status role="status" aria-live="polite"></p>
                    </form>
                  </article>

                  <!-- Add New Employee Card -->
                  <article class="fn-card">
                    <h3 class="fn-card-title" style="margin-bottom: 12px;">Add New Employee / Faculty</h3>
                    <form data-add-emp-form>
                      <div class="fn-form-row-two">
                        <div class="fn-form-group">
                          <label class="fn-form-label">Full Name *</label>
                          <input class="fn-input" type="text" name="name" required placeholder="e.g. Dr. Alok Kumar">
                        </div>
                        <div class="fn-form-group">
                          <label class="fn-form-label">Role *</label>
                          <select class="fn-select" name="role" required>
                            <option value="Senior Physics Faculty">Senior Physics Faculty</option>
                            <option value="Chemistry Faculty">Chemistry Faculty</option>
                            <option value="Maths Faculty">Maths Faculty</option>
                            <option value="Student Counselor">Student Counselor</option>
                            <option value="Technical Lead">Technical Lead</option>
                            <option value="Administrative Staff">Administrative Staff</option>
                          </select>
                        </div>
                      </div>
                      <div class="fn-form-row-two">
                        <div class="fn-form-group">
                          <label class="fn-form-label">Department *</label>
                          <select class="fn-select" name="department" required>
                            <option value="Academics">Academics</option>
                            <option value="Counseling">Counseling</option>
                            <option value="Technical">Technical</option>
                            <option value="Operations">Operations</option>
                          </select>
                        </div>
                        <div class="fn-form-group">
                          <label class="fn-form-label">Monthly Salary (₹) *</label>
                          <input class="fn-input" type="number" name="monthlySalary" min="1" step="0.01" required placeholder="45000">
                        </div>
                      </div>
                      <button class="btn-fn-primary" type="submit" data-btn-add-emp style="margin-top: 6px;">Register Employee</button>
                      <p class="fees-status" data-emp-form-status role="status" aria-live="polite"></p>
                    </form>
                  </article>
                </div>

                <!-- Salary Disbursement History Table -->
                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 16px;">Disbursed Salaries Register</h3>
                  <div class="fn-table-wrap">
                    <table class="fn-table">
                      <thead>
                        <tr>
                          <th>Salary ID</th>
                          <th>Date</th>
                          <th>Period</th>
                          <th>Employee</th>
                          <th>Role</th>
                          <th>Mode</th>
                          <th style="text-align: right;">Net Paid (₹)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody data-salaries-table-rows>
                        <tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No salary disbursements recorded yet.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            </section>

            <!-- VIEW 5: MASTER TRANSACTIONS (Unified Ledger) -->
            <section class="fn-view-panel" id="view-transactions">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Master Transactions</h1>
                  <p class="finance-view-sub">Unified chronological ledger of fee collections, other income, operating expenses, and payroll</p>
                </div>
                <div class="finance-view-controls">
                  <input type="search" class="fn-input" placeholder="Search transactions…" data-search-master-tx style="width: 220px;">
                  <select class="fn-select-control" data-filter-master-type>
                    <option value="all">All Types</option>
                    <option value="fees">Fee Collection (Read-only)</option>
                    <option value="other-income">Other Income (+)</option>
                    <option value="expense">Operating Expenses (-)</option>
                    <option value="salary">Salaries &amp; Payroll (-)</option>
                  </select>
                </div>
              </div>
              <article class="fn-card">
                <div class="fn-table-wrap">
                  <table class="fn-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category / Source</th>
                        <th>Identifier / Ref</th>
                        <th>Party / Student / Vendor</th>
                        <th>Payment Mode</th>
                        <th style="text-align: right;">Amount (₹)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody data-master-transactions-rows>
                      <tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">Loading master transactions…</td></tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <!-- VIEW 6: EXPENSE CATEGORIES -->
            <section class="fn-view-panel" id="view-categories">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Expense Categories</h1>
                  <p class="finance-view-sub">Manage institutional budget allocations, category caps, and expenditure monitoring</p>
                </div>
              </div>
              <article class="fn-card">
                <div class="fn-table-wrap">
                  <table class="fn-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th style="text-align: right;">Monthly Budget (₹)</th>
                        <th style="text-align: right;">Actual Spent (₹)</th>
                        <th>Budget Utilization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody data-categories-table-rows>
                      <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 24px;">Loading category allocations…</td></tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <!-- VIEW 7: MARKETING ANALYTICS -->
            <section class="fn-view-panel" id="view-marketing">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Marketing Analytics</h1>
                  <p class="finance-view-sub">Campaign ROI, digital acquisition channels, and lead generation economics</p>
                </div>
              </div>
              <div class="finance-kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Total Ad Spend</div>
                  <div class="fn-kpi-val" data-mktg="totalSpend" style="color: var(--fn-orange);">₹0</div>
                  <div class="fn-kpi-sub">Google + Meta Ads</div>
                </article>
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Campaign Leads Generated</div>
                  <div class="fn-kpi-val" data-mktg="leads">0</div>
                  <div class="fn-kpi-sub">From Marketing Ads</div>
                </article>
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Cost per Lead (CPL)</div>
                  <div class="fn-kpi-val" data-mktg="cpl">₹0</div>
                  <div class="fn-kpi-sub">Acquisition Economics</div>
                </article>
                <article class="fn-kpi-card">
                  <div class="fn-kpi-label">Ad Spend ROI</div>
                  <div class="fn-kpi-val" data-mktg="roi" style="color: var(--fn-green);">0.0x</div>
                  <div class="fn-kpi-sub">Revenue / Ad Spend</div>
                </article>
              </div>

              <div class="finance-charts-row">
                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 16px;">Platform-wise Spend Breakdown</h3>
                  <div class="fn-category-bar-list" data-mktg-platform-bars>
                    <!-- Rendered in JS -->
                  </div>
                </article>
                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 12px;">Marketing Insights &amp; Attribution</h3>
                  <ul class="fn-check-list" style="margin-top: 14px;">
                    <li class="fn-check-item">
                      <span class="fn-check-icon">✓</span>
                      <span><strong>Google Search Ads:</strong> High-intent student search queries for JEE Main &amp; Advanced courses.</span>
                    </li>
                    <li class="fn-check-item">
                      <span class="fn-check-icon">✓</span>
                      <span><strong>Meta (Instagram/FB):</strong> Lead generation and foundation course inquiries.</span>
                    </li>
                    <li class="fn-check-item">
                      <span class="fn-check-icon">✓</span>
                      <span><strong>Performance Tracking:</strong> All ad spend synchronized live from verified marketing expenses.</span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>

            <!-- VIEW 8: REPORTS (Profit & Loss Statement) -->
            <section class="fn-view-panel" id="view-reports">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Financial Reports</h1>
                  <p class="finance-view-sub">Institutional Profit &amp; Loss Statement and Operating Margin Audits</p>
                </div>
                <button type="button" class="btn-fn-sync" onclick="window.print()">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  <span>Print P&amp;L Report</span>
                </button>
              </div>
              <article class="fn-card" style="max-width: 800px;">
                <h3 class="fn-card-title" style="border-bottom: 1px solid var(--fn-border); padding-bottom: 12px; margin-bottom: 16px;">
                  Profit &amp; Loss Statement (Consolidated)
                </h3>
                <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--fn-navy);">
                    <span>1. TOTAL OPERATING REVENUE (INFLOW)</span>
                    <span data-pl="inflow" style="color: var(--fn-green);">₹0</span>
                  </div>
                  <div style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px; color: var(--fn-text-muted); font-size: 0.82rem;">
                    <div style="display: flex; justify-content: space-between;">
                      <span>Student Tuition Fee Collections (Fee Register)</span>
                      <span data-pl="fees">₹0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Other Non-Tuition Revenues (Books, Tests, Grants)</span>
                      <span data-pl="otherIncome">₹0</span>
                    </div>
                  </div>

                  <hr style="border: none; border-top: 1px solid var(--fn-border); margin: 6px 0;">

                  <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--fn-navy);">
                    <span>2. TOTAL OPERATING EXPENDITURE (OUTFLOW)</span>
                    <span data-pl="outflow" style="color: var(--fn-red);">₹0</span>
                  </div>
                  <div style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px; color: var(--fn-text-muted); font-size: 0.82rem;">
                    <div style="display: flex; justify-content: space-between;">
                      <span>Faculty &amp; Staff Salaries (Payroll)</span>
                      <span data-pl="salaries">₹0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Marketing &amp; Digital Ads</span>
                      <span data-pl="marketing">₹0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Infrastructure, Rent, Utilities &amp; Supplies</span>
                      <span data-pl="otherExp">₹0</span>
                    </div>
                  </div>

                  <hr style="border: none; border-top: 2px solid var(--fn-navy); margin: 10px 0;">

                  <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 900; color: var(--fn-navy);">
                    <span>NET OPERATING PROFIT / SURPLUS</span>
                    <span data-pl="net">₹0</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; color: var(--fn-text-muted);">
                    <span>Operating Profit Margin</span>
                    <span data-pl="margin">0%</span>
                  </div>
                </div>
              </article>
            </section>

            <!-- VIEW 9: EXCEL EXPORT (One-Click Real Excel Files) -->
            <section class="fn-view-panel" id="view-export">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Excel Export Hub</h1>
                  <p class="finance-view-sub">Download production-ready Microsoft Excel (.xlsx) and CSV reports generated directly from real sheet data</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                <article class="fn-card" style="border-top: 4px solid var(--fn-green);">
                  <h3 class="fn-card-title">Full Master Financial Report</h3>
                  <p class="fn-card-sub" style="margin-bottom: 16px;">Multi-tab workbook containing P&amp;L Summary, Expenses, Salaries, and Income.</p>
                  <button type="button" class="btn-fn-primary" data-export-type="master" style="background: var(--fn-green);">Download Master Workbook (.xlsx)</button>
                </article>

                <article class="fn-card" style="border-top: 4px solid var(--fn-orange);">
                  <h3 class="fn-card-title">All Transactions Register</h3>
                  <p class="fn-card-sub" style="margin-bottom: 16px;">Chronological register of all fee inflows, operational expenses, and payments.</p>
                  <button type="button" class="btn-fn-primary" data-export-type="transactions">Download Transactions (.xlsx)</button>
                </article>

                <article class="fn-card" style="border-top: 4px solid var(--fn-pink);">
                  <h3 class="fn-card-title">Expenses Register</h3>
                  <p class="fn-card-sub" style="margin-bottom: 16px;">Categorized expense ledger with vendor names, payment modes, and invoice URLs.</p>
                  <button type="button" class="btn-fn-primary" data-export-type="expenses" style="background: var(--fn-pink);">Download Expenses (.xlsx)</button>
                </article>

                <article class="fn-card" style="border-top: 4px solid var(--fn-blue);">
                  <h3 class="fn-card-title">Salary &amp; Payroll Register</h3>
                  <p class="fn-card-sub" style="margin-bottom: 16px;">Complete faculty &amp; staff monthly disbursement ledger with basic, bonus, deductions.</p>
                  <button type="button" class="btn-fn-primary" data-export-type="salaries" style="background: var(--fn-blue);">Download Salaries (.xlsx)</button>
                </article>

                <article class="fn-card" style="border-top: 4px solid var(--fn-purple);">
                  <h3 class="fn-card-title">Student Fee Revenue Register</h3>
                  <p class="fn-card-sub" style="margin-bottom: 16px;">Complete fee history containing all verified student enrollments from Fee Register.</p>
                  <button type="button" class="btn-fn-primary" data-export-type="fees" style="background: var(--fn-purple);">Download Fee Register (.xlsx)</button>
                </article>
              </div>
            </section>

            <!-- VIEW 10: SETTINGS (Apps Script & Sheets Configuration) -->
            <section class="fn-view-panel" id="view-settings">
              <div class="finance-view-header">
                <div>
                  <h1 class="finance-view-title">Finance Portal Settings</h1>
                  <p class="finance-view-sub">Manage Google Sheets Apps Script Web App URL, secret, and live read/write testing</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 12px;">Apps Script Web App Integration</h3>
                  <p class="fn-card-sub" style="margin-bottom: 16px;">
                    Bound to spreadsheet <strong>13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8</strong>.
                    Uses the secure SHA-256 Apps Script Web App architecture.
                  </p>
                  <form data-form-finance-config>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Finance Web App URL (FINANCE_WEBAPP_URL)</label>
                      <input class="fn-input" type="url" name="webappUrl" placeholder="https://script.google.com/macros/s/.../exec">
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Finance Sheet Secret (FINANCE_SHEET_SECRET)</label>
                      <input class="fn-input" type="password" name="secret" placeholder="••••••••••••••••">
                    </div>
                    <div class="fn-form-group">
                      <label class="fn-form-label">Target Spreadsheet ID</label>
                      <input class="fn-input" type="text" name="spreadsheetId" value="13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8" readonly style="background: #f8fafc; color: #64748b;">
                    </div>
                    <button class="btn-fn-primary" type="submit" data-btn-save-finance-config style="margin-top: 10px;">Save Settings &amp; Probe</button>
                    <p class="fees-status" data-config-status role="status" aria-live="polite"></p>
                  </form>
                </article>

                <article class="fn-card">
                  <h3 class="fn-card-title" style="margin-bottom: 14px;">Live Read/Write Verification</h3>
                  <p class="fn-card-sub" style="margin-bottom: 18px;">
                    Executes an automated round-trip write of a diagnostic test expense of ₹1.00 to Google Sheets, confirms presence, and deletes it.
                  </p>
                  <button type="button" class="btn-fn-primary" data-btn-test-connection style="background: var(--fn-navy);">
                    Run Live Read/Write Test
                  </button>
                  <button type="button" class="btn-fn-export" data-btn-sync-sheets style="width: 100%; margin-top: 10px; justify-content: center;">
                    Sync All Worksheets
                  </button>
                  <div style="margin-top: 20px; font-size: 0.78rem; color: #64748b;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <span style="color: var(--fn-green); font-weight: 800;">✓</span>
                      <span>Target Google Account: amjeementor@gmail.com</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--fn-green); font-weight: 800;">✓</span>
                      <span>Target Spreadsheet: 13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </main>
        </div>

        <!-- Modal: View Fee Receipt Details -->
        <div class="finance-modal-backdrop" data-fee-modal hidden style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
          <div class="fn-card" style="width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--fn-border); padding-bottom: 12px; margin-bottom: 16px;">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--fn-orange); text-transform: uppercase;">My JEE Mentor – Official Receipt</div>
                <h3 class="fn-card-title" style="margin: 0;" data-modal-receipt-title>Fee Receipt Details</h3>
              </div>
              <button type="button" data-modal-close style="border: none; background: none; font-size: 1.6rem; line-height: 1; cursor: pointer; color: #94a3b8;">&times;</button>
            </div>
            <div data-modal-receipt-body style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem;">
              <!-- Dynamic Details Rendered in JS -->
            </div>
            <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--fn-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span class="fn-badge income" style="font-size: 0.72rem;">Imported from Fee Register – Read Only</span>
              <button type="button" class="btn btn-outline" data-modal-close style="padding: 6px 14px; font-size: 0.8rem;">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Global in-memory cache for live state
const financeState = {
  feeRecords: [],
  feeMetrics: {
    totalCollection: 0,
    totalTransactions: 0,
    todayCollection: 0,
    currentMonthCollection: 0
  },
  expenses: [],
  salaries: [],
  employees: [],
  otherIncome: [],
  categories: [],
  summary: null,
  status: null,
  isSyncing: false
};

async function api(endpoint, options = {}) {
  const { query, ...fetchOptions } = options;
  const url = new URL(endpoint, location.origin);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
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
  const alertBox = dashboardPanel.querySelector('[data-finance-alert]');
  const lastSyncedEl = dashboardPanel.querySelector('[data-finance-last-synced]');
  const userMenuBtn = dashboardPanel.querySelector('[data-fn-user-toggle]');
  const userDropdown = dashboardPanel.querySelector('[data-fn-user-dropdown]');

  // Sidebar navigation buttons & view panels
  const navButtons = dashboardPanel.querySelectorAll('[data-view-btn]');
  const viewPanels = dashboardPanel.querySelectorAll('.fn-view-panel');

  // Forms & Buttons
  const quickExpenseForm = dashboardPanel.querySelector('[data-quick-expense-form]');
  const quickExpenseBtn = dashboardPanel.querySelector('[data-btn-quick-expense]');
  const quickExpenseStatus = dashboardPanel.querySelector('[data-quick-expense-status]');
  const fullIncomeForm = dashboardPanel.querySelector('[data-full-income-form]');
  const incomeFormStatus = dashboardPanel.querySelector('[data-income-form-status]');
  const fullExpenseForm = dashboardPanel.querySelector('[data-full-expense-form]');
  const expenseFormStatus = dashboardPanel.querySelector('[data-expense-form-status]');
  const salaryForm = dashboardPanel.querySelector('[data-salary-form]');
  const salaryFormStatus = dashboardPanel.querySelector('[data-salary-form-status]');
  const addEmpForm = dashboardPanel.querySelector('[data-add-emp-form]');
  const empFormStatus = dashboardPanel.querySelector('[data-emp-form-status]');
  const formFinanceConfig = dashboardPanel.querySelector('[data-form-finance-config]');
  const configStatus = dashboardPanel.querySelector('[data-config-status]');
  const btnTestConnection = dashboardPanel.querySelector('[data-btn-test-connection]');
  const btnSyncSheets = dashboardPanel.querySelector('[data-btn-sync-sheets]');

  // View Switcher logic
  function switchView(viewName) {
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewBtn === viewName);
    });
    viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });
    if (userDropdown) userDropdown.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.viewBtn));
  });

  dashboardPanel.querySelectorAll('[data-nav-target]').forEach(link => {
    link.addEventListener('click', () => switchView(link.dataset.navTarget));
  });

  // User menu dropdown toggle
  userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (userDropdown) userDropdown.hidden = !userDropdown.hidden;
  });
  document.addEventListener('click', () => {
    if (userDropdown) userDropdown.hidden = true;
  });

  function showAlert(msg, isError = false) {
    if (!alertBox) return;
    alertBox.hidden = !msg;
    alertBox.textContent = msg || '';
    alertBox.className = `finance-alert ${isError ? 'is-error' : 'is-success'}`;
    if (!isError && msg) {
      setTimeout(() => { if (alertBox) alertBox.hidden = true; }, 6000);
    }
  }

  function setStatus(status) {
    if (!statusPill || !statusText) return;
    const isConn = status === 'Connected';
    statusText.textContent = isConn ? 'Data: Google Sheets (Live Sync)' : `Data: ${status}`;
    statusPill.style.background = isConn ? 'var(--fn-green-soft)' : '#fee2e2';
    statusPill.style.borderColor = isConn ? 'var(--fn-green-border)' : '#fecaca';
    statusPill.style.color = isConn ? 'var(--fn-green)' : 'var(--fn-red)';
  }

  // Load all live dataset from Google Sheets
  async function loadAllData({ isSync = false, silent = false } = {}) {
    try {
      if (syncIcon && isSync) syncIcon.style.animation = 'fnPulse 1s infinite linear';

      // 1. Load connection status, high-level summary, and real fee records
      const [statusRes, summaryRes, feeRes, expRes, salRes, empRes, incRes, catRes] = await Promise.all([
        api(ENDPOINT, { query: { action: 'status' } }).catch(() => ({})),
        api(ENDPOINT, { query: { action: 'summary' } }).catch(() => ({})),
        api(ENDPOINT, { query: { action: 'fee-records', refresh: isSync ? 'true' : 'false' } }).catch(() => ({ records: [] })),
        api(ENDPOINT, { query: { action: 'expenses' } }).catch(() => ({ expenses: [] })),
        api(ENDPOINT, { query: { action: 'salaries' } }).catch(() => ({ salaries: [] })),
        api(ENDPOINT, { query: { action: 'employees' } }).catch(() => ({ employees: [] })),
        api(ENDPOINT, { query: { action: 'other-income' } }).catch(() => ({ records: [] })),
        api(ENDPOINT, { query: { action: 'categories' } }).catch(() => ({ categories: [] }))
      ]);

      financeState.status = statusRes;
      financeState.summary = summaryRes;

      // Resilient: If new fee records returned, update cache. If failed/empty, preserve existing records!
      if (Array.isArray(feeRes?.records) && feeRes.records.length > 0) {
        financeState.feeRecords = feeRes.records;
      }
      financeState.feeMetrics = {
        totalCollection: Number(feeRes?.totalCollection) || Number(summaryRes?.revenue?.feeCollection) || financeState.feeRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
        totalTransactions: Number(feeRes?.totalTransactions) || Number(summaryRes?.revenue?.feeTransactions) || financeState.feeRecords.length,
        todayCollection: Number(feeRes?.todayCollection) || Number(summaryRes?.revenue?.todayCollection) || 0,
        currentMonthCollection: Number(feeRes?.currentMonthCollection) || Number(summaryRes?.revenue?.currentMonthCollection) || 0
      };

      financeState.expenses = expRes.expenses || [];
      financeState.salaries = salRes.salaries || [];
      financeState.employees = empRes.employees || [];
      financeState.otherIncome = incRes.records || [];
      financeState.categories = catRes.categories || [];

      // Update UI timestamp & connection pill
      setStatus(statusRes.status || 'Connected');
      if (lastSyncedEl) {
        lastSyncedEl.textContent = `Last Sync: ${formatKolkataDateTime(new Date())}`;
      }

      // Render all dashboard cards, charts, and tables
      renderDashboard();
      renderFeeDetailsTable();
      renderIncomeTable();
      renderExpenseTable();
      renderSalaryTables();
      renderMasterTransactions();
      renderCategoriesTable();
      renderMarketingAnalytics();
      renderReports();
    } catch (err) {
      if (err.status === 401) {
        showLogin();
      } else if (!silent) {
        showAlert(err.message || 'Could not refresh financial data.', true);
      }
    } finally {
      if (syncIcon && isSync) syncIcon.style.animation = '';
    }
  }

  // Render Dashboard KPIs, Charts & Tables
  function renderDashboard() {
    const expenses = financeState.expenses || [];
    const salaries = financeState.salaries || [];
    const otherIncome = (financeState.otherIncome || []).filter(i => {
      const src = String(i.source || '').toLowerCase();
      const desc = String(i.description || '').toLowerCase();
      return !src.includes('fee collection') && !src.includes('tuition fee');
    });
    const feeRecords = financeState.feeRecords || [];
    const summary = financeState.summary || {};

    // 1. Calculate Real Totals
    const feeTotal = Number(financeState.feeMetrics?.totalCollection) || Number(summary.revenue?.feeCollection) || feeRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const feeCount = Number(financeState.feeMetrics?.totalTransactions) || Number(summary.revenue?.feeTransactions) || feeRecords.length;
    const otherIncomeTotal = otherIncome.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalIncome = feeTotal + otherIncomeTotal;

    const operationalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const salariesDisbursed = salaries.reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
    const totalExpenses = operationalExpenses + salariesDisbursed;

    const netProfit = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

    // Marketing Expense calculation - ONLY from verified marketing/ads expenses
    const marketingExpense = expenses
      .filter(e => /marketing|ads|google|meta|facebook|adwords|campaign|banner/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const mktgPct = totalExpenses > 0 ? ((marketingExpense / totalExpenses) * 100).toFixed(1) : '0.0';

    // Teacher Salary calculation - ONLY from verified disbursed teacher salaries
    const teacherSalary = salaries
      .filter(s => /faculty|teacher|professor|tutor|academic/i.test((s.role || '') + ' ' + (s.employeeName || '')))
      .reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
    const teacherCount = salaries.filter(s => /faculty|teacher|professor|tutor|academic/i.test(s.role || '')).length;

    // Update KPI DOM Nodes
    const kpiNodes = {
      totalIncome: dashboardPanel.querySelector('[data-kpi="totalIncome"]'),
      totalExpenses: dashboardPanel.querySelector('[data-kpi="totalExpenses"]'),
      netProfit: dashboardPanel.querySelector('[data-kpi="netProfit"]'),
      feeCollection: dashboardPanel.querySelector('[data-kpi="feeCollection"]'),
      marketingExpense: dashboardPanel.querySelector('[data-kpi="marketingExpense"]'),
      teacherSalary: dashboardPanel.querySelector('[data-kpi="teacherSalary"]')
    };

    if (kpiNodes.totalIncome) kpiNodes.totalIncome.textContent = formatInr(totalIncome);
    if (kpiNodes.totalExpenses) kpiNodes.totalExpenses.textContent = formatInr(totalExpenses);
    if (kpiNodes.netProfit) kpiNodes.netProfit.textContent = formatInr(netProfit);
    if (kpiNodes.feeCollection) kpiNodes.feeCollection.textContent = formatInr(feeTotal);
    if (kpiNodes.marketingExpense) kpiNodes.marketingExpense.textContent = formatInr(marketingExpense);
    if (kpiNodes.teacherSalary) kpiNodes.teacherSalary.textContent = formatInr(teacherSalary);

    // Subtitles
    const kpiSubs = {
      totalIncome: dashboardPanel.querySelector('[data-kpi-sub="totalIncome"]'),
      totalExpenses: dashboardPanel.querySelector('[data-kpi-sub="totalExpenses"]'),
      netProfit: dashboardPanel.querySelector('[data-kpi-sub="netProfit"]'),
      feeCollection: dashboardPanel.querySelector('[data-kpi-sub="feeCollection"]'),
      marketingExpense: dashboardPanel.querySelector('[data-kpi-sub="marketingExpense"]'),
      teacherSalary: dashboardPanel.querySelector('[data-kpi-sub="teacherSalary"]')
    };
    if (kpiSubs.totalIncome) kpiSubs.totalIncome.textContent = `${feeCount} verified fee receipts`;
    if (kpiSubs.totalExpenses) kpiSubs.totalExpenses.textContent = totalExpenses === 0 ? '₹0 recorded expenses' : `${expenses.length + salaries.length} payments recorded`;
    if (kpiSubs.netProfit) kpiSubs.netProfit.textContent = `Margin: ${margin}%`;
    if (kpiSubs.feeCollection) kpiSubs.feeCollection.textContent = `${feeCount} Transactions`;
    if (kpiSubs.marketingExpense) kpiSubs.marketingExpense.textContent = `${mktgPct}% of Total Expense`;
    if (kpiSubs.teacherSalary) kpiSubs.teacherSalary.textContent = `${teacherCount} Disbursed`;

    // Render Charts
    renderTrendBarChart(totalIncome, totalExpenses, netProfit);
    renderDonutChart(expenses, salaries, teacherSalary, marketingExpense, totalExpenses);
    renderCategoryBars(expenses, salaries, totalExpenses);
    renderRecentTransactionsTable();
  }

  // 1. Income vs Expense Trend Bar Chart (SVG)
  function renderTrendBarChart(currIncome, currExpense, currProfit) {
    const container = dashboardPanel.querySelector('[data-chart-trend-container]');
    if (!container) return;

    // Dynamic 6-month continuous series ending with current month
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(-2);
      months.push({ key, label });
    }
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const data = months.map(m => {
      let inc = 0;
      let exp = 0;

      (financeState.feeRecords || []).forEach(f => {
        if (String(f.date || '').startsWith(m.key)) inc += (Number(f.amount) || 0);
      });
      (financeState.otherIncome || []).forEach(i => {
        if (String(i.date || '').startsWith(m.key)) inc += (Number(i.amount) || 0);
      });
      (financeState.expenses || []).forEach(e => {
        if (String(e.date || '').startsWith(m.key)) exp += (Number(e.amount) || 0);
      });
      (financeState.salaries || []).forEach(s => {
        const d = s.paymentDate || s.date || '';
        if (String(d).startsWith(m.key)) exp += (Number(s.netPaid || s.basicSalary) || 0);
      });

      if (m.key === currentMonthKey) {
        inc = Math.max(inc, currIncome || 0);
        exp = Math.max(exp, currExpense || 0);
      }

      return {
        month: m.label,
        income: inc,
        expense: exp,
        profit: inc - exp
      };
    });

    const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense, d.profit]), 100000);
    const upperLimit = Math.max(100000, Math.ceil(maxVal / 50000) * 50000);

    const width = 500;
    const height = 210;
    const padL = 45;
    const padR = 15;
    const padT = 15;
    const padB = 25;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const yTicks = [0, upperLimit * 0.25, upperLimit * 0.5, upperLimit * 0.75, upperLimit];
    const gridSvg = yTicks.map(val => {
      const y = padT + chartH - (val / upperLimit) * chartH;
      return `
        <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="${padL - 6}" y="${y + 3}" font-size="9" fill="#94a3b8" text-anchor="end">${formatInr(val, { compact: true })}</text>
      `;
    }).join('');

    const groupW = chartW / data.length;
    const barW = Math.max(6, (groupW * 0.7) / 3);

    const barsSvg = data.map((d, i) => {
      const gX = padL + i * groupW + groupW * 0.15;
      const hInc = d.income > 0 ? Math.max(3, (d.income / upperLimit) * chartH) : 0;
      const hExp = d.expense > 0 ? Math.max(3, (d.expense / upperLimit) * chartH) : 0;
      const hPrf = d.profit > 0 ? Math.max(3, (d.profit / upperLimit) * chartH) : 0;

      return `
        <g class="chart-group">
          ${hInc > 0 ? `<rect x="${gX}" y="${padT + chartH - hInc}" width="${barW}" height="${hInc}" fill="#22c55e" rx="2"><title>Income: ${formatInr(d.income)}</title></rect>` : ''}
          ${hExp > 0 ? `<rect x="${gX + barW + 2}" y="${padT + chartH - hExp}" width="${barW}" height="${hExp}" fill="#f87171" rx="2"><title>Expense: ${formatInr(d.expense)}</title></rect>` : ''}
          ${hPrf > 0 ? `<rect x="${gX + (barW + 2) * 2}" y="${padT + chartH - hPrf}" width="${barW}" height="${hPrf}" fill="#3b82f6" rx="2"><title>Profit: ${formatInr(d.profit)}</title></rect>` : ''}
          <text x="${gX + barW * 1.5 + 2}" y="${height - 6}" font-size="9.5" fill="#64748b" text-anchor="middle" font-weight="500">${d.month}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
        ${gridSvg}
        ${barsSvg}
      </svg>
    `;
  }

  // 2. Expense Breakdown Donut Chart (SVG)
  function renderDonutChart(expenses, salaries, teacherSal, mktgExp, totalExp) {
    const container = dashboardPanel.querySelector('[data-donut-container]');
    if (!container) return;

    const tSal = salaries
      .filter(s => /faculty|teacher|professor|tutor|academic/i.test((s.role || '') + ' ' + (s.employeeName || '')))
      .reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);

    const mExp = expenses
      .filter(e => /marketing|ads|google|meta|facebook|banner/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const techExp = expenses
      .filter(e => /tech|server|hosting|software|domain/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const counselorSal = salaries
      .filter(s => /counsel/i.test((s.role || '') + ' ' + (s.employeeName || '')))
      .reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);

    const otherExp = Math.max(0, totalExp - (tSal + mExp + techExp + counselorSal));
    const fullTotal = totalExp;

    const segments = [
      { label: 'Teacher Salary', amount: tSal, color: '#3b82f6' },
      { label: 'Marketing Expense', amount: mExp, color: '#f97316' },
      { label: 'Technical Team', amount: techExp, color: '#a855f7' },
      { label: 'Counselor Salary', amount: counselorSal, color: '#22c55e' },
      { label: 'Other (Ops, Tools, etc.)', amount: otherExp, color: '#ec4899' }
    ];

    const r = 58;
    const cx = 75;
    const cy = 75;
    const strokeW = 24;

    let paths = '';
    if (fullTotal === 0) {
      // Empty state: clean neutral muted ring
      paths = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${strokeW}"/>`;
    } else {
      let cumAngle = 0;
      const rRad = r * 2 * Math.PI;
      paths = segments.map(seg => {
        if (seg.amount <= 0) return '';
        const pct = seg.amount / fullTotal;
        const angle = pct * 360;
        const startAngle = cumAngle;
        cumAngle += angle;

        const dash = pct * rRad;
        const space = rRad - dash;
        const offset = -((startAngle / 360) * rRad);

        return `
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${strokeW}"
            stroke-dasharray="${dash} ${space}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>
        `;
      }).join('');
    }

    const legendRows = segments.map(seg => {
      const pctStr = fullTotal > 0 ? ((seg.amount / fullTotal) * 100).toFixed(1) + '%' : '0.0%';
      return `
        <div class="fn-donut-row">
          <div class="fn-donut-row-left">
            <span class="fn-legend-dot" style="background: ${seg.color};"></span>
            <span>${seg.label}</span>
          </div>
          <div class="fn-donut-row-right">
            <span class="fn-donut-pct">${pctStr}</span>
            <span class="fn-donut-val">${formatInr(seg.amount)}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="fn-donut-svg-wrap">
        <svg viewBox="0 0 150 150" style="width: 100%; height: 100%;">
          ${paths}
        </svg>
        <div class="fn-donut-center-label">
          <div class="fn-donut-center-amount">${formatInr(fullTotal)}</div>
          <div class="fn-donut-center-sub">Total Expense</div>
        </div>
      </div>
      <div class="fn-donut-legend-list">
        ${legendRows}
      </div>
    `;
  }

  // 3. Category Horizontal Progress Bars
  function renderCategoryBars(expenses, salaries, totalExp) {
    const container = dashboardPanel.querySelector('[data-cat-bars-container]');
    if (!container) return;

    const tSal = salaries
      .filter(s => /faculty|teacher|professor|tutor|academic/i.test((s.role || '') + ' ' + (s.employeeName || '')))
      .reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
    const mExp = expenses
      .filter(e => /marketing|ads|google|meta|facebook|banner/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const techExp = expenses
      .filter(e => /tech|server|hosting|software|domain/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const cSal = salaries
      .filter(s => /counsel/i.test((s.role || '') + ' ' + (s.employeeName || '')))
      .reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
    const oExp = Math.max(0, totalExp - (tSal + mExp + techExp + cSal));

    const cats = [
      { name: 'Teacher Salary', amount: tSal, color: '#3b82f6' },
      { name: 'Marketing Expense', amount: mExp, color: '#f97316' },
      { name: 'Technical Team', amount: techExp, color: '#a855f7' },
      { name: 'Counselor Salary', amount: cSal, color: '#22c55e' },
      { name: 'Other Expense', amount: oExp, color: '#ec4899' }
    ];

    container.innerHTML = cats.map(c => {
      const pct = totalExp > 0 ? Math.min(100, (c.amount / totalExp) * 100).toFixed(1) : '0.0';
      return `
        <div class="fn-cat-row">
          <div class="fn-cat-row-head">
            <span class="fn-cat-name">${c.name}</span>
            <span class="fn-cat-amounts">${formatInr(c.amount)} (${pct}%)</span>
          </div>
          <div class="fn-progress-track">
            <div class="fn-progress-fill" style="width: ${pct}%; background: ${c.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Recent Transactions Table
  function renderRecentTransactionsTable() {
    const tbody = dashboardPanel.querySelector('[data-recent-tx-rows]');
    if (!tbody) return;

    // Combine verified fee receipts, expenses, other income and salaries
    const combined = [];

    (financeState.expenses || []).forEach(e => {
      combined.push({
        date: e.date || '',
        type: 'Expense',
        category: e.category || 'Expense',
        details: e.description || e.paidTo || '-',
        amount: -(Number(e.amount) || 0)
      });
    });

    (financeState.feeRecords || []).forEach(f => {
      combined.push({
        date: f.date || '',
        type: 'Income',
        category: 'Fee Collection',
        details: `${f.studentName || 'Student'} (${f.receiptNo || 'Fee'})`,
        amount: Number(f.amount) || 0
      });
    });

    (financeState.otherIncome || []).forEach(inc => {
      combined.push({
        date: inc.date || '',
        type: 'Income',
        category: inc.source || 'Other Income',
        details: inc.description || 'Income',
        amount: Number(inc.amount) || 0
      });
    });

    (financeState.salaries || []).forEach(s => {
      combined.push({
        date: s.paymentDate || s.date || '',
        type: 'Expense',
        category: 'Teacher Salary',
        details: `${s.employeeName || 'Staff'} (${s.period || 'Salary'})`,
        amount: -(Number(s.netPaid || s.basicSalary) || 0)
      });
    });

    // Sort newest first
    combined.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    if (combined.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">No transactions recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = combined.slice(0, 5).map(tx => `
      <tr>
        <td style="font-weight: 500;">${escapeHtml(tx.date)}</td>
        <td><span class="fn-badge ${tx.type.toLowerCase()}">${tx.type}</span></td>
        <td style="font-weight: 600;">${escapeHtml(tx.category)}</td>
        <td style="color: #64748b;">${escapeHtml(tx.details)}</td>
        <td style="text-align: right;" class="${tx.amount >= 0 ? 'fn-amount-pos' : 'fn-amount-neg'}">
          ${tx.amount >= 0 ? '+' : ''}${formatInr(tx.amount)}
        </td>
      </tr>
    `).join('');
  }

  // Fee Receipt Details Modal Handler
  const feeModal = dashboardPanel.querySelector('[data-fee-modal]');
  const modalTitle = dashboardPanel.querySelector('[data-modal-receipt-title]');
  const modalBody = dashboardPanel.querySelector('[data-modal-receipt-body]');

  function showReceiptModal(receiptNo) {
    if (!feeModal || !modalBody) return;
    const r = (financeState.feeRecords || []).find(x => x.receiptNo === receiptNo);
    if (!r) return;

    if (modalTitle) modalTitle.textContent = `Fee Receipt: ${r.receiptNo}`;

    modalBody.innerHTML = `
      <div style="background: #f8fafc; border: 1px solid var(--fn-border); border-radius: 8px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Student Name</div>
          <div style="font-weight: 700; color: var(--fn-navy); font-size: 0.95rem;">${escapeHtml(r.studentName)}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Parent / Guardian</div>
          <div style="font-weight: 600; color: #334155;">${escapeHtml(r.parentName || '-')}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Contact Phone</div>
          <div style="font-weight: 500;">${escapeHtml(r.phone || '-')}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Course &amp; Batch</div>
          <div style="font-weight: 600; color: var(--fn-navy);">${escapeHtml(r.course)}${r.batch ? ` (${escapeHtml(r.batch)})` : ''}</div>
        </div>
      </div>

      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 0.72rem; color: #047857; text-transform: uppercase; font-weight: 700;">Amount Paid</div>
          <div style="font-size: 1.4rem; font-weight: 900; color: #065f46;">${formatInr(r.amount)}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.72rem; color: #047857; text-transform: uppercase; font-weight: 700;">Payment Mode</div>
          <span class="fn-badge income" style="font-size: 0.82rem; padding: 4px 10px;">${escapeHtml(r.paymentMode)}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.82rem;">
        <div>
          <span style="color: #64748b;">Payment Date:</span>
          <strong style="color: var(--fn-navy); margin-left: 6px;">${escapeHtml(r.date)}</strong>
        </div>
        <div>
          <span style="color: #64748b;">Fee Period:</span>
          <strong style="color: var(--fn-navy); margin-left: 6px;">${escapeHtml(r.feePeriod || '-')}</strong>
        </div>
        <div>
          <span style="color: #64748b;">Balance Due:</span>
          <strong style="color: ${r.balanceDue > 0 ? 'var(--fn-red)' : 'var(--fn-green)'}; margin-left: 6px;">${formatInr(r.balanceDue)}</strong>
        </div>
        <div>
          <span style="color: #64748b;">Collected By:</span>
          <strong style="color: var(--fn-navy); margin-left: 6px;">${escapeHtml(r.collectedBy || 'Staff')}</strong>
        </div>
      </div>

      ${r.remarks ? `
        <div style="background: #f8fafc; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #475569;">
          <span style="color: #94a3b8; font-weight: 600;">Remarks:</span> ${escapeHtml(r.remarks)}
        </div>
      ` : ''}
    `;

    feeModal.hidden = false;
  }

  dashboardPanel.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-view-receipt]');
    if (viewBtn) {
      showReceiptModal(viewBtn.dataset.viewReceipt);
      return;
    }
    if (e.target.closest('[data-modal-close]') || e.target === feeModal) {
      if (feeModal) feeModal.hidden = true;
    }
  });

  // Dedicated Fee Collection Details Table
  let feeFilterListenersBound = false;

  function renderFeeDetailsTable() {
    const records = financeState.feeRecords || [];
    const metrics = financeState.feeMetrics || {};

    // 1. Top KPI Cards
    const totalColEl = dashboardPanel.querySelector('[data-fee-kpi="totalCollection"]');
    const totalCountEl = dashboardPanel.querySelector('[data-fee-kpi="totalCount"]');
    const todayColEl = dashboardPanel.querySelector('[data-fee-kpi="todayCollection"]');
    const monthColEl = dashboardPanel.querySelector('[data-fee-kpi="monthCollection"]');

    const totalCollection = metrics.totalCollection || records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalCount = metrics.totalTransactions || records.length;
    const todayCollection = metrics.todayCollection || 0;
    const monthCollection = metrics.currentMonthCollection || 0;

    if (totalColEl) totalColEl.textContent = formatInr(totalCollection);
    if (totalCountEl) totalCountEl.textContent = `${totalCount} Receipts`;
    if (todayColEl) todayColEl.textContent = formatInr(todayCollection);
    if (monthColEl) monthColEl.textContent = formatInr(monthCollection);

    // 2. Populate Dropdowns (only once or when options change)
    const courseSelect = dashboardPanel.querySelector('[data-fee-course-filter]');
    const monthSelect = dashboardPanel.querySelector('[data-fee-month-filter]');

    if (courseSelect && (courseSelect.options.length <= 1) && records.length > 0) {
      const courses = [...new Set(records.map(r => r.course).filter(Boolean))].sort();
      courseSelect.innerHTML = '<option value="all">All Courses</option>' +
        courses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    if (monthSelect && (monthSelect.options.length <= 1) && records.length > 0) {
      const months = [...new Set(records.map(r => (r.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
      monthSelect.innerHTML = '<option value="all">All Months</option>' +
        months.map(m => {
          const d = new Date(m + '-01');
          const lbl = isNaN(d) ? m : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return `<option value="${escapeHtml(m)}">${escapeHtml(lbl)}</option>`;
        }).join('');
    }

    // 3. Filter Records
    const searchInput = dashboardPanel.querySelector('[data-fee-search]');
    const modeSelect = dashboardPanel.querySelector('[data-fee-mode-filter]');

    const query = (searchInput?.value || '').trim().toLowerCase();
    const selCourse = courseSelect?.value || 'all';
    const selMonth = monthSelect?.value || 'all';
    const selMode = modeSelect?.value || 'all';

    const filtered = records.filter(r => {
      const matchesSearch = !query || [
        r.receiptNo,
        r.studentName,
        r.parentName,
        r.phone,
        r.course,
        r.batch,
        r.remarks
      ].join(' ').toLowerCase().includes(query);

      const matchesCourse = selCourse === 'all' || r.course === selCourse;
      const matchesMonth = selMonth === 'all' || String(r.date || '').startsWith(selMonth);
      const matchesMode = selMode === 'all' || String(r.paymentMode || '').toLowerCase() === selMode.toLowerCase();

      return matchesSearch && matchesCourse && matchesMonth && matchesMode;
    });

    const tbody = dashboardPanel.querySelector('[data-fee-table-rows]');
    const summaryEl = dashboardPanel.querySelector('[data-fee-table-summary]');
    const reconciledEl = dashboardPanel.querySelector('[data-fee-table-reconciled]');

    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: #94a3b8; padding: 28px;">
              ${records.length === 0 ? 'No fee records found in Fee Register.' : 'No fee receipts match the selected filters.'}
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(r => `
          <tr>
            <td>
              <button type="button" class="btn btn-link" data-view-receipt="${escapeHtml(r.receiptNo)}" style="font-weight: 700; color: var(--fn-navy); font-family: monospace; border: none; background: none; cursor: pointer; padding: 0; text-decoration: underline;">
                ${escapeHtml(r.receiptNo)}
              </button>
            </td>
            <td style="font-weight: 600;">${escapeHtml(r.studentName)}</td>
            <td>
              <div>${escapeHtml(r.course)}</div>
              ${r.batch ? `<div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(r.batch)}</div>` : ''}
            </td>
            <td>${escapeHtml(r.date)}</td>
            <td style="text-align: right; font-weight: 700; color: var(--fn-green); font-size: 0.95rem;">
              ${formatInr(r.amount)}
            </td>
            <td><span class="fn-badge">${escapeHtml(r.paymentMode)}</span></td>
            <td><span class="fn-badge income" style="font-weight: 700;">✓ Verified</span></td>
            <td>
              <button type="button" class="btn btn-outline" data-view-receipt="${escapeHtml(r.receiptNo)}" style="padding: 3px 8px; font-size: 0.72rem;">
                View Details
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    const filteredSum = filtered.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    if (summaryEl) {
      summaryEl.textContent = `Showing ${filtered.length} of ${records.length} unique fee receipts (Subtotal: ${formatInr(filteredSum)})`;
    }
    if (reconciledEl) {
      const isFull = filtered.length === records.length;
      reconciledEl.textContent = isFull
        ? `✓ 100% Reconciled with Fee Collection KPI (${formatInr(totalCollection)})`
        : `Filtered View (${filtered.length}/${records.length} receipts)`;
    }

    // 4. Bind listeners once
    if (!feeFilterListenersBound) {
      feeFilterListenersBound = true;
      searchInput?.addEventListener('input', renderFeeDetailsTable);
      courseSelect?.addEventListener('change', renderFeeDetailsTable);
      monthSelect?.addEventListener('change', renderFeeDetailsTable);
      modeSelect?.addEventListener('change', renderFeeDetailsTable);

      dashboardPanel.querySelector('[data-fee-reset-filters]')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (courseSelect) courseSelect.value = 'all';
        if (monthSelect) monthSelect.value = 'all';
        if (modeSelect) modeSelect.value = 'all';
        renderFeeDetailsTable();
      });
    }
  }

  // 5. Income Table
  function renderIncomeTable() {
    const tbody = dashboardPanel.querySelector('[data-income-table-rows]');
    if (!tbody) return;
    const records = financeState.otherIncome || [];
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No other income records in Google Sheets yet.</td></tr>';
      return;
    }
    tbody.innerHTML = records.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.id)}</strong></td>
        <td>${escapeHtml(r.date)}</td>
        <td><span class="fn-badge income">${escapeHtml(r.source)}</span></td>
        <td>${escapeHtml(r.description)}</td>
        <td>${escapeHtml(r.paymentMode)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--fn-green);">${formatInr(r.amount)}</td>
        <td>
          <button type="button" class="btn btn-outline" data-del-income="${escapeHtml(r.id)}" style="padding: 2px 8px; font-size: 0.72rem; color: #ef4444;">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // 6. Expense Table
  function renderExpenseTable() {
    const tbody = dashboardPanel.querySelector('[data-expense-table-rows]');
    if (!tbody) return;
    const expenses = financeState.expenses || [];
    if (expenses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No expenses recorded in Google Sheets yet.</td></tr>';
      return;
    }
    tbody.innerHTML = expenses.map(e => `
      <tr>
        <td><strong>${escapeHtml(e.id)}</strong></td>
        <td>${escapeHtml(e.date)}</td>
        <td><span class="fn-badge expense">${escapeHtml(e.category)}</span></td>
        <td>${escapeHtml(e.description)}</td>
        <td>${escapeHtml(e.paidTo)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--fn-red);">${formatInr(e.amount)}</td>
        <td>
          <button type="button" class="btn btn-outline" data-del-expense="${escapeHtml(e.id)}" style="padding: 2px 8px; font-size: 0.72rem; color: #ef4444;">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // 7. Salary Tables & Employee select
  function renderSalaryTables() {
    const tbody = dashboardPanel.querySelector('[data-salaries-table-rows]');
    const empSelect = dashboardPanel.querySelector('[data-salary-emp-select]');
    const employees = financeState.employees || [];
    const salaries = financeState.salaries || [];

    if (empSelect) {
      empSelect.innerHTML = '<option value="">Select Employee</option>' +
        employees.map(e => `<option value="${escapeHtml(e.id)}" data-salary="${e.monthlySalary || 30000}">${escapeHtml(e.name)} (${escapeHtml(e.role)})</option>`).join('');
    }

    if (tbody) {
      if (salaries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No salary records in Google Sheets yet.</td></tr>';
      } else {
        tbody.innerHTML = salaries.map(s => `
          <tr>
            <td><strong>${escapeHtml(s.id)}</strong></td>
            <td>${escapeHtml(s.paymentDate)}</td>
            <td>${escapeHtml(s.period)}</td>
            <td style="font-weight: 600;">${escapeHtml(s.employeeName)}</td>
            <td>${escapeHtml(s.role)}</td>
            <td>${escapeHtml(s.paymentMode)}</td>
            <td style="text-align: right; font-weight: 700; color: var(--fn-navy);">${formatInr(s.netPaid || s.basicSalary)}</td>
            <td>
              <button type="button" class="btn btn-outline" data-del-salary="${escapeHtml(s.id)}" style="padding: 2px 8px; font-size: 0.72rem; color: #ef4444;">Delete</button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // 8. Master Transactions Table
  function renderMasterTransactions() {
    const tbody = dashboardPanel.querySelector('[data-master-transactions-rows]');
    if (!tbody) return;

    const list = [];
    (financeState.feeRecords || []).forEach(f => {
      list.push({
        date: f.date,
        type: 'Income',
        category: 'Fee Collection',
        ref: f.receiptNo,
        party: f.studentName,
        mode: f.paymentMode || 'UPI',
        amount: Number(f.amount) || 0,
        canDelete: false
      });
    });

    (financeState.otherIncome || []).forEach(inc => {
      list.push({
        date: inc.date,
        type: 'Income',
        category: inc.source,
        ref: inc.id,
        party: inc.description || 'Income',
        mode: inc.paymentMode || 'UPI',
        amount: Number(inc.amount) || 0,
        id: inc.id,
        deleteAction: 'delete-other-income',
        canDelete: true
      });
    });

    (financeState.expenses || []).forEach(exp => {
      list.push({
        date: exp.date,
        type: 'Expense',
        category: exp.category,
        ref: exp.id,
        party: exp.paidTo || exp.description,
        mode: exp.paymentMode || 'UPI',
        amount: -(Number(exp.amount) || 0),
        id: exp.id,
        deleteAction: 'delete-expense',
        canDelete: true
      });
    });

    (financeState.salaries || []).forEach(sal => {
      list.push({
        date: sal.paymentDate,
        type: 'Expense',
        category: 'Salary',
        ref: sal.id,
        party: `${sal.employeeName} (${sal.role})`,
        mode: sal.paymentMode || 'UPI',
        amount: -(Number(sal.netPaid || sal.basicSalary) || 0),
        id: sal.id,
        deleteAction: 'delete-salary',
        canDelete: true
      });
    });

    list.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const typeFilter = dashboardPanel.querySelector('[data-filter-master-type]')?.value || 'all';
    const searchQuery = (dashboardPanel.querySelector('[data-search-master-tx]')?.value || '').trim().toLowerCase();

    const filtered = list.filter(tx => {
      const matchesSearch = !searchQuery || [
        tx.date,
        tx.type,
        tx.category,
        tx.ref,
        tx.party,
        tx.mode
      ].join(' ').toLowerCase().includes(searchQuery);

      if (!matchesSearch) return false;

      if (typeFilter === 'fees') return tx.category === 'Fee Collection';
      if (typeFilter === 'other-income') return tx.type === 'Income' && tx.category !== 'Fee Collection';
      if (typeFilter === 'expense') return tx.type === 'Expense' && tx.category !== 'Salary';
      if (typeFilter === 'salary') return tx.category === 'Salary';
      if (typeFilter === 'income') return tx.type === 'Income';

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">No transactions match the selected filter.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(tx => `
      <tr>
        <td style="font-weight: 500;">${escapeHtml(tx.date)}</td>
        <td><span class="fn-badge ${tx.type.toLowerCase()}">${tx.type}</span></td>
        <td style="font-weight: 600;">${escapeHtml(tx.category)}</td>
        <td>
          ${tx.category === 'Fee Collection' ? `
            <button type="button" class="btn btn-link" data-view-receipt="${escapeHtml(tx.ref)}" style="font-weight: 700; color: var(--fn-navy); font-family: monospace; border: none; background: none; cursor: pointer; padding: 0; text-decoration: underline;">
              ${escapeHtml(tx.ref)}
            </button>
          ` : `
            <code style="font-size: 0.72rem; color: #64748b;">${escapeHtml(tx.ref)}</code>
          `}
        </td>
        <td>${escapeHtml(tx.party)}</td>
        <td>${escapeHtml(tx.mode)}</td>
        <td style="text-align: right;" class="${tx.amount >= 0 ? 'fn-amount-pos' : 'fn-amount-neg'}">
          ${tx.amount >= 0 ? '+' : ''}${formatInr(tx.amount)}
        </td>
        <td>
          ${tx.canDelete ? `<button type="button" class="btn btn-outline" data-del-custom="${escapeHtml(tx.id)}" data-del-action="${tx.deleteAction}" style="padding: 2px 8px; font-size: 0.72rem; color: #ef4444;">Delete</button>` : '<span class="fn-badge income" style="font-size: 0.68rem; padding: 2px 6px;">Read-only</span>'}
        </td>
      </tr>
    `).join('');
  }

  // 9. Categories Table
  function renderCategoriesTable() {
    const tbody = dashboardPanel.querySelector('[data-categories-table-rows]');
    if (!tbody) return;
    const cats = financeState.categories || [];
    const expenses = financeState.expenses || [];

    if (cats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">Standard budget categories loaded.</td></tr>';
      return;
    }

    tbody.innerHTML = cats.map(c => {
      const budget = Number(c.monthlyBudget) || 100000;
      const spent = expenses
        .filter(e => (e.category || '').toLowerCase() === (c.name || '').toLowerCase())
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const utilPct = Math.min(100, (spent / budget) * 100).toFixed(1);

      return `
        <tr>
          <td style="font-weight: 700; color: var(--fn-navy);">${escapeHtml(c.name)}</td>
          <td><span class="fn-badge expense">${escapeHtml(c.type || 'Expense')}</span></td>
          <td style="color: #64748b;">${escapeHtml(c.description || '-')}</td>
          <td style="text-align: right; font-weight: 600;">${formatInr(budget)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--fn-navy);">${formatInr(spent)}</td>
          <td style="width: 140px;">
            <div class="fn-progress-track">
              <div class="fn-progress-fill" style="width: ${utilPct}%; background: ${utilPct > 90 ? 'var(--fn-red)' : 'var(--fn-orange)'};"></div>
            </div>
            <span style="font-size: 0.7rem; color: #64748b;">${utilPct}% utilized</span>
          </td>
          <td><span class="fn-badge income">Active</span></td>
        </tr>
      `;
    }).join('');
  }

  // 10. Marketing Analytics
  function renderMarketingAnalytics() {
    const container = dashboardPanel.querySelector('[data-mktg-platform-bars]');
    if (!container) return;

    const expenses = financeState.expenses || [];

    const googleAds = expenses
      .filter(e => /google/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const metaAds = expenses
      .filter(e => /meta|facebook|insta/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const youtubeAds = expenses
      .filter(e => /youtube/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const offlinePrint = expenses
      .filter(e => /print|banner|flyer|pamphlet|offline/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const otherMktg = expenses
      .filter(e => /marketing|ads|promotion/i.test(e.category || '') &&
        !/google|meta|facebook|insta|youtube|print|banner|flyer/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalMktg = googleAds + metaAds + youtubeAds + offlinePrint + otherMktg;

    const totalEl = dashboardPanel.querySelector('[data-mktg="totalSpend"]');
    const leadsEl = dashboardPanel.querySelector('[data-mktg="leads"]');
    const cplEl = dashboardPanel.querySelector('[data-mktg="cpl"]');
    const roiEl = dashboardPanel.querySelector('[data-mktg="roi"]');

    if (totalEl) totalEl.textContent = formatInr(totalMktg);

    if (totalMktg === 0) {
      if (leadsEl) leadsEl.textContent = '0';
      if (cplEl) cplEl.textContent = '₹0';
      if (roiEl) roiEl.textContent = '0.0x';
      container.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 28px 16px;">
          <p style="margin: 0; font-size: 0.88rem;">No marketing or advertising expenses recorded in Google Sheets yet.</p>
          <p style="margin: 6px 0 0; font-size: 0.78rem;">Add Google Ads or Meta Ads in Quick Add to track real campaign ROI.</p>
        </div>
      `;
      return;
    }

    const totalRevenue = Number(financeState.summary?.revenue?.totalInflow) ||
      (financeState.feeRecords || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const roi = totalMktg > 0 && totalRevenue > 0 ? (totalRevenue / totalMktg).toFixed(1) + 'x' : '0.0x';
    if (roiEl) roiEl.textContent = roi;

    const platforms = [
      { name: 'Google Ads (Search & Discovery)', amount: googleAds, color: '#f97316' },
      { name: 'Meta Ads (Instagram & Facebook)', amount: metaAds, color: '#3b82f6' },
      { name: 'YouTube Video Ads', amount: youtubeAds, color: '#ef4444' },
      { name: 'Offline Banners & Print', amount: offlinePrint, color: '#a855f7' }
    ].filter(p => p.amount > 0);

    if (platforms.length === 0 && otherMktg > 0) {
      platforms.push({ name: 'General Marketing & Promotions', amount: otherMktg, color: '#f97316' });
    }

    container.innerHTML = platforms.map(p => {
      const pct = ((p.amount / totalMktg) * 100).toFixed(1);
      return `
        <div class="fn-cat-row">
          <div class="fn-cat-row-head">
            <span class="fn-cat-name">${p.name}</span>
            <span class="fn-cat-amounts">${formatInr(p.amount)} (${pct}%)</span>
          </div>
          <div class="fn-progress-track">
            <div class="fn-progress-fill" style="width: ${pct}%; background: ${p.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 11. Reports (P&L)
  function renderReports() {
    const expenses = financeState.expenses || [];
    const salaries = financeState.salaries || [];
    const feeRecords = financeState.feeRecords || [];
    const otherIncome = (financeState.otherIncome || []).filter(i => {
      const src = String(i.source || '').toLowerCase();
      const desc = String(i.description || '').toLowerCase();
      return !src.includes('fee collection') && !src.includes('tuition fee');
    });
    const summary = financeState.summary || {};

    const feeCol = Number(summary.revenue?.feeCollection) || feeRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const otherInc = otherIncome.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalIncome = feeCol + otherInc;

    const operational = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const salariesTotal = salaries.reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
    const totalOut = operational + salariesTotal;

    const marketingExp = expenses
      .filter(e => /marketing|ads|google|meta|facebook|banner/i.test((e.category || '') + ' ' + (e.description || '')))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const otherOperational = Math.max(0, operational - marketingExp);

    const net = totalIncome - totalOut;
    const margin = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0.0';

    const nodes = {
      inflow: dashboardPanel.querySelector('[data-pl="inflow"]'),
      fees: dashboardPanel.querySelector('[data-pl="fees"]'),
      otherIncome: dashboardPanel.querySelector('[data-pl="otherIncome"]'),
      outflow: dashboardPanel.querySelector('[data-pl="outflow"]'),
      salaries: dashboardPanel.querySelector('[data-pl="salaries"]'),
      marketing: dashboardPanel.querySelector('[data-pl="marketing"]'),
      otherExp: dashboardPanel.querySelector('[data-pl="otherExp"]'),
      net: dashboardPanel.querySelector('[data-pl="net"]'),
      margin: dashboardPanel.querySelector('[data-pl="margin"]')
    };

    if (nodes.inflow) nodes.inflow.textContent = formatInr(totalIncome);
    if (nodes.fees) nodes.fees.textContent = formatInr(feeCol);
    if (nodes.otherIncome) nodes.otherIncome.textContent = formatInr(otherInc);
    if (nodes.outflow) nodes.outflow.textContent = formatInr(totalOut);
    if (nodes.salaries) nodes.salaries.textContent = formatInr(salariesTotal);
    if (nodes.marketing) nodes.marketing.textContent = formatInr(marketingExp);
    if (nodes.otherExp) nodes.otherExp.textContent = formatInr(otherOperational);
    if (nodes.net) nodes.net.textContent = formatInr(net);
    if (nodes.margin) nodes.margin.textContent = `${margin}%`;
  }

  // Native Multi-Sheet Excel Export function using SheetJS (XLSX)
  function exportExcelFile(type = 'master') {
    if (!window.XLSX) {
      alert('Excel export tool is loading. Please try again in a few seconds.');
      return;
    }

    const expenses = financeState.expenses || [];
    const salaries = financeState.salaries || [];
    const feeRecords = financeState.feeRecords || [];
    const otherIncome = (financeState.otherIncome || []).filter(i => {
      const src = String(i.source || '').toLowerCase();
      const desc = String(i.description || '').toLowerCase();
      return !src.includes('fee collection') && !src.includes('tuition fee');
    });
    const summary = financeState.summary || {};

    const feeCol = Number(summary.revenue?.feeCollection) || feeRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const otherInc = otherIncome.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalIncome = feeCol + otherInc;

    const operational = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const salariesTotal = salaries.reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);
    const totalOut = operational + salariesTotal;
    const net = totalIncome - totalOut;

    const wb = window.XLSX.utils.book_new();

    if (type === 'master' || type === 'summary') {
      const pnlData = [
        ['MY JEE MENTOR - INSTITUTE FINANCIAL REPORT (P&L)'],
        ['Generated On', new Date().toLocaleString('en-IN')],
        [''],
        ['Metric', 'Amount (INR)'],
        ['Total Revenue Inflow', totalIncome],
        ['Student Tuition Fees', feeCol],
        ['Other Income Streams', otherInc],
        ['Total Operating Outflow', totalOut],
        ['Operational Expenses', operational],
        ['Salaries & Honorarium', salariesTotal],
        ['Net Operating Profit', net]
      ];
      const wsPnl = window.XLSX.utils.aoa_to_sheet(pnlData);
      window.XLSX.utils.book_append_sheet(wb, wsPnl, 'P&L Summary');
    }

    if (type === 'master' || type === 'expenses') {
      const expRows = [
        ['Expense ID', 'Date', 'Category', 'Description', 'Paid To / Vendor', 'Amount (INR)', 'Payment Mode', 'Notes'],
        ...financeState.expenses.map(e => [e.id, e.date, e.category, e.description, e.paidTo, e.amount, e.paymentMode, e.notes || ''])
      ];
      const wsExp = window.XLSX.utils.aoa_to_sheet(expRows);
      window.XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');
    }

    if (type === 'master' || type === 'salaries') {
      const salRows = [
        ['Salary ID', 'Payment Date', 'Period', 'Employee Name', 'Role', 'Basic Salary (INR)', 'Bonus (INR)', 'Deductions (INR)', 'Net Paid (INR)', 'Mode'],
        ...financeState.salaries.map(s => [s.id, s.paymentDate, s.period, s.employeeName, s.role, s.basicSalary, s.bonus, s.deductions, s.netPaid, s.paymentMode])
      ];
      const wsSal = window.XLSX.utils.aoa_to_sheet(salRows);
      window.XLSX.utils.book_append_sheet(wb, wsSal, 'Salaries & Payroll');
    }

    if (type === 'master' || type === 'fees') {
      const feeRows = [
        ['Receipt No', 'Date', 'Student Name', 'Parent Name', 'Phone', 'Course', 'Batch', 'Fee Period', 'Amount (INR)', 'Payment Mode', 'Balance Due (INR)', 'Status'],
        ...financeState.feeRecords.map(f => [f.receiptNo, f.date, f.studentName, f.parentName, f.phone, f.course, f.batch, f.feePeriod || '-', f.amount, f.paymentMode, f.balanceDue || 0, 'Verified'])
      ];
      const wsFee = window.XLSX.utils.aoa_to_sheet(feeRows);
      window.XLSX.utils.book_append_sheet(wb, wsFee, 'Fee Receipts');
    }

    if (type === 'master' || type === 'income') {
      const incRows = [
        ['Income ID', 'Date', 'Source', 'Description', 'Amount (INR)', 'Payment Mode', 'Reference No', 'Received By'],
        ...financeState.otherIncome.map(i => [i.id, i.date, i.source, i.description, i.amount, i.paymentMode, i.referenceNo, i.receivedBy])
      ];
      const wsInc = window.XLSX.utils.aoa_to_sheet(incRows);
      window.XLSX.utils.book_append_sheet(wb, wsInc, 'Other Income');
    }

    const filename = `MJM_Finance_Report_${type.toUpperCase()}_${getKolkataYmd()}.xlsx`;
    window.XLSX.writeFile(wb, filename);
  }

  // Bind Export Buttons
  dashboardPanel.querySelectorAll('[data-export-type]').forEach(btn => {
    btn.addEventListener('click', () => exportExcelFile(btn.dataset.exportType));
  });
  dashboardPanel.querySelector('[data-quick-export-excel]')?.addEventListener('click', () => {
    exportExcelFile('master');
  });

  // Form Submissions
  // 1. Quick Add Expense Form
  quickExpenseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (quickExpenseBtn) quickExpenseBtn.disabled = true;
    if (quickExpenseStatus) {
      quickExpenseStatus.textContent = 'Saving expense to Google Sheets…';
      quickExpenseStatus.className = 'fees-status';
    }

    const data = Object.fromEntries(new FormData(quickExpenseForm));
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'add-expense' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        if (quickExpenseStatus) {
          quickExpenseStatus.textContent = `✓ Saved as ${res.expenseId}!`;
          quickExpenseStatus.className = 'fees-status is-success';
        }
        quickExpenseForm.reset();
        quickExpenseForm.elements.date.value = getKolkataYmd();
        showAlert(`Expense ${res.expenseId} successfully saved to Google Sheets!`, false);
        loadAllData();
      }
    } catch (err) {
      if (quickExpenseStatus) {
        quickExpenseStatus.textContent = err.message || 'Failed to save expense.';
        quickExpenseStatus.className = 'fees-status is-error';
      }
    } finally {
      if (quickExpenseBtn) quickExpenseBtn.disabled = false;
    }
  });

  // 2. Full Income Form
  fullIncomeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = fullIncomeForm.querySelector('[data-btn-save-income]');
    if (btn) btn.disabled = true;
    if (incomeFormStatus) {
      incomeFormStatus.textContent = 'Saving income to Google Sheets…';
      incomeFormStatus.className = 'fees-status';
    }

    const data = Object.fromEntries(new FormData(fullIncomeForm));
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'add-other-income' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        if (incomeFormStatus) {
          incomeFormStatus.textContent = `✓ Saved as ${res.incomeId}!`;
          incomeFormStatus.className = 'fees-status is-success';
        }
        fullIncomeForm.reset();
        fullIncomeForm.elements.date.value = getKolkataYmd();
        showAlert(`Income stream ${res.incomeId} recorded in Google Sheets!`, false);
        loadAllData();
      }
    } catch (err) {
      if (incomeFormStatus) {
        incomeFormStatus.textContent = err.message || 'Failed to record income.';
        incomeFormStatus.className = 'fees-status is-error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // 3. Full Expense Form
  fullExpenseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = fullExpenseForm.querySelector('[data-btn-save-expense]');
    if (btn) btn.disabled = true;
    if (expenseFormStatus) {
      expenseFormStatus.textContent = 'Saving expense to Google Sheets…';
      expenseFormStatus.className = 'fees-status';
    }

    const data = Object.fromEntries(new FormData(fullExpenseForm));
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'add-expense' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        if (expenseFormStatus) {
          expenseFormStatus.textContent = `✓ Saved as ${res.expenseId}!`;
          expenseFormStatus.className = 'fees-status is-success';
        }
        fullExpenseForm.reset();
        fullExpenseForm.elements.date.value = getKolkataYmd();
        showAlert(`Expense ${res.expenseId} saved to Google Sheets!`, false);
        loadAllData();
      }
    } catch (err) {
      if (expenseFormStatus) {
        expenseFormStatus.textContent = err.message || 'Failed to record expense.';
        expenseFormStatus.className = 'fees-status is-error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // 4. Salary Auto-Calculate Net Pay
  salaryForm?.querySelectorAll('[data-sal-calc]').forEach(input => {
    input.addEventListener('input', () => {
      const basic = Number(salaryForm.elements.basicSalary?.value) || 0;
      const bonus = Number(salaryForm.elements.bonus?.value) || 0;
      const deductions = Number(salaryForm.elements.deductions?.value) || 0;
      const net = Math.max(0, basic + bonus - deductions);
      if (salaryForm.elements.netPaid) salaryForm.elements.netPaid.value = net;
    });
  });

  // Auto-fill employee salary on select
  salaryForm?.elements.employeeId?.addEventListener('change', (e) => {
    const selOpt = e.target.selectedOptions[0];
    if (selOpt && selOpt.dataset.salary) {
      if (salaryForm.elements.basicSalary) {
        salaryForm.elements.basicSalary.value = selOpt.dataset.salary;
        salaryForm.elements.basicSalary.dispatchEvent(new Event('input'));
      }
    }
  });

  // 5. Salary Form Submission
  salaryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = salaryForm.querySelector('[data-btn-save-salary]');
    if (btn) btn.disabled = true;
    if (salaryFormStatus) {
      salaryFormStatus.textContent = 'Recording salary in Google Sheets…';
      salaryFormStatus.className = 'fees-status';
    }

    const data = Object.fromEntries(new FormData(salaryForm));
    const empOpt = salaryForm.elements.employeeId?.selectedOptions[0];
    if (empOpt) {
      data.employeeName = empOpt.textContent.split('(')[0].trim();
      data.role = empOpt.textContent.includes('(') ? empOpt.textContent.split('(')[1].replace(')', '').trim() : 'Faculty';
    }

    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'add-salary' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        if (salaryFormStatus) {
          salaryFormStatus.textContent = `✓ Salary ${res.salaryId} disbursed!`;
          salaryFormStatus.className = 'fees-status is-success';
        }
        salaryForm.reset();
        showAlert(`Salary disbursement ${res.salaryId} saved to Google Sheets!`, false);
        loadAllData();
      }
    } catch (err) {
      if (salaryFormStatus) {
        salaryFormStatus.textContent = err.message || 'Failed to record salary.';
        salaryFormStatus.className = 'fees-status is-error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // 6. Add Employee Form
  addEmpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = addEmpForm.querySelector('[data-btn-add-emp]');
    if (btn) btn.disabled = true;
    if (empFormStatus) {
      empFormStatus.textContent = 'Registering employee…';
      empFormStatus.className = 'fees-status';
    }

    const data = Object.fromEntries(new FormData(addEmpForm));
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'add-employee' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        if (empFormStatus) {
          empFormStatus.textContent = `✓ Registered as ${res.employeeId}!`;
          empFormStatus.className = 'fees-status is-success';
        }
        addEmpForm.reset();
        showAlert(`Employee ${res.employeeId} registered in Google Sheets!`, false);
        loadAllData();
      }
    } catch (err) {
      if (empFormStatus) {
        empFormStatus.textContent = err.message || 'Failed to register employee.';
        empFormStatus.className = 'fees-status is-error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Delete Action Delegation
  dashboardPanel.addEventListener('click', async (e) => {
    // Delete Expense
    const delExpBtn = e.target.closest('[data-del-expense]');
    if (delExpBtn) {
      const id = delExpBtn.dataset.delExpense;
      if (!confirm(`Are you sure you want to delete expense record ${id} from Google Sheets?`)) return;
      delExpBtn.disabled = true;
      try {
        await api(ENDPOINT, {
          method: 'POST',
          query: { action: 'delete-expense' },
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        showAlert(`Expense ${id} deleted successfully.`, false);
        loadAllData();
      } catch (err) {
        alert(err.message || 'Could not delete expense.');
      } finally {
        delExpBtn.disabled = false;
      }
      return;
    }

    // Delete Income
    const delIncBtn = e.target.closest('[data-del-income]');
    if (delIncBtn) {
      const id = delIncBtn.dataset.delIncome;
      if (!confirm(`Are you sure you want to delete income record ${id}?`)) return;
      delIncBtn.disabled = true;
      try {
        await api(ENDPOINT, {
          method: 'POST',
          query: { action: 'delete-other-income' },
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        showAlert(`Income record ${id} deleted.`, false);
        loadAllData();
      } catch (err) {
        alert(err.message || 'Could not delete income.');
      } finally {
        delIncBtn.disabled = false;
      }
      return;
    }

    // Delete Salary
    const delSalBtn = e.target.closest('[data-del-salary]');
    if (delSalBtn) {
      const id = delSalBtn.dataset.delSalary;
      if (!confirm(`Are you sure you want to delete salary record ${id}?`)) return;
      delSalBtn.disabled = true;
      try {
        await api(ENDPOINT, {
          method: 'POST',
          query: { action: 'delete-salary' },
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        showAlert(`Salary record ${id} deleted.`, false);
        loadAllData();
      } catch (err) {
        alert(err.message || 'Could not delete salary.');
      } finally {
        delSalBtn.disabled = false;
      }
      return;
    }

    // Delete from Master Ledger
    const delCustomBtn = e.target.closest('[data-del-custom]');
    if (delCustomBtn) {
      const id = delCustomBtn.dataset.delCustom;
      const actionName = delCustomBtn.dataset.delAction;
      if (!confirm(`Are you sure you want to delete record ${id} from Google Sheets?`)) return;
      delCustomBtn.disabled = true;
      try {
        await api(ENDPOINT, {
          method: 'POST',
          query: { action: actionName },
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        showAlert(`Record ${id} deleted.`, false);
        loadAllData();
      } catch (err) {
        alert(err.message || 'Could not delete record.');
      } finally {
        delCustomBtn.disabled = false;
      }
    }
  });

  // Live Auto-Sync every 45 seconds while dashboard is open
  let autoSyncTimer = null;
  const AUTO_SYNC_INTERVAL_MS = 45000;

  function startAutoSync() {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    autoSyncTimer = setInterval(async () => {
      if (document.hidden || financeState.isSyncing) return;
      try {
        await loadAllData({ isSync: false, silent: true });
      } catch (err) {
        console.warn('Auto-sync check failed:', err.message);
      }
    }, AUTO_SYNC_INTERVAL_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !financeState.isSyncing) {
      loadAllData({ isSync: false, silent: true }).catch(() => {});
    }
  });

  // Master Transactions Filter & Search Listeners
  dashboardPanel.querySelector('[data-filter-master-type]')?.addEventListener('change', renderMasterTransactions);
  dashboardPanel.querySelector('[data-search-master-tx]')?.addEventListener('input', renderMasterTransactions);

  // Sync Now Button
  syncBtn?.addEventListener('click', async () => {
    if (financeState.isSyncing) return;
    financeState.isSyncing = true;
    if (syncIcon) syncIcon.style.animation = 'fnPulse 1s infinite linear';
    syncBtn.disabled = true;
    showAlert('Synchronizing live records from Google Sheets and Fee Register…', false);

    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'sync' }
      });
      if (res.ok) {
        showAlert('Google Sheets & Fee Register synchronized successfully!', false);
        await loadAllData({ isSync: true });
      }
    } catch (err) {
      showAlert(`Sync notice: ${err.message}`, true);
    } finally {
      financeState.isSyncing = false;
      if (syncIcon) syncIcon.style.animation = '';
      syncBtn.disabled = false;
    }
  });

  // Live Read/Write Test Button
  btnTestConnection?.addEventListener('click', async () => {
    btnTestConnection.disabled = true;
    showAlert('Running live Google Sheets read/write test on spreadsheet 13CQeAhMZpQvZ2BSjX_AcnuA3g_ml1hCw6zRKxrzK0x8…', false);
    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'test-connection' }
      });
      if (res.ok && res.verified) {
        showAlert(`✓ SUCCESS: Live Google Sheets verification passed! Record ${res.testRecordId} written, read back & cleaned up successfully.`, false);
        await loadAllData();
      } else {
        throw new Error(res.message || 'Verification test failed.');
      }
    } catch (err) {
      showAlert(`Live Read/Write Test Failed: ${err.message}`, true);
    } finally {
      btnTestConnection.disabled = false;
    }
  });

  // Settings Save Configuration Form
  formFinanceConfig?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formFinanceConfig.querySelector('[data-btn-save-finance-config]');
    if (btn) btn.disabled = true;
    if (configStatus) {
      configStatus.textContent = 'Saving configuration…';
      configStatus.className = 'fees-status';
    }

    const webappUrl = formFinanceConfig.elements.webappUrl?.value?.trim();
    const secret = formFinanceConfig.elements.secret?.value?.trim();

    try {
      const res = await api(ENDPOINT, {
        method: 'POST',
        query: { action: 'save-config' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webappUrl, secret })
      });
      if (res.ok) {
        if (configStatus) {
          configStatus.textContent = '✓ Configuration saved successfully!';
          configStatus.className = 'fees-status is-success';
        }
        showAlert('Finance settings updated! Re-probing connection…', false);
        loadAllData();
      }
    } catch (err) {
      if (configStatus) {
        configStatus.textContent = err.message || 'Failed to save settings.';
        configStatus.className = 'fees-status is-error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Auth Handling
  function showDashboard() {
    authPanel.hidden = true;
    dashboardPanel.hidden = false;
    loadAllData();
    startAutoSync();
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

  loginForm?.addEventListener('submit', async (e) => {
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

  setupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (setupButton) setupButton.disabled = true;
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
        setupForm.reset();
        showDashboard();
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

  logoutButton?.addEventListener('click', async () => {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    try {
      await api(ENDPOINT, { method: 'POST', query: { action: 'logout' } });
    } catch {}
    showLogin('You have been logged out.');
  });

  // Initial check
  checkAuth();
}
