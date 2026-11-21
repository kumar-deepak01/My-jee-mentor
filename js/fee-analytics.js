/**
 * My JEE Mentor - Fee Collection Analytics Dashboard
 * 
 * High-performance, zero-dependency analytics dashboard for private admin fee portal.
 * Aggregates in-memory records fetched from Google Sheets with zero external dependencies.
 */

// Format currency in Indian Numbering System (e.g., ₹18,50,000)
export function formatInr(amount, { compact = false, showDecimals = false } = {}) {
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
}

// Format integer in Indian numbering system
export function formatCount(count) {
  return new Intl.NumberFormat('en-IN').format(Number(count) || 0);
}

/**
 * Returns current YYYY-MM-DD in Asia/Kolkata (Indian Standard Time).
 */
export function getKolkataYmd(date = new Date()) {
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
  } catch {
    // Fallback if timezone not supported
  }
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns formatted date string in Asia/Kolkata (e.g. "21 Nov 2026").
 */
export function formatKolkataDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${ist.getDate()} ${months[ist.getMonth()]} ${ist.getFullYear()}`;
  }
}

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

/**
 * Bulletproof, timezone-safe date parser with Indian context handling.
 * Supports:
 * - '21 Nov 2026', '31 Oct 2026', '01-Nov-2026'
 * - '21-11-2026', '21/11/2026', '31/10/2026' (DD-MM-YYYY)
 * - '2026-11-21', '2026-11-21T00:00:00Z' (ISO)
 * - Serialized Google Sheets dates (e.g. 46347)
 * - Date objects
 */
export function parseDateSafe(val) {
  if (val == null) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
  }
  if (typeof val === 'number') {
    if (val > 30000 && val < 70000) {
      // Serial date offset from 1899-12-30
      const ms = Math.round((val - 25569) * 86400 * 1000);
      const d = new Date(ms);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
    return null;
  }
  const str = String(val).trim();
  if (!str) return null;

  // 1. ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]), m = Number(isoMatch[2]) - 1, d = Number(isoMatch[3]);
    const dt = new Date(y, m, d, 0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // 2. Named month: '21 Nov 2026', '31 Oct 2026', '21-Nov-2026', '01 Nov 2026'
  const namedMatch = str.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]{3,9})[\s\-\/]+(\d{4})/);
  if (namedMatch) {
    const d = Number(namedMatch[1]);
    const mStr = namedMatch[2].toLowerCase();
    const y = Number(namedMatch[3]);
    if (mStr in MONTH_MAP) {
      const dt = new Date(y, MONTH_MAP[mStr], d, 0, 0, 0, 0);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  // 3. Reverse named month: 'Nov 21, 2026', 'October 31 2026'
  const revNamedMatch = str.match(/^([a-zA-Z]{3,9})[\s\-\/]+(\d{1,2}),?[\s\-\/]+(\d{4})/);
  if (revNamedMatch) {
    const mStr = revNamedMatch[1].toLowerCase();
    const d = Number(revNamedMatch[2]);
    const y = Number(revNamedMatch[3]);
    if (mStr in MONTH_MAP) {
      const dt = new Date(y, MONTH_MAP[mStr], d, 0, 0, 0, 0);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  // 4. DD-MM-YYYY or DD/MM/YYYY (Indian Standard)
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmyMatch) {
    let p1 = Number(dmyMatch[1]), p2 = Number(dmyMatch[2]), y = Number(dmyMatch[3]);
    let d = p1, m = p2 - 1;
    if (p1 > 12 && p2 <= 12) { d = p1; m = p2 - 1; }
    else if (p2 > 12 && p1 <= 12) { d = p2; m = p1 - 1; }
    const dt = new Date(y, m, d, 0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // 5. Fallback Date.parse
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }

  return null;
}

// Format date to local 'YYYY-MM-DD'
export function toYmd(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Generates the HTML markup for the Analytics Dashboard container.
 * Inserted directly above the Private Fee Register section.
 */
export function renderFeeAnalyticsMarkup() {
  return `
    <section class="fees-panel fees-analytics-panel" data-fees-analytics aria-label="Fee Collection Analytics">
      <!-- Dashboard Header & Compact Filter Bar -->
      <div class="fees-analytics-header">
        <div class="fees-analytics-title-wrap">
          <div class="fees-analytics-badge-row">
            <span class="eyebrow">LIVE ANALYTICS</span>
            <span class="fees-analytics-source-pill" title="Synchronized with Google Sheets">
              <span class="fees-pulse-dot"></span> Google Sheets Live
            </span>
          </div>
          <h2 class="fees-analytics-heading">Fee Collection Analytics</h2>
          <p class="fees-analytics-sub">Real-time revenue metrics, collection trends &amp; course distribution</p>
        </div>

        <!-- Filter Bar -->
        <div class="fees-analytics-filters">
          <!-- Date Range Selector -->
          <div class="fees-filter-field">
            <label for="feesAnalyticsRange">Date Range</label>
            <select id="feesAnalyticsRange" class="fees-filter-select" data-analytics-range>
              <option value="12m" selected>Last 12 Months</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <!-- Custom Date Range Inputs (hidden by default) -->
          <div class="fees-filter-custom-wrap" data-analytics-custom-wrap hidden>
            <div class="fees-filter-field">
              <label for="feesCustomStart">From</label>
              <input type="date" id="feesCustomStart" class="fees-filter-input" data-analytics-start>
            </div>
            <div class="fees-filter-field">
              <label for="feesCustomEnd">To</label>
              <input type="date" id="feesCustomEnd" class="fees-filter-input" data-analytics-end>
            </div>
          </div>

          <!-- Course Filter -->
          <div class="fees-filter-field">
            <label for="feesAnalyticsCourse">Course</label>
            <select id="feesAnalyticsCourse" class="fees-filter-select" data-analytics-course>
              <option value="all">All Courses</option>
              <option value="JEE">JEE</option>
              <option value="NEET">NEET</option>
              <option value="Foundation">Foundation</option>
            </select>
          </div>

          <!-- Refresh / Sync Button & Timestamp -->
          <div class="fees-sync-control-wrap">
            <button type="button" class="btn btn-outline fees-analytics-btn-refresh" data-analytics-refresh title="Refresh analytics from Google Sheets">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="fees-sync-icon" data-sync-icon>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span data-sync-text>Sync</span>
            </button>
            <span class="fees-analytics-synced-at" data-analytics-synced-at>Synced</span>
          </div>
        </div>
      </div>

      <!-- Live Notification / Status Banner -->
      <div class="fees-analytics-status" data-analytics-status role="status" aria-live="polite" hidden></div>

      <!-- Row 1: Five Compact KPI Cards -->
      <div class="fees-kpi-grid" data-analytics-kpi-grid>
        <!-- Card 1: Total Fee Collection -->
        <article class="fees-kpi-card kpi-total">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Total Fee Collection</span>
            <span class="fees-kpi-icon icon-rupee" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 8h12M6 13l7.5 8M6 13h3a4.5 4.5 0 000-9H6"></path></svg>
            </span>
          </div>
          <div class="fees-kpi-value" data-kpi="totalCollection">₹0</div>
          <div class="fees-kpi-sub" data-kpi-sub="totalCollection">In selected period</div>
        </article>

        <!-- Card 2: Total Transactions -->
        <article class="fees-kpi-card kpi-transactions">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Total Transactions</span>
            <span class="fees-kpi-icon icon-receipt" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h5"></path></svg>
            </span>
          </div>
          <div class="fees-kpi-value" data-kpi="totalTransactions">0</div>
          <div class="fees-kpi-sub" data-kpi-sub="totalTransactions">Successful receipts</div>
        </article>

        <!-- Card 3: Today's Collection -->
        <article class="fees-kpi-card kpi-today">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Today's Collection</span>
            <span class="fees-kpi-icon icon-today" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <circle cx="12" cy="15" r="2" fill="currentColor"></circle>
              </svg>
            </span>
          </div>
          <div class="fees-kpi-value" data-kpi="todayCollection">₹0</div>
          <div class="fees-kpi-sub" data-kpi-sub="todayCollection">0 successful transactions today</div>
        </article>

        <!-- Card 4: Average Payment -->
        <article class="fees-kpi-card kpi-average">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Average Payment</span>
            <span class="fees-kpi-icon icon-average" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18 9l-5 5-4-4-3 3"></path></svg>
            </span>
          </div>
          <div class="fees-kpi-value" data-kpi="avgPayment">₹0</div>
          <div class="fees-kpi-sub" data-kpi-sub="avgPayment">Per receipt average</div>
        </article>

        <!-- Card 5: Current Month Collection -->
        <article class="fees-kpi-card kpi-month">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Current Month</span>
            <span class="fees-kpi-icon icon-calendar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
          </div>
          <div class="fees-kpi-value" data-kpi="currentMonthCollection">₹0</div>
          <div class="fees-kpi-sub" data-kpi-sub="currentMonthCollection">Calendar month (independent of date filter)</div>
        </article>
      </div>

      <!-- Row 2: Monthly Collection Bar Chart + Daily Collection Trend Area Chart -->
      <div class="fees-charts-row-two">
        <!-- Chart 1: Monthly Collection (Vertical Bar Chart) -->
        <article class="fees-chart-card fees-chart-monthly">
          <div class="fees-chart-card-head">
            <div>
              <h3 class="fees-chart-title">Monthly Fee Collection</h3>
              <p class="fees-chart-sub">Monthly aggregated collections across all 12 calendar months</p>
            </div>
            <div class="fees-chart-badge" data-monthly-badge>12 Months View</div>
          </div>
          <div class="fees-chart-viewport" data-chart-monthly-container>
            <!-- SVG Rendered Dynamically -->
          </div>
        </article>

        <!-- Chart 2: Daily Collection Trend (Smooth Area / Line Chart) -->
        <article class="fees-chart-card fees-chart-daily">
          <div class="fees-chart-card-head">
            <div>
              <h3 class="fees-chart-title">Daily Collection Trend</h3>
              <p class="fees-chart-sub">Continuous daily payment rhythm (including ₹0 collection days)</p>
            </div>
            <div class="fees-chart-badge" data-daily-badge>Last 30 Days Trend</div>
          </div>
          <div class="fees-chart-viewport" data-chart-daily-container>
            <!-- SVG Rendered Dynamically -->
          </div>
        </article>
      </div>

      <!-- Row 3: Course-wise Revenue (Horizontal Bar Chart) -->
      <div class="fees-charts-row-three">
        <article class="fees-chart-card fees-chart-courses">
          <div class="fees-chart-card-head">
            <div>
              <h3 class="fees-chart-title">Course-wise Revenue Breakdown</h3>
              <p class="fees-chart-sub">Total revenue contribution and percentage share across programs</p>
            </div>
            <div class="fees-chart-badge" data-course-badge>Revenue Share</div>
          </div>
          <div class="fees-course-breakdown-wrap" data-chart-course-container>
            <!-- Rendered Dynamically -->
          </div>
        </article>
      </div>

      <!-- Floating Interactive Tooltip -->
      <div class="fees-analytics-tooltip" data-analytics-tooltip hidden aria-hidden="true"></div>
    </section>
  `;
}

/**
 * Controller class that manages state, filtering, memoized computations,
 * and SVG chart rendering for the fee analytics dashboard.
 */
export class FeeAnalyticsController {
  constructor(containerEl, { onRefreshRequested } = {}) {
    this.container = containerEl;
    this.onRefreshRequested = onRefreshRequested;
    this.masterRecords = [];
    this.filteredRecords = [];
    this.currentRange = '12m';
    this.currentCourse = 'all';
    this.customStart = '';
    this.customEnd = '';
    this.tooltipEl = null;
    this.isSyncing = false;

    this.cacheDom();
    this.bindEvents();
    this.renderSkeleton();
  }

  cacheDom() {
    this.rangeSelect = this.container.querySelector('[data-analytics-range]');
    this.customWrap = this.container.querySelector('[data-analytics-custom-wrap]');
    this.startInput = this.container.querySelector('[data-analytics-start]');
    this.endInput = this.container.querySelector('[data-analytics-end]');
    this.courseSelect = this.container.querySelector('[data-analytics-course]');
    this.refreshBtn = this.container.querySelector('[data-analytics-refresh]');
    this.syncIcon = this.container.querySelector('[data-sync-icon]');
    this.syncText = this.container.querySelector('[data-sync-text]');
    this.syncedAtEl = this.container.querySelector('[data-analytics-synced-at]');
    this.statusEl = this.container.querySelector('[data-analytics-status]');
    this.kpiGrid = this.container.querySelector('[data-analytics-kpi-grid]');
    this.monthlyChartContainer = this.container.querySelector('[data-chart-monthly-container]');
    this.dailyChartContainer = this.container.querySelector('[data-chart-daily-container]');
    this.courseChartContainer = this.container.querySelector('[data-chart-course-container]');
    this.monthlyBadge = this.container.querySelector('[data-monthly-badge]');
    this.dailyBadge = this.container.querySelector('[data-daily-badge]');
    this.courseBadge = this.container.querySelector('[data-course-badge]');
    this.tooltipEl = this.container.querySelector('[data-analytics-tooltip]');

    // KPI value nodes
    this.kpiNodes = {
      totalCollection: this.container.querySelector('[data-kpi="totalCollection"]'),
      totalTransactions: this.container.querySelector('[data-kpi="totalTransactions"]'),
      todayCollection: this.container.querySelector('[data-kpi="todayCollection"]'),
      avgPayment: this.container.querySelector('[data-kpi="avgPayment"]'),
      currentMonthCollection: this.container.querySelector('[data-kpi="currentMonthCollection"]')
    };

    this.kpiSubNodes = {
      totalCollection: this.container.querySelector('[data-kpi-sub="totalCollection"]'),
      totalTransactions: this.container.querySelector('[data-kpi-sub="totalTransactions"]'),
      todayCollection: this.container.querySelector('[data-kpi-sub="todayCollection"]'),
      avgPayment: this.container.querySelector('[data-kpi-sub="avgPayment"]'),
      currentMonthCollection: this.container.querySelector('[data-kpi-sub="currentMonthCollection"]')
    };

    // Ensure rangeSelect defaults to 12m
    if (this.rangeSelect) {
      this.rangeSelect.value = '12m';
      this.currentRange = '12m';
    }
  }

  bindEvents() {
    this.rangeSelect?.addEventListener('change', () => {
      this.currentRange = this.rangeSelect.value;
      const isCustom = this.currentRange === 'custom';
      if (this.customWrap) this.customWrap.hidden = !isCustom;
      if (!isCustom) {
        this.processAndRender();
      }
    });

    const onCustomDateChange = () => {
      this.customStart = this.startInput?.value || '';
      this.customEnd = this.endInput?.value || '';
      if (this.customStart && this.customEnd) {
        this.processAndRender();
      }
    };

    this.startInput?.addEventListener('change', onCustomDateChange);
    this.endInput?.addEventListener('change', onCustomDateChange);

    this.courseSelect?.addEventListener('change', () => {
      this.currentCourse = this.courseSelect.value;
      this.processAndRender();
    });

    this.refreshBtn?.addEventListener('click', () => {
      this.triggerSync();
    });
  }

  triggerSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    if (this.syncIcon) this.syncIcon.classList.add('is-spinning');
    if (this.syncText) this.syncText.textContent = 'Syncing…';
    if (this.refreshBtn) this.refreshBtn.disabled = true;
    this.showStatus('Syncing latest records from Google Sheets…');

    if (typeof this.onRefreshRequested === 'function') {
      try {
        this.onRefreshRequested();
      } catch (err) {
        this.endSync(false, err?.message || 'Sync failed');
      }
    } else {
      setTimeout(() => this.endSync(true), 600);
    }
  }

  endSync(success = true, errorMessage = '') {
    this.isSyncing = false;
    if (this.syncIcon) this.syncIcon.classList.remove('is-spinning');
    if (this.syncText) this.syncText.textContent = 'Sync';
    if (this.refreshBtn) this.refreshBtn.disabled = false;

    if (success) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      if (this.syncedAtEl) this.syncedAtEl.textContent = `Synced at ${timeStr}`;
      this.showStatus('');
    } else {
      this.showStatus(errorMessage || 'Google Sheets sync failed. Please retry.', true);
    }
  }

  showStatus(message, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.hidden = !message;
    this.statusEl.textContent = message || '';
    this.statusEl.className = `fees-analytics-status ${isError ? 'is-error' : 'is-info'}`;
    if (!isError && message) {
      setTimeout(() => {
        if (this.statusEl) this.statusEl.hidden = true;
      }, 4000);
    }
  }

  /**
   * Updates master dataset with raw records from Google Sheets.
   * Performs normalization, date parsing and duplicate detection.
   */
  updateRecords(rawRecords = []) {
    this.endSync(true);

    if (!Array.isArray(rawRecords)) rawRecords = [];

    // Normalize each record
    const normalized = [];
    const receiptCounts = new Map();
    let unparseableDates = 0;

    rawRecords.forEach(r => {
      if (!r) return;
      const parsedDate = parseDateSafe(r.date);
      if (!parsedDate) {
        unparseableDates++;
      }
      const amount = Number(String(r.amount || 0).replace(/[^0-9.-]/g, '')) || 0;
      const course = (r.course || '').trim() || 'Unspecified';
      const studentName = (r.studentName || '').trim();
      const phone = String(r.phone || '').trim();
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const studentKey = cleanPhone || studentName.toLowerCase();
      const receiptNo = String(r.receiptNo || '').trim();

      const item = {
        ...r,
        _parsedDate: parsedDate,
        _ymd: parsedDate ? toYmd(parsedDate) : '',
        _amount: amount,
        _course: course,
        _studentName: studentName,
        _phone: phone,
        _studentKey: studentKey,
        _receiptNo: receiptNo,
        _isValid: Boolean(parsedDate && receiptNo)
      };

      if (receiptNo) {
        receiptCounts.set(receiptNo, (receiptCounts.get(receiptNo) || 0) + 1);
      }
      normalized.push(item);
    });

    this.masterRecords = normalized;

    // Audit logs for verification
    const duplicates = Array.from(receiptCounts.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn(`[FeeAnalytics Audit] Duplicate receipt numbers in Google Sheets:`, duplicates.map(([no, cnt]) => `${no} (${cnt}x)`));
    }
    if (unparseableDates > 0) {
      console.warn(`[FeeAnalytics Audit] ${unparseableDates} records had unparseable date strings.`);
    }
    console.info(`[FeeAnalytics Audit] Processed ${this.masterRecords.length} records. Unique receipts: ${receiptCounts.size}.`);

    this.updateCourseOptions();
    this.processAndRender();
  }

  /**
   * Dynamically populates courses discovered in the data while preserving defaults.
   */
  updateCourseOptions() {
    if (!this.courseSelect) return;
    const courses = new Set(['JEE', 'NEET', 'Foundation']);
    this.masterRecords.forEach(r => {
      const c = r._course;
      if (c && c !== 'Unspecified') courses.add(c);
    });

    const currentVal = this.courseSelect.value;
    const optionsHtml = ['<option value="all">All Courses</option>']
      .concat(Array.from(courses).sort().map(c => `<option value="${c}">${c}</option>`));

    const hasUnspecified = this.masterRecords.some(r => r._course === 'Unspecified');
    if (hasUnspecified) {
      optionsHtml.push('<option value="Unspecified">Unspecified Course</option>');
    }

    this.courseSelect.innerHTML = optionsHtml.join('');
    if (Array.from(this.courseSelect.options).some(o => o.value === currentVal)) {
      this.courseSelect.value = currentVal;
    } else {
      this.courseSelect.value = 'all';
      this.currentCourse = 'all';
    }
  }

  renderSkeleton() {
    Object.values(this.kpiNodes).forEach(node => {
      if (node) node.innerHTML = '<span class="fees-skeleton-pill"></span>';
    });
    if (this.monthlyChartContainer) {
      this.monthlyChartContainer.innerHTML = '<div class="fees-skeleton-chart"><span class="fees-skeleton-wave"></span></div>';
    }
    if (this.dailyChartContainer) {
      this.dailyChartContainer.innerHTML = '<div class="fees-skeleton-chart"><span class="fees-skeleton-wave"></span></div>';
    }
    if (this.courseChartContainer) {
      this.courseChartContainer.innerHTML = '<div class="fees-skeleton-chart"><span class="fees-skeleton-wave"></span></div>';
    }
  }

  /**
   * Filters masterRecords according to selected date range and course.
   */
  processAndRender() {
    const { start, end } = this.getDateRangeBounds();

    // Filter masterRecords by date range AND course
    this.filteredRecords = this.masterRecords.filter(r => {
      if (!r._isValid || !r._parsedDate) return false;
      if (r._parsedDate < start || r._parsedDate > end) return false;

      if (this.currentCourse !== 'all') {
        if (this.currentCourse === 'Unspecified') {
          if (r._course !== 'Unspecified') return false;
        } else if (r._course !== this.currentCourse) {
          return false;
        }
      }
      return true;
    });

    this.renderKpiCards();
    // Monthly chart displays all 12 calendar months independently of 7d/30d filter
    this.renderMonthlyChart();
    // Daily chart defaults to Last 30 Days (or active range if 7d or custom)
    this.renderDailyTrendChart(start, end);
    this.renderCourseChart();
  }

  getDateRangeBounds() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start;

    switch (this.currentRange) {
      case '7d':
        start = new Date(end);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case '30d':
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      case '3m':
        start = new Date(end);
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      case '6m':
        start = new Date(end);
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case '12m':
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all':
        start = new Date(2000, 0, 1);
        break;
      case 'custom':
        start = this.customStart ? parseDateSafe(this.customStart) : new Date(2000, 0, 1);
        const cEnd = this.customEnd ? parseDateSafe(this.customEnd) : end;
        if (cEnd) cEnd.setHours(23, 59, 59, 999);
        return { start: start || new Date(2000, 0, 1), end: cEnd || end };
      default:
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  /**
   * Calculates and renders the 5 KPI cards.
   */
  renderKpiCards() {
    const records = this.filteredRecords;
    const totalAmount = records.reduce((sum, r) => sum + r._amount, 0);
    const totalTx = records.length;

    // Today's Collection (Asia/Kolkata timezone)
    const todayYmd = getKolkataYmd();
    let todayAmount = 0;
    let todayTx = 0;

    this.masterRecords.forEach(r => {
      if (!r._isValid || !r._parsedDate) return;
      if (r._ymd === todayYmd) {
        if (this.currentCourse !== 'all') {
          if (this.currentCourse === 'Unspecified' && r._course !== 'Unspecified') return;
          if (this.currentCourse !== 'Unspecified' && r._course !== this.currentCourse) return;
        }
        todayAmount += r._amount;
        todayTx += 1;
      }
    });

    // Average Payment
    const avgPayment = totalTx > 0 ? totalAmount / totalTx : 0;

    // Current Month Collection: ALWAYS actual current calendar month (November 2026)
    // Filtered by course if selected, but independent of the date range dropdown
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let currentMonthCollection = 0;
    let currentMonthTx = 0;

    this.masterRecords.forEach(r => {
      if (!r._isValid || !r._parsedDate) return;
      if (r._parsedDate.getFullYear() === currentYear && r._parsedDate.getMonth() === currentMonth) {
        if (this.currentCourse !== 'all') {
          if (this.currentCourse === 'Unspecified' && r._course !== 'Unspecified') return;
          if (this.currentCourse !== 'Unspecified' && r._course !== this.currentCourse) return;
        }
        currentMonthCollection += r._amount;
        currentMonthTx += 1;
      }
    });

    // Update DOM nodes
    if (this.kpiNodes.totalCollection) this.kpiNodes.totalCollection.textContent = formatInr(totalAmount);
    if (this.kpiNodes.totalTransactions) this.kpiNodes.totalTransactions.textContent = formatCount(totalTx);
    if (this.kpiNodes.todayCollection) this.kpiNodes.todayCollection.textContent = formatInr(todayAmount);
    if (this.kpiNodes.avgPayment) this.kpiNodes.avgPayment.textContent = formatInr(avgPayment);
    if (this.kpiNodes.currentMonthCollection) this.kpiNodes.currentMonthCollection.textContent = formatInr(currentMonthCollection);

    // Update subtitles
    if (this.kpiSubNodes.totalCollection) {
      this.kpiSubNodes.totalCollection.textContent = `${totalTx} receipt${totalTx === 1 ? '' : 's'} recorded`;
    }
    if (this.kpiSubNodes.todayCollection) {
      if (todayTx > 0) {
        this.kpiSubNodes.todayCollection.textContent = `${todayTx} successful ${todayTx === 1 ? 'transaction' : 'transactions'} today`;
      } else {
        this.kpiSubNodes.todayCollection.textContent = `0 successful transactions today`;
      }
    }
    if (this.kpiSubNodes.avgPayment) {
      this.kpiSubNodes.avgPayment.textContent = totalTx > 0 ? `Across ${totalTx} payments` : 'No payments';
    }
    const monthName = MONTH_NAMES_FULL[currentMonth];
    if (this.kpiSubNodes.currentMonthCollection) {
      this.kpiSubNodes.currentMonthCollection.textContent = `${monthName} ${currentYear} (${currentMonthTx} receipts) • Independent of filter`;
    }
  }

  /**
   * Graph 1: Monthly Collection (Vertical Bar Chart)
   * Displays all 12 calendar months ending with the current month.
   * Aggregates masterRecords (filtered by Course), ensuring October 2026 and
   * November 2026 contain all actual payments, not truncated by the 7-day filter.
   */
  renderMonthlyChart() {
    if (!this.monthlyChartContainer) return;

    const months = [];
    const now = new Date();
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 12 calendar months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(endMonth.getFullYear(), endMonth.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_NAMES_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
        fullLabel: `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`,
        isCurrentMonth: d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(),
        total: 0,
        count: 0
      });
    }

    // Aggregate records matching the Course filter across all masterRecords
    this.masterRecords.forEach(r => {
      if (!r._isValid || !r._parsedDate) return;

      if (this.currentCourse !== 'all') {
        if (this.currentCourse === 'Unspecified' && r._course !== 'Unspecified') return;
        if (this.currentCourse !== 'Unspecified' && r._course !== this.currentCourse) return;
      }

      const rYear = r._parsedDate.getFullYear();
      const rMonth = r._parsedDate.getMonth();
      const target = months.find(m => m.year === rYear && m.month === rMonth);
      if (target) {
        target.total += r._amount;
        target.count += 1;
      }
    });

    const maxTotal = Math.max(...months.map(m => m.total), 10000);
    const upperLimit = this.getNiceMax(maxTotal);

    if (this.monthlyBadge) {
      this.monthlyBadge.textContent = `12 Months View (${months[0].label} – ${months[months.length - 1].label})`;
    }

    // SVG Dimensions
    const width = 640;
    const height = 230;
    const padLeft = 65;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Y Gridlines
    const yTicks = [0, upperLimit * 0.33, upperLimit * 0.66, upperLimit];
    const gridLinesSvg = yTicks.map(val => {
      const y = padTop + chartH - (val / upperLimit) * chartH;
      return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3,3" />
        <text x="${padLeft - 8}" y="${y + 4}" font-size="10" fill="currentColor" fill-opacity="0.55" text-anchor="end">${formatInr(val, { compact: true })}</text>
      `;
    }).join('');

    // Bars
    const barWidth = Math.max(14, Math.min(34, (chartW / months.length) * 0.62));
    const step = chartW / months.length;

    const barsSvg = months.map((m, idx) => {
      const cx = padLeft + idx * step + step / 2;
      const x = cx - barWidth / 2;
      const bHeight = Math.max(0, (m.total / upperLimit) * chartH);
      const y = padTop + chartH - bHeight;

      const isCurrent = m.isCurrentMonth;
      const barFill = isCurrent ? 'url(#barGradientActive)' : 'url(#barGradient)';
      const strokeAttr = isCurrent ? 'stroke="#ea580c" stroke-width="1.5"' : '';

      return `
        <g class="fees-bar-group" data-month-index="${idx}" tabindex="0" role="button" aria-label="${m.fullLabel}: ${formatInr(m.total)}">
          <rect x="${x}" y="${padTop}" width="${barWidth}" height="${chartH}" rx="4" fill="currentColor" fill-opacity="0.03" />
          
          ${m.total > 0 ? `
            <text x="${cx}" y="${y - 6}" font-size="9.5" font-weight="600" fill="currentColor" fill-opacity="0.75" text-anchor="middle">
              ${formatInr(m.total, { compact: true })}
            </text>
          ` : ''}

          <rect 
            x="${x}" 
            y="${m.total > 0 ? y : padTop + chartH - 2}" 
            width="${barWidth}" 
            height="${m.total > 0 ? bHeight : 2}" 
            rx="4" 
            fill="${barFill}"
            ${strokeAttr}
            class="fees-bar-rect"
          />

          ${isCurrent ? `
            <circle cx="${cx}" cy="${padTop + chartH + 18}" r="2" fill="#ea580c" />
          ` : ''}

          <text 
            x="${cx}" 
            y="${padTop + chartH + 16}" 
            font-size="10.5" 
            font-weight="${isCurrent ? '700' : '500'}" 
            fill="${isCurrent ? '#ea580c' : 'currentColor'}" 
            fill-opacity="${isCurrent ? '1' : '0.65'}" 
            text-anchor="middle"
          >
            ${m.label}
          </text>
        </g>
      `;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="fees-analytics-svg" preserveAspectRatio="none" role="img" aria-label="Monthly Fee Collection Bar Chart">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#ea580c" />
          </linearGradient>
          <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fb923c" />
            <stop offset="100%" stop-color="#c2410c" />
          </linearGradient>
        </defs>
        ${gridLinesSvg}
        ${barsSvg}
      </svg>
    `;

    this.monthlyChartContainer.innerHTML = svg;
    this.bindMonthlyHover(months);
  }

  bindMonthlyHover(months) {
    const groups = this.monthlyChartContainer.querySelectorAll('.fees-bar-group');
    groups.forEach(group => {
      const idx = Number(group.dataset.monthIndex);
      const data = months[idx];
      if (!data) return;

      const showTip = () => {
        const rect = group.getBoundingClientRect();
        const parentRect = this.container.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - parentRect.left;
        const y = rect.top - parentRect.top;

        this.showTooltip({
          title: data.fullLabel + (data.isCurrentMonth ? ' (Current Month)' : ''),
          items: [
            { label: 'Total Collection', value: formatInr(data.total) },
            { label: 'Transactions', value: `${formatCount(data.count)} receipt${data.count === 1 ? '' : 's'}` },
            { label: 'Average Payment', value: data.count > 0 ? formatInr(data.total / data.count) : '₹0' }
          ]
        }, x, y);
      };

      group.addEventListener('mouseenter', showTip);
      group.addEventListener('mousemove', showTip);
      group.addEventListener('focus', showTip);
      group.addEventListener('mouseleave', () => this.hideTooltip());
      group.addEventListener('blur', () => this.hideTooltip());
    });
  }

  /**
   * Graph 2: Daily Collection Trend (Smooth Area / Line Chart)
   * Defaults to Last 30 Days (all 30 dates generated consecutively).
   * If user explicitly selects '7d', shows 7 days.
   * Correctly aggregates multiple payments on the same date.
   */
  renderDailyTrendChart(filterStart, filterEnd) {
    if (!this.dailyChartContainer) return;

    const days = [];
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let startDate;
    let endDate;
    let badgeLabel = 'Last 30 Days Trend';

    if (this.currentRange === '7d') {
      startDate = new Date(todayEnd);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = todayEnd;
      badgeLabel = 'Last 7 Days Trend';
    } else if (this.currentRange === 'custom') {
      startDate = new Date(filterStart);
      endDate = new Date(filterEnd);
      const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 60) {
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 59);
        startDate.setHours(0, 0, 0, 0);
      }
      badgeLabel = `${diffDays} Days Trend`;
    } else {
      // Default: Last 30 Days
      startDate = new Date(todayEnd);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      endDate = todayEnd;
      badgeLabel = 'Last 30 Days Trend';
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const ymd = toYmd(d);
      days.push({
        date: new Date(d),
        ymd: ymd,
        label: `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`,
        fullLabel: `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`,
        total: 0,
        count: 0
      });
    }

    // Aggregate masterRecords matching course and date window
    this.masterRecords.forEach(r => {
      if (!r._isValid || !r._ymd) return;

      if (this.currentCourse !== 'all') {
        if (this.currentCourse === 'Unspecified' && r._course !== 'Unspecified') return;
        if (this.currentCourse !== 'Unspecified' && r._course !== this.currentCourse) return;
      }

      const match = days.find(day => day.ymd === r._ymd);
      if (match) {
        match.total += r._amount;
        match.count += 1;
      }
    });

    const maxDaily = Math.max(...days.map(d => d.total), 5000);
    const upperLimit = this.getNiceMax(maxDaily);

    if (this.dailyBadge) {
      this.dailyBadge.textContent = `${badgeLabel} (${days.length} Days)`;
    }

    // SVG Dimensions
    const width = 520;
    const height = 230;
    const padLeft = 55;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Y Gridlines
    const yTicks = [0, upperLimit * 0.5, upperLimit];
    const gridSvg = yTicks.map(val => {
      const y = padTop + chartH - (val / upperLimit) * chartH;
      return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3,3" />
        <text x="${padLeft - 8}" y="${y + 4}" font-size="9.5" fill="currentColor" fill-opacity="0.55" text-anchor="end">${formatInr(val, { compact: true })}</text>
      `;
    }).join('');

    // Compute coordinate points (x, y)
    const step = days.length > 1 ? chartW / (days.length - 1) : chartW;
    const points = days.map((day, idx) => {
      const x = padLeft + idx * step;
      const y = padTop + chartH - (day.total / upperLimit) * chartH;
      return { x, y, day };
    });

    // Build Smooth Cubic Bezier Spline
    let pathD = '';
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
    }

    const areaD = pathD ? `${pathD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z` : '';

    // X Axis Labels (~5 points distributed evenly)
    const labelStride = Math.max(1, Math.floor(days.length / 5));
    const xLabelsSvg = points.filter((_, idx) => idx % labelStride === 0 || idx === points.length - 1).map(pt => {
      return `
        <text x="${pt.x}" y="${padTop + chartH + 16}" font-size="9.5" fill="currentColor" fill-opacity="0.6" text-anchor="middle">
          ${pt.day.label}
        </text>
      `;
    }).join('');

    // Active dots on peak days
    const activeDotsSvg = points.filter(pt => pt.day.total > 0).map(pt => `
      <circle cx="${pt.x}" cy="${pt.y}" r="3.2" fill="#ffffff" stroke="#ea580c" stroke-width="2" class="fees-daily-dot" />
    `).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="fees-analytics-svg fees-interactive-chart" preserveAspectRatio="none" role="img" aria-label="Daily Collection Trend Chart">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0.32" />
            <stop offset="85%" stop-color="#ea580c" stop-opacity="0.02" />
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0.00" />
          </linearGradient>
        </defs>
        ${gridSvg}
        <path d="${areaD}" fill="url(#areaGradient)" />
        <path d="${pathD}" fill="none" stroke="#ea580c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        ${activeDotsSvg}
        ${xLabelsSvg}

        <!-- Interactive hover tracker line and dot -->
        <line x1="0" y1="${padTop}" x2="0" y2="${padTop + chartH}" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="3,3" opacity="0" class="fees-tracker-line" />
        <circle cx="0" cy="0" r="5" fill="#ea580c" stroke="#ffffff" stroke-width="2" opacity="0" class="fees-tracker-dot" />
      </svg>
    `;

    this.dailyChartContainer.innerHTML = svg;
    this.bindDailyHover(points, width, height);
  }

  bindDailyHover(points, svgW, svgH) {
    const svgEl = this.dailyChartContainer.querySelector('svg');
    const line = svgEl?.querySelector('.fees-tracker-line');
    const dot = svgEl?.querySelector('.fees-tracker-dot');
    if (!svgEl || !line || !dot || points.length === 0) return;

    const onPointerMove = (e) => {
      const svgRect = svgEl.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX == null) return;

      const normX = ((clientX - svgRect.left) / svgRect.width) * svgW;

      // Find nearest point
      let closest = points[0];
      let minDiff = Math.abs(points[0].x - normX);
      for (let i = 1; i < points.length; i++) {
        const diff = Math.abs(points[i].x - normX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = points[i];
        }
      }

      line.setAttribute('x1', closest.x);
      line.setAttribute('x2', closest.x);
      line.setAttribute('opacity', '1');

      dot.setAttribute('cx', closest.x);
      dot.setAttribute('cy', closest.y);
      dot.setAttribute('opacity', '1');

      const parentRect = this.container.getBoundingClientRect();
      const tooltipX = svgRect.left + (closest.x / svgW) * svgRect.width - parentRect.left;
      const tooltipY = svgRect.top + (closest.y / svgH) * svgRect.height - parentRect.top;

      this.showTooltip({
        title: closest.day.fullLabel,
        items: [
          { label: 'Collection', value: formatInr(closest.day.total) },
          { label: 'Receipts', value: `${formatCount(closest.day.count)} payment${closest.day.count === 1 ? '' : 's'}` }
        ]
      }, tooltipX, tooltipY);
    };

    const onPointerLeave = () => {
      line.setAttribute('opacity', '0');
      dot.setAttribute('opacity', '0');
      this.hideTooltip();
    };

    svgEl.addEventListener('mousemove', onPointerMove);
    svgEl.addEventListener('touchmove', onPointerMove, { passive: true });
    svgEl.addEventListener('mouseleave', onPointerLeave);
    svgEl.addEventListener('touchend', onPointerLeave);
  }

  /**
   * Graph 3: Course-wise Revenue (Horizontal Bar Chart)
   * Groups filtered records by course and displays revenue share.
   */
  renderCourseChart() {
    if (!this.courseChartContainer) return;

    const courseMap = new Map();
    let grandTotal = 0;

    this.filteredRecords.forEach(r => {
      const courseName = r._course;
      const amt = r._amount;
      grandTotal += amt;

      const curr = courseMap.get(courseName) || { course: courseName, total: 0, count: 0 };
      curr.total += amt;
      curr.count += 1;
      courseMap.set(courseName, curr);
    });

    const courses = Array.from(courseMap.values()).sort((a, b) => b.total - a.total);

    if (this.courseBadge) {
      this.courseBadge.textContent = `${courses.length} Program${courses.length === 1 ? '' : 's'}`;
    }

    if (courses.length === 0 || grandTotal === 0) {
      this.courseChartContainer.innerHTML = `
        <div class="fees-analytics-empty-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="w-8 h-8 opacity-40"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>
          <p>No fee records found for the selected filter combination.</p>
        </div>
      `;
      return;
    }

    const colorMap = {
      'JEE': { bg: 'rgba(234, 88, 12, 0.12)', text: '#ea580c', bar: 'linear-gradient(90deg, #ea580c, #f97316)' },
      'NEET': { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', bar: 'linear-gradient(90deg, #059669, #10b981)' },
      'Foundation': { bg: 'rgba(124, 58, 237, 0.12)', text: '#7c3aed', bar: 'linear-gradient(90deg, #7c3aed, #a855f7)' },
      'Unspecified': { bg: 'rgba(100, 116, 139, 0.14)', text: '#475569', bar: 'linear-gradient(90deg, #64748b, #94a3b8)' }
    };

    const rowsHtml = courses.map(item => {
      const sharePct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
      const theme = colorMap[item.course] || { bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c', bar: 'linear-gradient(90deg, #ea580c, #f97316)' };

      return `
        <div class="fees-course-row" tabindex="0" role="group" aria-label="${item.course}: ${formatInr(item.total)} (${sharePct.toFixed(1)}%)">
          <div class="fees-course-info">
            <div class="fees-course-label-wrap">
              <span class="fees-course-pill" style="background-color: ${theme.bg}; color: ${theme.text};">
                ${item.course}
              </span>
              <span class="fees-course-tx-count">${formatCount(item.count)} payment${item.count === 1 ? '' : 's'}</span>
            </div>
            <div class="fees-course-figures">
              <span class="fees-course-amount">${formatInr(item.total)}</span>
              <span class="fees-course-pct">${sharePct.toFixed(1)}%</span>
            </div>
          </div>
          <!-- Horizontal Progress Track -->
          <div class="fees-course-track" aria-hidden="true">
            <div class="fees-course-bar" style="width: ${Math.min(100, Math.max(2, sharePct))}%; background: ${theme.bar};"></div>
          </div>
        </div>
      `;
    }).join('');

    this.courseChartContainer.innerHTML = `
      <div class="fees-course-list">
        ${rowsHtml}
      </div>
    `;
  }

  showTooltip({ title, items = [] }, x, y) {
    if (!this.tooltipEl) return;
    const itemsHtml = items.map(it => `
      <div class="fees-tooltip-row">
        <span class="fees-tooltip-key">${it.label}:</span>
        <strong class="fees-tooltip-val">${it.value}</strong>
      </div>
    `).join('');

    this.tooltipEl.innerHTML = `
      <div class="fees-tooltip-title">${title}</div>
      <div class="fees-tooltip-body">${itemsHtml}</div>
    `;

    this.tooltipEl.style.left = `${Math.round(x)}px`;
    this.tooltipEl.style.top = `${Math.round(y)}px`;
    this.tooltipEl.hidden = false;
  }

  hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.hidden = true;
  }

  getNiceMax(val) {
    if (val <= 0) return 10000;
    const factor = Math.pow(10, Math.floor(Math.log10(val)));
    const ratio = val / factor;
    let roundRatio;
    if (ratio <= 1.2) roundRatio = 1.2;
    else if (ratio <= 2) roundRatio = 2;
    else if (ratio <= 5) roundRatio = 5;
    else roundRatio = 10;
    return Math.ceil(roundRatio * factor);
  }
}

/**
 * Initializes the fee analytics dashboard in the fees page.
 */
let analyticsInstance = null;

export function initFeeAnalytics({ onRefreshRequested } = {}) {
  const container = document.querySelector('[data-fees-analytics]');
  if (!container) return null;
  analyticsInstance = new FeeAnalyticsController(container, { onRefreshRequested });
  return analyticsInstance;
}

export function updateFeeAnalyticsData(records = []) {
  if (analyticsInstance) {
    analyticsInstance.updateRecords(records);
  }
}
