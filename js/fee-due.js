/**
 * My JEE Mentor - Fee Due Tracker UI & Manager
 * 
 * Manages the dedicated Due Fees page/view:
 * - Live diagnostic bar (Source, Students count, Receipts count, Tracking start date, Sync timestamp)
 * - 4 KPI cards (Due Today, Overdue, Upcoming 7 Days, Collected Today)
 * - Collapsible Data Quality ("Needs Attention") panel
 * - Collapsible Receipt Matching Audit panel
 * - 4 Tabs (All, Due Today, Overdue, Upcoming 7d)
 * - Search, filter (Class, Batch, Course), sort, and inactive toggle
 * - Highlight Due Today rows
 * - Searchable data table with status chips and expandable month-wise cycle breakdowns
 * - One-click Collect workflow prefilling existing fee collection form
 * - WhatsApp reminder to Parent Mobile in +91 format with polite text
 * - Zero mock data in production: displays "Students data load nahi hua, Sync dabao" on failure
 */

import {
  parseAdmissionDate,
  calculateStudentLedger,
  calculateDueMetrics,
  formatDateDisplay,
  getKolkataYmd,
  matchReceiptsToStudents,
  validateStudentData,
  TRACKING_START_DATE
} from './fee-due-calc.js';
import { formatInr, formatCount, formatKolkataDate } from './fee-analytics.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

/**
 * Formats phone to WhatsApp wa.me format (e.g. 917294048814).
 * Prioritizes Parent Mobile, falls back to Student Mobile.
 */
export function formatWaUrl(phone, student, amountDue, dueDateStr) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  const fullNumber = digits.length === 10 ? '91' + digits : digits;

  const name = student?.studentName || 'Student';
  const batchOrCourse = [student?.studentClass, student?.batch, student?.subject].filter(Boolean).join(' - ') || 'course';
  const dueAmount = formatInr(amountDue);
  const dateText = dueDateStr || 'this month';

  const message = `Dear Parent / ${name},\n\nGreetings from My JEE Mentor!\n\nThis is a gentle reminder regarding the monthly fee for ${name} (${batchOrCourse}). The scheduled fee for ${dateText} of ${dueAmount} is pending.\n\nKindly clear the dues at your earliest convenience. If you have already completed the payment, please share the transaction receipt with us.\n\nThank you,\nMy JEE Mentor\n+91 73042 56203`;

  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates the HTML markup for the Fee Due Tracker.
 */
export function renderDueTrackerMarkup() {
  return `
    <section class="fees-panel fees-due-tracker-panel" data-fee-due-tracker hidden aria-label="Fee Due Tracker">
      <!-- Tracker Header -->
      <div class="fees-due-header">
        <div class="fees-due-title-wrap">
          <div class="fees-due-badge-row">
            <span class="eyebrow">DUE FEES RECOVERY</span>
            <span class="fees-due-source-pill">
              <span class="fees-pulse-dot"></span> Real-time Schedule
            </span>
          </div>
          <h2 class="fees-due-heading">Fee Due Tracker</h2>
          <p class="fees-due-sub">Track student admission schedules, due dates, overdue recovery &amp; collection status</p>
        </div>

        <div class="fees-due-header-actions">
          <button type="button" class="btn btn-outline fees-due-btn-back" data-due-back title="Back to Fee Collection & Analytics">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fees-back-icon" aria-hidden="true">
              <line x1="19" y1="10" x2="5" y2="10"></line>
              <polyline points="12 17 5 10 12 3"></polyline>
            </svg>
            <span>Back to Analytics</span>
          </button>

          <button type="button" class="btn btn-outline fees-analytics-btn-refresh fees-due-sync-btn" data-due-sync title="Synchronize student fee due records">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fees-sync-icon" aria-hidden="true">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Sync</span>
          </button>
          <span class="fees-due-synced-at" data-due-synced-at>Synced</span>
        </div>
      </div>

      <!-- Live Diagnostic Bar -->
      <div class="fees-due-diagnostic-bar" data-due-diagnostic-bar>
        Source: Connecting to Google Sheets…
      </div>

      <!-- 4 High-Impact KPI Summary Cards -->
      <div class="fees-due-kpi-grid">
        <!-- KPI 1: Due Today -->
        <article class="fees-kpi-card due-kpi-today">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Due Today</span>
            <span class="fees-kpi-icon" aria-hidden="true">📅</span>
          </div>
          <div class="fees-kpi-value-row">
            <span class="fees-kpi-value" data-due-kpi-today-amount>₹0</span>
          </div>
          <p class="fees-kpi-meta"><strong data-due-kpi-today-count>0</strong> students due today</p>
        </article>

        <!-- KPI 2: Overdue -->
        <article class="fees-kpi-card due-kpi-overdue">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Total Overdue</span>
            <span class="fees-kpi-icon" aria-hidden="true">⚠️</span>
          </div>
          <div class="fees-kpi-value-row">
            <span class="fees-kpi-value" data-due-kpi-overdue-amount>₹0</span>
          </div>
          <p class="fees-kpi-meta"><strong data-due-kpi-overdue-count>0</strong> students overdue</p>
        </article>

        <!-- KPI 3: Upcoming 7 Days -->
        <article class="fees-kpi-card due-kpi-upcoming">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Upcoming (7 Days)</span>
            <span class="fees-kpi-icon" aria-hidden="true">⏳</span>
          </div>
          <div class="fees-kpi-value-row">
            <span class="fees-kpi-value" data-due-kpi-upcoming-amount>₹0</span>
          </div>
          <p class="fees-kpi-meta"><strong data-due-kpi-upcoming-count>0</strong> students in next 7 days</p>
        </article>

        <!-- KPI 4: Collected Today -->
        <article class="fees-kpi-card due-kpi-collected">
          <div class="fees-kpi-top">
            <span class="fees-kpi-label">Collected Today</span>
            <span class="fees-kpi-icon" aria-hidden="true">💰</span>
          </div>
          <div class="fees-kpi-value-row">
            <span class="fees-kpi-value" data-due-kpi-collected-amount>₹0</span>
          </div>
          <p class="fees-kpi-meta">Real-time receipts today</p>
        </article>
      </div>

      <!-- Collapsible Data Quality Panel: Needs Attention -->
      <details class="fees-due-attention-panel" data-due-attention-panel hidden>
        <summary class="fees-due-attention-summary">
          <span>⚠️ Data Quality: <strong data-due-attention-count>0</strong> student(s) need attention</span>
          <small>(Excluded from totals due to invalid date, missing fee, or duplicate ID)</small>
        </summary>
        <div class="fees-due-attention-body" data-due-attention-body></div>
      </details>

      <!-- Collapsible Receipt Matching Audit Panel -->
      <details class="fees-due-audit-panel" data-due-audit-panel hidden>
        <summary class="fees-due-audit-summary">
          <span>🔍 Receipt Matching Audit: <strong data-due-matched-count>0</strong> / <span data-due-total-receipts>0</span> matched</span>
          <span class="due-audit-badge" data-due-unmatched-badge>0 unmatched</span>
        </summary>
        <div class="fees-due-audit-body" data-due-audit-body></div>
      </details>

      <!-- Navigation Tabs & Compact Filter Bar -->
      <div class="fees-due-controls-wrap">
        <!-- 4 Tabs -->
        <div class="fees-due-tabs" role="tablist">
          <button type="button" class="fees-due-tab active" data-due-tab="all" role="tab" aria-selected="true">
            All Students <span class="fees-due-tab-count" data-due-tab-count="all">0</span>
          </button>
          <button type="button" class="fees-due-tab" data-due-tab="today" role="tab" aria-selected="false">
            Due Today <span class="fees-due-tab-count badge-orange" data-due-tab-count="today">0</span>
          </button>
          <button type="button" class="fees-due-tab" data-due-tab="overdue" role="tab" aria-selected="false">
            Overdue <span class="fees-due-tab-count badge-red" data-due-tab-count="overdue">0</span>
          </button>
          <button type="button" class="fees-due-tab" data-due-tab="upcoming" role="tab" aria-selected="false">
            Upcoming (7d) <span class="fees-due-tab-count badge-blue" data-due-tab-count="upcoming">0</span>
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="fees-due-filters-row">
          <!-- Search Input -->
          <div class="fees-due-filter-item fees-due-search-item">
            <label for="feesDueSearch">Search</label>
            <div class="fees-due-search-wrap">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fees-search-icon" aria-hidden="true">
                <circle cx="9" cy="9" r="6"></circle>
                <line x1="19" y1="19" x2="13.5" y2="13.5"></line>
              </svg>
              <input type="search" id="feesDueSearch" class="fees-filter-input fees-due-search-input" data-due-search placeholder="Search student name, ID or mobile…">
            </div>
          </div>

          <!-- Class Filter -->
          <div class="fees-due-filter-item">
            <label for="feesDueClass">Class</label>
            <select id="feesDueClass" class="fees-filter-select" data-due-class>
              <option value="all">All Classes</option>
            </select>
          </div>

          <!-- Batch Filter -->
          <div class="fees-due-filter-item">
            <label for="feesDueBatch">Batch</label>
            <select id="feesDueBatch" class="fees-filter-select" data-due-batch>
              <option value="all">All Batches</option>
            </select>
          </div>

          <!-- Course Filter -->
          <div class="fees-due-filter-item">
            <label for="feesDueCourse">Course</label>
            <select id="feesDueCourse" class="fees-filter-select" data-due-course>
              <option value="all">All Courses</option>
              <option value="JEE">JEE</option>
              <option value="NEET">NEET</option>
              <option value="Foundation">Foundation</option>
            </select>
          </div>

          <!-- Sort Filter -->
          <div class="fees-due-filter-item">
            <label for="feesDueSort">Sort By</label>
            <select id="feesDueSort" class="fees-filter-select" data-due-sort>
              <option value="oldest" selected>Oldest Due First (Default)</option>
              <option value="amount-desc">Amount Due: High to Low</option>
              <option value="name-asc">Student Name: A → Z</option>
              <option value="due-date">Due Date: Nearest First</option>
            </select>
          </div>

          <!-- Inactive Students Toggle -->
          <div class="fees-due-filter-item fees-due-toggle-item">
            <label class="fees-due-checkbox-label">
              <input type="checkbox" data-due-show-inactive>
              <span>Show Inactive</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Live Status / Filter Feedback -->
      <p class="fees-status" data-due-status role="status" aria-live="polite"></p>

      <!-- Searchable & Sortable Students Table -->
      <div class="fees-table-wrap fees-due-table-wrap">
        <table class="fees-table fees-due-table">
          <thead>
            <tr>
              <th scope="col" style="width: 100px;">Student ID</th>
              <th scope="col">Student &amp; Parent</th>
              <th scope="col">Class / Batch / Subject</th>
              <th scope="col">Monthly Fee</th>
              <th scope="col">Fee Due Date</th>
              <th scope="col">Days Left / Overdue</th>
              <th scope="col">Amount Due</th>
              <th scope="col">Status</th>
              <th scope="col" style="min-width: 170px;">Actions</th>
            </tr>
          </thead>
          <tbody data-due-rows>
            <tr><td colspan="9">Loading student records…</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/**
 * Sample students for testing/reference purposes only.
 * NEVER used as fallback in production.
 */
export const DEFAULT_STUDENTS = [
  {
    studentId: 'MJM001',
    studentName: 'M. Vignesh',
    parentName: 'Madhan',
    studentMobile: '6363814536',
    parentMobile: '9663394531',
    batch: 'Ranker',
    studentClass: 'Class 12',
    subject: 'Maths',
    monthlyFee: 2500,
    admissionDate: '18/05/2026',
    status: 'Active'
  },
  {
    studentId: 'MJM002',
    studentName: 'D.Adithya',
    parentName: 'D. Chennaiah',
    studentMobile: '7013438004',
    parentMobile: '7013438004',
    batch: 'Ranker',
    studentClass: 'Class 11',
    subject: 'Maths Physics',
    monthlyFee: 2500,
    admissionDate: '19/05/2026',
    status: 'Active'
  }
];

/**
 * Initializes the Fee Due Tracker.
 */
export function initDueTracker({ onCollect, onBackToAnalytics, onSyncRequested }) {
  const tracker = document.querySelector('[data-fee-due-tracker]');
  if (!tracker) return null;

  const rowsTbody = tracker.querySelector('[data-due-rows]');
  const statusEl = tracker.querySelector('[data-due-status]');
  const syncedAtEl = tracker.querySelector('[data-due-synced-at]');
  const diagnosticBar = tracker.querySelector('[data-due-diagnostic-bar]');
  const searchInput = tracker.querySelector('[data-due-search]');
  const classSelect = tracker.querySelector('[data-due-class]');
  const batchSelect = tracker.querySelector('[data-due-batch]');
  const courseSelect = tracker.querySelector('[data-due-course]');
  const sortSelect = tracker.querySelector('[data-due-sort]');
  const inactiveCheckbox = tracker.querySelector('[data-due-show-inactive]');
  const tabs = tracker.querySelectorAll('[data-due-tab]');

  // Attention & Audit elements
  const attentionPanel = tracker.querySelector('[data-due-attention-panel]');
  const attentionCountEl = tracker.querySelector('[data-due-attention-count]');
  const attentionBody = tracker.querySelector('[data-due-attention-body]');
  const auditPanel = tracker.querySelector('[data-due-audit-panel]');
  const auditMatchedEl = tracker.querySelector('[data-due-matched-count]');
  const auditTotalReceiptsEl = tracker.querySelector('[data-due-total-receipts]');
  const auditUnmatchedBadge = tracker.querySelector('[data-due-unmatched-badge]');
  const auditBody = tracker.querySelector('[data-due-audit-body]');

  // KPI elements
  const kpiTodayAmount = tracker.querySelector('[data-due-kpi-today-amount]');
  const kpiTodayCount = tracker.querySelector('[data-due-kpi-today-count]');
  const kpiOverdueAmount = tracker.querySelector('[data-due-kpi-overdue-amount]');
  const kpiOverdueCount = tracker.querySelector('[data-due-kpi-overdue-count]');
  const kpiUpcomingAmount = tracker.querySelector('[data-due-kpi-upcoming-amount]');
  const kpiUpcomingCount = tracker.querySelector('[data-due-kpi-upcoming-count]');
  const kpiCollectedAmount = tracker.querySelector('[data-due-kpi-collected-amount]');

  // Tab count elements
  const tabCountAll = tracker.querySelector('[data-due-tab-count="all"]');
  const tabCountToday = tracker.querySelector('[data-due-tab-count="today"]');
  const tabCountOverdue = tracker.querySelector('[data-due-tab-count="overdue"]');
  const tabCountUpcoming = tracker.querySelector('[data-due-tab-count="upcoming"]');

  let rawStudents = [];
  let rawFeeRecords = [];
  let studentLedgers = [];
  let activeTab = 'all';
  let expandedRows = new Set();
  let matchingAudit = null;
  let attentionList = [];

  const setStatus = (msg, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', isError);
    statusEl.classList.toggle('is-success', !isError && Boolean(msg));
  };

  const populateDropdowns = () => {
    const classes = new Set();
    const batches = new Set();

    for (const s of rawStudents) {
      if (s.studentClass || s.class) classes.add(s.studentClass || s.class);
      if (s.batch) batches.add(s.batch);
    }

    const currentClass = classSelect?.value || 'all';
    const currentBatch = batchSelect?.value || 'all';

    if (classSelect) {
      classSelect.innerHTML = '<option value="all">All Classes</option>' +
        Array.from(classes).sort().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      if (classes.has(currentClass)) classSelect.value = currentClass;
    }

    if (batchSelect) {
      batchSelect.innerHTML = '<option value="all">All Batches</option>' +
        Array.from(batches).sort().map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
      if (batches.has(currentBatch)) batchSelect.value = currentBatch;
    }
  };

  const computeLedgers = () => {
    const today = new Date();
    const { valid, needsAttention } = validateStudentData(rawStudents);
    attentionList = needsAttention;

    // Match receipts to valid students
    const { studentReceiptsMap, audit } = matchReceiptsToStudents(valid, rawFeeRecords);
    matchingAudit = audit;

    // Calculate ledgers for valid students
    const validLedgers = valid.map(s => {
      const sId = String(s.studentId).trim().toUpperCase();
      const receipts = studentReceiptsMap.get(sId) || [];
      return calculateStudentLedger(s, receipts, today);
    });

    // Generate error ledgers for needsAttention students (excluded from totals)
    const attentionLedgers = needsAttention.map(item => {
      const ledger = calculateStudentLedger(item.student, [], today);
      ledger.needsAttention = true;
      ledger.attentionReason = item.reason;
      return ledger;
    });

    studentLedgers = [...validLedgers, ...attentionLedgers];
    updateKpis();
    renderAttentionAndAuditPanels(audit, needsAttention);
  };

  const renderAttentionAndAuditPanels = (audit, needsAttention) => {
    // Attention Panel
    if (attentionPanel && attentionCountEl && attentionBody) {
      if (needsAttention && needsAttention.length > 0) {
        attentionPanel.hidden = false;
        attentionCountEl.textContent = String(needsAttention.length);
        attentionBody.innerHTML = `
          <ul class="fees-due-attention-list">
            ${needsAttention.map(item => `
              <li>
                <strong>${escapeHtml(item.student?.studentId || 'No ID')}</strong> — 
                <span>${escapeHtml(item.student?.studentName || 'Unnamed')}</span>: 
                <em class="text-red">${escapeHtml(item.reason)}</em>
              </li>
            `).join('')}
          </ul>
        `;
      } else {
        attentionPanel.hidden = true;
        attentionBody.innerHTML = '';
      }
    }

    // Audit Panel
    if (auditPanel && auditMatchedEl && auditTotalReceiptsEl && auditUnmatchedBadge && auditBody) {
      const totalReceipts = rawFeeRecords.length;
      if (totalReceipts > 0) {
        auditPanel.hidden = false;
        auditMatchedEl.textContent = String(audit.matchedCount);
        auditTotalReceiptsEl.textContent = String(totalReceipts);
        const unmatchedTotal = audit.unmatchedCount + audit.ambiguousCount;
        auditUnmatchedBadge.textContent = `${unmatchedTotal} unmatched`;
        auditUnmatchedBadge.classList.toggle('badge-red', unmatchedTotal > 0);
        auditUnmatchedBadge.classList.toggle('badge-green', unmatchedTotal === 0);

        const unmatchedList = [
          ...audit.unmatchedReceipts.map(u => ({ ...u, type: 'Unmatched' })),
          ...audit.ambiguousReceipts.map(a => ({ ...a, type: 'Ambiguous' }))
        ];

        if (unmatchedList.length > 0) {
          auditBody.innerHTML = `
            <div class="due-audit-table-wrap">
              <table class="due-audit-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Receipt No</th>
                    <th>Student Name</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Reason / Candidates</th>
                  </tr>
                </thead>
                <tbody>
                  ${unmatchedList.map(item => `
                    <tr>
                      <td><span class="due-audit-chip ${item.type === 'Ambiguous' ? 'chip-ambiguous' : 'chip-unmatched'}">${escapeHtml(item.type)}</span></td>
                      <td><strong>${escapeHtml(item.receipt?.receiptNo || '—')}</strong></td>
                      <td>${escapeHtml(item.receipt?.studentName || '—')}</td>
                      <td>${escapeHtml(item.receipt?.phone || '—')}</td>
                      <td>₹${escapeHtml(item.receipt?.amount || 0)}</td>
                      <td><small>${escapeHtml(item.reason || '')}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        } else {
          auditBody.innerHTML = `<p class="due-audit-clean-notice">✓ All ${totalReceipts} fee receipts matched cleanly to enrolled students.</p>`;
        }
      } else {
        auditPanel.hidden = true;
      }
    }
  };

  const updateKpis = () => {
    const metrics = calculateDueMetrics(studentLedgers, rawFeeRecords, new Date());

    if (kpiTodayAmount) kpiTodayAmount.textContent = formatInr(metrics.dueTodayAmount);
    if (kpiTodayCount) kpiTodayCount.textContent = formatCount(metrics.dueTodayCount);

    if (kpiOverdueAmount) kpiOverdueAmount.textContent = formatInr(metrics.overdueAmount);
    if (kpiOverdueCount) kpiOverdueCount.textContent = formatCount(metrics.overdueCount);

    if (kpiUpcomingAmount) kpiUpcomingAmount.textContent = formatInr(metrics.upcomingAmount);
    if (kpiUpcomingCount) kpiUpcomingCount.textContent = formatCount(metrics.upcomingCount);

    if (kpiCollectedAmount) kpiCollectedAmount.textContent = formatInr(metrics.collectedTodayAmount);

    // Update tab counts
    const activeLedgers = studentLedgers.filter(s => (s.active || inactiveCheckbox?.checked) && !s.needsAttention);
    if (tabCountAll) tabCountAll.textContent = formatCount(activeLedgers.length);
    if (tabCountToday) tabCountToday.textContent = formatCount(activeLedgers.filter(s => s.status === 'DUE TODAY').length);
    if (tabCountOverdue) tabCountOverdue.textContent = formatCount(activeLedgers.filter(s => s.status === 'OVERDUE').length);
    if (tabCountUpcoming) tabCountUpcoming.textContent = formatCount(activeLedgers.filter(s => s.status === 'UPCOMING').length);
  };

  const getFilteredLedgers = () => {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const classVal = classSelect?.value || 'all';
    const batchVal = batchSelect?.value || 'all';
    const courseVal = courseSelect?.value || 'all';
    const sortVal = sortSelect?.value || 'oldest';
    const showInactive = Boolean(inactiveCheckbox?.checked);

    let filtered = studentLedgers.filter(ledger => {
      // 1. Inactive filter
      if (!showInactive && !ledger.active) return false;

      // 2. Tab filter
      if (activeTab === 'today' && ledger.status !== 'DUE TODAY') return false;
      if (activeTab === 'overdue' && ledger.status !== 'OVERDUE') return false;
      if (activeTab === 'upcoming' && ledger.status !== 'UPCOMING') return false;

      // 3. Class filter
      if (classVal !== 'all' && ledger.studentClass !== classVal) return false;

      // 4. Batch filter
      if (batchVal !== 'all' && ledger.batch !== batchVal) return false;

      // 5. Course filter
      if (courseVal !== 'all') {
        const text = [ledger.studentClass, ledger.batch, ledger.subject].join(' ').toUpperCase();
        if (courseVal === 'JEE' && !text.includes('JEE') && !text.includes('MATH')) return false;
        if (courseVal === 'NEET' && !text.includes('NEET') && !text.includes('BIO') && !text.includes('PCB')) return false;
        if (courseVal === 'Foundation' && !text.includes('FOUNDATION') && !text.includes('CLASS 9') && !text.includes('CLASS 10') && !text.includes('CLASS 8') && !text.includes('CLASS 7')) return false;
      }

      // 6. Search query
      if (query) {
        const target = [
          ledger.studentId,
          ledger.studentName,
          ledger.parentName,
          ledger.studentMobile,
          ledger.parentMobile,
          ledger.batch,
          ledger.studentClass,
          ledger.subject
        ].join(' ').toLowerCase();
        if (!target.includes(query)) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortVal === 'oldest') {
        const weight = s => s.status === 'OVERDUE' ? 1 : s.status === 'DUE TODAY' ? 2 : s.status === 'UPCOMING' ? 3 : 4;
        const wA = weight(a), wB = weight(b);
        if (wA !== wB) return wA - wB;
        if (a.status === 'OVERDUE') return b.daysOverdue - a.daysOverdue;
        return a.studentName.localeCompare(b.studentName);
      }
      if (sortVal === 'amount-desc') {
        return b.outstanding - a.outstanding || a.studentName.localeCompare(b.studentName);
      }
      if (sortVal === 'name-asc') {
        return a.studentName.localeCompare(b.studentName);
      }
      if (sortVal === 'due-date') {
        const dateA = a.oldestUnpaidDate || a.nextDueDate || new Date(2099, 0, 1);
        const dateB = b.oldestUnpaidDate || b.nextDueDate || new Date(2099, 0, 1);
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });

    return filtered;
  };

  const renderTable = () => {
    if (!rawStudents.length) {
      return; // Error or empty state handled in updateData
    }

    const list = getFilteredLedgers();

    if (!list.length) {
      rowsTbody.innerHTML = `
        <tr>
          <td colspan="9" class="fees-empty-row">
            No students match the current filters.
          </td>
        </tr>
      `;
      setStatus(`0 students found for current filter.`);
      return;
    }

    setStatus(`${list.length} student${list.length === 1 ? '' : 's'} displayed.`);

    rowsTbody.innerHTML = list.map(student => {
      const isExpanded = expandedRows.has(student.studentId);
      const isDueToday = student.status === 'DUE TODAY';
      const phone = student.parentMobile || student.studentMobile || '';
      const waUrl = formatWaUrl(phone, student, student.outstanding > 0 ? student.outstanding : student.monthlyFee, student.oldestUnpaidDateDisplay);

      // Status chip classes
      let statusChipClass = 'chip-paid';
      let statusChipText = 'Paid';
      if (student.needsAttention) {
        statusChipClass = 'chip-attention';
        statusChipText = 'Attention';
      } else if (student.status === 'DUE TODAY') {
        statusChipClass = 'chip-today';
        statusChipText = 'Due Today';
      } else if (student.status === 'OVERDUE') {
        statusChipClass = 'chip-overdue';
        statusChipText = 'Overdue';
      } else if (student.status === 'UPCOMING') {
        statusChipClass = 'chip-upcoming';
        statusChipText = 'Upcoming';
      }

      // Schedule text
      const scheduleText = student.admissionDate ? `Every month on ${student.dueDayOrdinal}` : 'Invalid admission date';
      const detailSchedule = student.outstanding > 0
        ? `<div class="due-schedule-sub text-red">Oldest due: ${escapeHtml(student.oldestUnpaidDateDisplay)} (${student.monthsPending} mo${student.monthsPending > 1 ? 's' : ''})</div>`
        : `<div class="due-schedule-sub text-muted">Next due: ${escapeHtml(student.nextDueDateDisplay)}</div>`;

      // Days overdue or left
      let daysText = '—';
      if (student.needsAttention) {
        daysText = `<span class="badge-attention text-red font-medium">${escapeHtml(student.attentionReason || 'Needs Attention')}</span>`;
      } else if (student.status === 'DUE TODAY') {
        daysText = '<span class="badge-due-today font-bold">Due Today</span>';
      } else if (student.status === 'OVERDUE') {
        daysText = `<span class="badge-days-overdue">${student.daysOverdue} days overdue</span>`;
      } else if (student.status === 'UPCOMING') {
        daysText = `<span class="badge-days-upcoming">${student.daysLeft === 0 ? 'Today' : student.daysLeft + 'd left'}</span>`;
      } else {
        daysText = `<span class="text-green font-medium">All cleared</span>`;
      }

      // Cycle history rows for expanded breakdown
      const cycleRows = student.cycles.length
        ? student.cycles.map(c => `
          <tr class="cycle-row cycle-${c.status.toLowerCase()}">
            <td><strong>Cycle ${c.cycleIndex + 1}</strong> (${escapeHtml(c.monthYear)})</td>
            <td>${escapeHtml(c.cycleDateDisplay)}</td>
            <td>${formatInr(c.fee)}</td>
            <td class="text-green font-medium">${formatInr(c.paid)}</td>
            <td class="${c.balance > 0 ? 'text-red font-bold' : 'text-muted'}">${formatInr(c.balance)}</td>
            <td>
              <span class="due-mini-chip chip-${c.status.toLowerCase()}">${escapeHtml(c.status)}</span>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="6" class="text-muted text-center py-2">No due cycles recorded since tracking start date (1 Oct 2026).</td></tr>';

      return `
        <tr class="fees-due-row ${isExpanded ? 'is-expanded' : ''} ${isDueToday ? 'is-due-today-row' : ''} ${!student.active ? 'is-inactive-student' : ''}" data-student-id="${escapeHtml(student.studentId)}">
          <td>
            <div class="due-id-cell">
              <button type="button" class="due-expand-toggle" data-action="toggle-expand" data-id="${escapeHtml(student.studentId)}" title="Click to view cycle history" aria-expanded="${isExpanded}">
                <span class="chevron-icon">${isExpanded ? '▼' : '▶'}</span>
                <strong>${escapeHtml(student.studentId || 'N/A')}</strong>
              </button>
              ${!student.active ? '<span class="due-inactive-pill">Inactive</span>' : ''}
            </div>
          </td>
          <td>
            <div class="fees-student-cell">
              <strong class="student-name-text">${escapeHtml(student.studentName)}</strong>
              ${student.parentName ? `<small class="fees-parent-name">P: ${escapeHtml(student.parentName)}</small>` : ''}
              ${phone ? `
                <div class="fees-phone-cell-links">
                  <a href="tel:${escapeHtml(phone)}" class="fees-phone-link" title="Call ${escapeHtml(phone)}">
                    <span>📞</span> ${escapeHtml(phone)}
                  </a>
                </div>
              ` : ''}
            </div>
          </td>
          <td>
            <div class="due-academic-cell">
              <span class="due-class-badge">${escapeHtml(student.studentClass || '—')}</span>
              <span class="due-batch-text">${escapeHtml(student.batch || '—')}</span>
              ${student.subject ? `<small class="due-subject-text">${escapeHtml(student.subject)}</small>` : ''}
            </div>
          </td>
          <td class="font-bold">
            ${formatInr(student.monthlyFee)}
          </td>
          <td>
            <div class="due-schedule-cell">
              <span class="due-schedule-main">${scheduleText}</span>
              ${detailSchedule}
            </div>
          </td>
          <td>
            <div class="due-days-cell">
              ${daysText}
            </div>
          </td>
          <td class="due-amount-cell">
            <strong class="${student.outstanding > 0 ? 'amount-outstanding' : 'amount-zero'}">
              ${formatInr(student.outstanding)}
            </strong>
            ${student.advanceCredit > 0 ? `<small class="advance-credit-text">Credit: +${formatInr(student.advanceCredit)}</small>` : ''}
          </td>
          <td>
            <span class="due-status-chip ${statusChipClass}">${statusChipText}</span>
          </td>
          <td>
            <div class="due-actions-cell">
              <button type="button" class="btn btn-primary fees-btn-collect" data-action="collect" data-id="${escapeHtml(student.studentId)}" title="Collect fee for ${escapeHtml(student.studentName)}">
                <span>Collect</span>
              </button>
              ${waUrl ? `
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline fees-btn-wa" title="Send WhatsApp reminder to Parent">
                  <span>💬</span>
                </a>
              ` : ''}
              ${phone ? `
                <a href="tel:${escapeHtml(phone)}" class="btn btn-outline fees-btn-call" title="Call phone">
                  <span>📞</span>
                </a>
              ` : ''}
            </div>
          </td>
        </tr>
        <!-- Expandable Sub-Row (Monthly Cycle Breakdown) -->
        <tr class="fees-due-subrow" data-subrow="${escapeHtml(student.studentId)}" ${isExpanded ? '' : 'hidden'}>
          <td colspan="9">
            <div class="due-breakdown-card">
              <div class="due-breakdown-head">
                <h4>Month-Wise Payment Breakdown — <strong>${escapeHtml(student.studentName)}</strong> (${escapeHtml(student.studentId)})</h4>
                <div class="due-breakdown-stats">
                  <span>Admission Date: <strong>${escapeHtml(student.admissionDateDisplay)}</strong></span>
                  <span>Tracking From: <strong>1 Oct 2026</strong></span>
                  <span>Total Due: <strong>${formatInr(student.totalDue)}</strong></span>
                  <span>Total Paid: <strong class="text-green">${formatInr(student.totalPaid)}</strong></span>
                  <span>Outstanding: <strong class="${student.outstanding > 0 ? 'text-red' : 'text-green'}">${formatInr(student.outstanding)}</strong></span>
                </div>
              </div>
              <table class="due-breakdown-table">
                <thead>
                  <tr>
                    <th>Cycle Period</th>
                    <th>Due Date</th>
                    <th>Monthly Fee</th>
                    <th>Paid Amount</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${cycleRows}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  // Event Listeners for Filters & Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeTab = tab.dataset.dueTab;
      renderTable();
    });
  });

  searchInput?.addEventListener('input', () => renderTable());
  classSelect?.addEventListener('change', () => renderTable());
  batchSelect?.addEventListener('change', () => renderTable());
  courseSelect?.addEventListener('change', () => renderTable());
  sortSelect?.addEventListener('change', () => renderTable());
  inactiveCheckbox?.addEventListener('change', () => {
    updateKpis();
    renderTable();
  });

  // Table row actions (Collect, Expand toggle)
  rowsTbody.addEventListener('click', event => {
    const expandBtn = event.target.closest('[data-action="toggle-expand"]');
    if (expandBtn) {
      const id = expandBtn.dataset.id;
      if (expandedRows.has(id)) {
        expandedRows.delete(id);
      } else {
        expandedRows.add(id);
      }
      renderTable();
      return;
    }

    const collectBtn = event.target.closest('[data-action="collect"]');
    if (collectBtn) {
      const id = collectBtn.dataset.id;
      const ledger = studentLedgers.find(s => s.studentId === id);
      if (ledger && typeof onCollect === 'function') {
        onCollect(ledger);
      }
      return;
    }
  });

  // Header Back Button
  tracker.querySelector('[data-due-back]')?.addEventListener('click', () => {
    if (typeof onBackToAnalytics === 'function') {
      onBackToAnalytics();
    }
  });

  // Sync Button
  tracker.querySelector('[data-due-sync]')?.addEventListener('click', () => {
    if (typeof onSyncRequested === 'function') {
      onSyncRequested();
    }
  });

  return {
    show: () => {
      tracker.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    hide: () => {
      tracker.hidden = true;
    },
    updateData: (students = [], feeRecords = [], meta = {}) => {
      // STRICT ZERO-MOCK RULE: If students feed failed or is empty, NEVER fallback to mock data!
      if (meta.error || !Array.isArray(students) || students.length === 0) {
        rawStudents = [];
        rawFeeRecords = Array.isArray(feeRecords) ? feeRecords : [];
        studentLedgers = [];
        expandedRows.clear();

        if (diagnosticBar) {
          diagnosticBar.innerHTML = `<span class="text-red font-bold">⚠️ Source: Students sheet offline (${escapeHtml(meta.error || 'No records returned')})</span> — Click Sync to retry.`;
        }

        // Reset KPIs
        if (kpiTodayAmount) kpiTodayAmount.textContent = '₹0';
        if (kpiTodayCount) kpiTodayCount.textContent = '0';
        if (kpiOverdueAmount) kpiOverdueAmount.textContent = '₹0';
        if (kpiOverdueCount) kpiOverdueCount.textContent = '0';
        if (kpiUpcomingAmount) kpiUpcomingAmount.textContent = '₹0';
        if (kpiUpcomingCount) kpiUpcomingCount.textContent = '0';
        if (kpiCollectedAmount) kpiCollectedAmount.textContent = '₹0';

        if (tabCountAll) tabCountAll.textContent = '0';
        if (tabCountToday) tabCountToday.textContent = '0';
        if (tabCountOverdue) tabCountOverdue.textContent = '0';
        if (tabCountUpcoming) tabCountUpcoming.textContent = '0';

        if (attentionPanel) attentionPanel.hidden = true;
        if (auditPanel) auditPanel.hidden = true;

        rowsTbody.innerHTML = `
          <tr>
            <td colspan="9" class="fees-empty-row fees-error-notice">
              <div class="fees-due-error-wrap">
                <span class="fees-due-error-icon">⚠️</span>
                <strong>Students data load nahi hua, Sync dabao</strong>
                <p>${escapeHtml(meta.error || 'Google Sheet "Fee Entry MJM" (tab Students) returned 0 records. Configure STUDENTS_SCRIPT_URL and STUDENTS_SECRET, then click Sync.')}</p>
              </div>
            </td>
          </tr>
        `;
        setStatus(meta.error || 'Students data could not be loaded. Click Sync.', true);
        return;
      }

      rawStudents = students;
      rawFeeRecords = Array.isArray(feeRecords) ? feeRecords : [];

      populateDropdowns();
      computeLedgers();
      renderTable();

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      if (syncedAtEl) {
        syncedAtEl.textContent = `Synced at ${timeStr.toLowerCase()}`;
      }

      if (diagnosticBar) {
        const validCount = rawStudents.length - attentionList.length;
        const matched = matchingAudit ? matchingAudit.matchedCount : 0;
        diagnosticBar.textContent = `Source: Students sheet live, ${validCount} students | Receipts: ${rawFeeRecords.length} (${matched} matched) | tracking from 1 Oct 2026 | last sync ${timeStr.toLowerCase()}`;
      }
    },
    getStudentLedgers: () => studentLedgers,
    getAttentionCount: () => {
      const metrics = calculateDueMetrics(studentLedgers, rawFeeRecords, new Date());
      return metrics.attentionRequiredCount;
    }
  };
}
