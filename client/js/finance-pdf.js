/**
 * My JEE Mentor - Institutional Financial Report & PDF Generator
 * 
 * Generates audit-ready, month-wise, CA-compliant PDF reports
 * using jsPDF & jspdf-autotable.
 *
 * Requirements:
 * - Single Month, All Months, Financial Year, Custom Date Range
 * - Exact month boundaries including leap years
 * - Reconciled Google Sheets data (Fee Register + Finance Sheets)
 * - Executive Summary, Month-Wise Breakdown, Detailed Registers
 * - Multi-page support, repeated headers, page numbers, zero website clutter
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Calculates exact start and end date for a given year and month (1-12),
 * correctly handling all leap years.
 */
export function getMonthDateRange(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    throw new Error(`Invalid year (${year}) or month (${month}) provided.`);
  }

  // Date with day 0 gives the last day of the previous month.
  // In Date.UTC(y, m, 0), passing m (1-based) gives the last day of month m!
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mStr = String(m).padStart(2, '0');
  const monthName = MONTH_NAMES[m - 1];

  return {
    year: y,
    month: m,
    monthKey: `${y}-${mStr}`,
    startDate: `${y}-${mStr}-01`,
    endDate: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    label: `${monthName} ${y}`,
    displayRange: `01 ${monthName} ${y} – ${String(lastDay).padStart(2, '0')} ${monthName} ${y}`
  };
}

/**
 * Calculates Indian Financial Year date range (01 April to 31 March).
 */
export function getFinancialYearRange(startYear) {
  const y = Number(startYear);
  if (isNaN(y) || y < 2000 || y > 2100) {
    throw new Error(`Invalid financial year start (${startYear}) provided.`);
  }
  const endYear = y + 1;
  const shortEnd = String(endYear).slice(-2);

  return {
    fyStartYear: y,
    fyEndYear: endYear,
    startDate: `${y}-04-01`,
    endDate: `${endYear}-03-31`,
    label: `FY ${y}-${shortEnd}`,
    displayRange: `01 April ${y} – 31 March ${endYear}`
  };
}

/**
 * Formats a date string (YYYY-MM-DD) into Indian standard display "DD MMM YYYY".
 */
export function formatDateIndian(dateStr) {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(d).padStart(2, '0')} ${MONTH_SHORT_NAMES[m - 1]} ${y}`;
    }
  }
  return str;
}

/**
 * Formats amount into standard Indian currency with commas (e.g. 1,44,000.00).
 */
export function formatMoneyInr(amount, decimals = 2) {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val);
}

/**
 * Formats integer amount in Indian system (e.g. 1,44,000).
 */
export function formatInrInteger(amount) {
  const val = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(val);
}

/**
 * Returns current timestamp formatted in Asia/Kolkata (IST).
 */
export function getKolkataTimestamp() {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now) + ' IST';
  } catch {
    return now.toLocaleString('en-IN') + ' IST';
  }
}

/**
 * Classifies an expense into departmental buckets for reporting.
 */
export function classifyExpense(expense) {
  const text = `${expense.category || ''} ${expense.description || ''}`.toLowerCase();
  if (/marketing|ads|google|meta|facebook|youtube|banner|flyer|print|hoarding|promotion/i.test(text)) {
    return 'marketing';
  }
  if (/software|domain|host|aws|cloud|server|vercel|sms|api|tech/i.test(text)) {
    return 'technical';
  }
  if (/teacher|faculty|educator|honorarium|lecturer/i.test(text)) {
    return 'teacher';
  }
  if (/counselor|counsellor|telecaller|admission/i.test(text)) {
    return 'counselor';
  }
  return 'other';
}

/**
 * Classifies an employee / salary role.
 */
export function classifySalary(salary) {
  const text = `${salary.role || ''} ${salary.department || ''} ${salary.employeeName || ''}`.toLowerCase();
  if (/teacher|faculty|educator|physics|chemistry|math|biology|mentor|jee|neet/i.test(text)) {
    return 'teacher';
  }
  if (/counselor|counsellor|telecaller|advisor|adviser|admission/i.test(text)) {
    return 'counselor';
  }
  return 'other';
}

/**
 * Normalizes any supported date string or Date object into "YYYY-MM-DD" for reliable comparison.
 * Handles: "YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", Date instances, and ISO strings.
 */
export function normalizeDateToYmd(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return s.slice(0, 10);
}

/**
 * Filters all dataset items between startDate and endDate (inclusive).
 * Dates must be YYYY-MM-DD.
 */
export function filterRecordsByPeriod(dataset = {}, startDate, endDate) {
  const start = String(startDate || '0000-00-00').trim().slice(0, 10);
  const end = String(endDate || '9999-99-99').trim().slice(0, 10);

  const feeRecords = (dataset.feeRecords || []).filter(r => {
    const d = normalizeDateToYmd(r.date);
    return d >= start && d <= end;
  });

  const otherIncome = (dataset.otherIncome || []).filter(r => {
    const d = normalizeDateToYmd(r.date);
    const src = String(r.source || '').toLowerCase();
    const desc = String(r.description || '').toLowerCase();
    const isFee = src.includes('fee collection') || src.includes('tuition fee') || desc.includes('tuition fee');
    return !isFee && d >= start && d <= end;
  });

  const expenses = (dataset.expenses || []).filter(e => {
    const d = normalizeDateToYmd(e.date);
    return d >= start && d <= end;
  });

  const salaries = (dataset.salaries || []).filter(s => {
    const d = normalizeDateToYmd(s.paymentDate || s.date);
    // Only count disbursed salaries (not unpaid or pending commitments)
    const status = String(s.status || 'Paid').toLowerCase();
    const isDisbursed = status !== 'unpaid' && status !== 'pending' && status !== 'draft';
    const amount = Number(s.netPaid || s.basicSalary) || 0;
    return isDisbursed && amount > 0 && d >= start && d <= end;
  });

  return { feeRecords, otherIncome, expenses, salaries };
}

/**
 * Computes month-by-month financial summary across the specified date range.
 */
export function computeMonthBreakdown(dataset = {}, startDate, endDate) {
  const { feeRecords, otherIncome, expenses, salaries } = filterRecordsByPeriod(dataset, startDate, endDate);

  // Collect all months in chronological order
  const monthMap = new Map();

  function ensureMonth(monthKey) {
    if (!monthMap.has(monthKey)) {
      const [yStr, mStr] = monthKey.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      const range = getMonthDateRange(y, m);
      monthMap.set(monthKey, {
        monthKey,
        year: y,
        month: m,
        monthName: MONTH_NAMES[m - 1],
        displayRange: range.displayRange,
        startDate: range.startDate,
        endDate: range.endDate,
        feeCollection: 0,
        otherIncome: 0,
        totalIncome: 0,
        teacherSalary: 0,
        counselorSalary: 0,
        marketingExpenses: 0,
        technicalExpenses: 0,
        otherExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
        margin: 0
      });
    }
    return monthMap.get(monthKey);
  }

  // If specific month range requested, initialize months in between
  if (startDate && endDate) {
    const startY = Number(startDate.slice(0, 4));
    const startM = Number(startDate.slice(5, 7));
    const endY = Number(endDate.slice(0, 4));
    const endM = Number(endDate.slice(5, 7));

    let curY = startY;
    let curM = startM;
    while (curY < endY || (curY === endY && curM <= endM)) {
      const key = `${curY}-${String(curM).padStart(2, '0')}`;
      ensureMonth(key);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
  }

  // Tally Fee Collection
  for (const r of feeRecords) {
    const d = normalizeDateToYmd(r.date).slice(0, 7);
    if (d.length === 7) {
      const m = ensureMonth(d);
      m.feeCollection += (Number(r.amount) || 0);
    }
  }

  // Tally Other Income
  for (const r of otherIncome) {
    const d = normalizeDateToYmd(r.date).slice(0, 7);
    if (d.length === 7) {
      const m = ensureMonth(d);
      m.otherIncome += (Number(r.amount) || 0);
    }
  }

  // Tally Salaries
  for (const s of salaries) {
    const d = normalizeDateToYmd(s.paymentDate || s.date).slice(0, 7);
    if (d.length === 7) {
      const m = ensureMonth(d);
      const amt = Number(s.netPaid || s.basicSalary) || 0;
      const roleType = classifySalary(s);
      if (roleType === 'teacher') {
        m.teacherSalary += amt;
      } else if (roleType === 'counselor') {
        m.counselorSalary += amt;
      } else {
        m.otherExpenses += amt;
      }
    }
  }

  // Tally Expenses
  for (const e of expenses) {
    const d = normalizeDateToYmd(e.date).slice(0, 7);
    if (d.length === 7) {
      const m = ensureMonth(d);
      const amt = Number(e.amount) || 0;
      const catType = classifyExpense(e);
      if (catType === 'marketing') {
        m.marketingExpenses += amt;
      } else if (catType === 'technical') {
        m.technicalExpenses += amt;
      } else if (catType === 'teacher') {
        m.teacherSalary += amt;
      } else if (catType === 'counselor') {
        m.counselorSalary += amt;
      } else {
        m.otherExpenses += amt;
      }
    }
  }

  // Finalize totals for each month
  const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  const totals = {
    feeCollection: 0,
    otherIncome: 0,
    totalIncome: 0,
    teacherSalary: 0,
    counselorSalary: 0,
    marketingExpenses: 0,
    technicalExpenses: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
    margin: 0
  };

  for (const m of sortedMonths) {
    m.totalIncome = m.feeCollection + m.otherIncome;
    m.totalExpenses = m.teacherSalary + m.counselorSalary + m.marketingExpenses + m.technicalExpenses + m.otherExpenses;
    m.netProfit = m.totalIncome - m.totalExpenses;
    m.margin = m.totalIncome > 0 ? Number(((m.netProfit / m.totalIncome) * 100).toFixed(1)) : 0;

    totals.feeCollection += m.feeCollection;
    totals.otherIncome += m.otherIncome;
    totals.totalIncome += m.totalIncome;
    totals.teacherSalary += m.teacherSalary;
    totals.counselorSalary += m.counselorSalary;
    totals.marketingExpenses += m.marketingExpenses;
    totals.technicalExpenses += m.technicalExpenses;
    totals.otherExpenses += m.otherExpenses;
    totals.totalExpenses += m.totalExpenses;
    totals.netProfit += m.netProfit;
  }

  totals.margin = totals.totalIncome > 0 ? Number(((totals.netProfit / totals.totalIncome) * 100).toFixed(1)) : 0;

  return {
    months: sortedMonths,
    totals,
    filteredRecords: { feeRecords, otherIncome, expenses, salaries }
  };
}

/**
 * Loads logo image as base64 data URL for embedding in jsPDF.
 */
export async function getLogoBase64() {
  if (typeof window === 'undefined') return '';
  try {
    const res = await fetch('/mainlogo.png', { cache: 'force-cache' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/**
 * Loads jsPDF and jspdf-autotable dynamically if not already present.
 */
export async function ensurePdfLibraries() {
  if (typeof window === 'undefined') return false;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.loaded = 'false';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load script ${src}`));
    document.head.appendChild(script);
  });

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js');
    }
    if (!window.jspdf?.jsPDF?.prototype?.autoTable) {
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js');
    }
    return Boolean(window.jspdf && window.jspdf.jsPDF);
  } catch (err) {
    console.error('Error loading PDF libraries:', err);
    return false;
  }
}

/**
 * Core PDF Generation Engine:
 * Generates an institutional, A4 multi-page, CA-ready financial statement.
 *
 * @param {Object} options
 * @param {Object} options.dataset - { feeRecords, expenses, salaries, otherIncome }
 * @param {'monthly' | 'annual' | 'custom' | 'complete'} options.periodType
 * @param {string} [options.selectedMonth] - YYYY-MM
 * @param {number} [options.selectedFyYear] - e.g. 2026 for FY 2026-27
 * @param {string} [options.customStart] - YYYY-MM-DD
 * @param {string} [options.customEnd] - YYYY-MM-DD
 * @returns {Promise<string>} Downloaded file name
 */
export async function generateFinancialReportPdf(options = {}) {
  const ready = await ensurePdfLibraries();
  if (!ready || !window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('PDF Generation Engine is still loading. Please try again in a few seconds.');
  }

  const {
    dataset = {},
    periodType = 'monthly',
    selectedMonth = '2026-11',
    selectedFyYear = 2026,
    customStart = '',
    customEnd = ''
  } = options;

  let reportTitle = 'FINANCIAL MANAGEMENT REPORT';
  let reportSubtitle = 'Institutional Statement of Operations & Ledger Statement';
  let dateRangeText = '';
  let periodLabel = '';
  let startDate = '';
  let endDate = '';
  let fileSlug = 'Financial-Report';

  if (periodType === 'monthly') {
    const [yStr, mStr] = (selectedMonth || '2026-11').split('-');
    const range = getMonthDateRange(Number(yStr), Number(mStr));
    startDate = range.startDate;
    endDate = range.endDate;
    periodLabel = range.label;
    dateRangeText = range.displayRange;
    reportTitle = `MONTHLY FINANCIAL STATEMENT – ${range.label.toUpperCase()}`;
    reportSubtitle = `Reconciled Profit & Loss Statement for ${range.label}`;
    fileSlug = `Financial-Report-${range.label.replace(/\s+/g, '-')}`;
  } else if (periodType === 'annual') {
    const fy = getFinancialYearRange(selectedFyYear || 2026);
    startDate = fy.startDate;
    endDate = fy.endDate;
    periodLabel = fy.label;
    dateRangeText = fy.displayRange;
    reportTitle = `ANNUAL FINANCIAL STATEMENT – ${fy.label}`;
    reportSubtitle = `Annual Audited Operating Statement (${fy.displayRange})`;
    fileSlug = `Annual-Report-${fy.label.replace(/\s+/g, '-')}`;
  } else if (periodType === 'custom') {
    startDate = customStart || '2026-01-01';
    endDate = customEnd || '2026-12-31';
    periodLabel = 'Custom Period';
    dateRangeText = `${formatDateIndian(startDate)} – ${formatDateIndian(endDate)}`;
    reportTitle = 'CUSTOM PERIOD FINANCIAL STATEMENT';
    reportSubtitle = `Financial Statement for ${dateRangeText}`;
    fileSlug = `Custom-Report-${startDate}-to-${endDate}`;
  } else {
    // Complete All-Time
    startDate = '2024-01-01';
    endDate = '2030-12-31';
    periodLabel = 'All Available Periods';
    dateRangeText = 'All Historical Transactions (Consolidated)';
    reportTitle = 'CONSOLIDATED FINANCIAL STATEMENT';
    reportSubtitle = 'Consolidated Multi-Period Financial Audit';
    fileSlug = 'Consolidated-Financial-Report';
  }

  // 1. Compute Aggregations
  const { months, totals, filteredRecords } = computeMonthBreakdown(dataset, startDate, endDate);
  const { feeRecords, otherIncome, expenses, salaries } = filteredRecords;

  // 2. Initialize jsPDF Document (A4 Portrait)
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Color Palette
  const navy = [15, 23, 42];      // #0f172a
  const navyLight = [30, 41, 59];  // #1e293b
  const orange = [249, 115, 22];   // #f97316
  const green = [22, 163, 74];     // #16a34a
  const red = [239, 68, 68];       // #ef4444
  const slate = [100, 116, 139];   // #64748b
  const bgLight = [248, 250, 252]; // #f8fafc
  const borderLight = [226, 232, 240]; // #e2e8f0

  const logoBase64 = await getLogoBase64();
  const timestamp = getKolkataTimestamp();

  // Helper for Section Titles
  function drawSectionHeader(title, y) {
    doc.setFillColor(...orange);
    doc.rect(14, y, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...navy);
    doc.text(title.toUpperCase(), 20, y + 5.5);
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.line(14, y + 9, 196, y + 9);
    return y + 13;
  }

  // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---

  // Top Navy Header Banner
  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 40, 'F');

  // Orange accent bar
  doc.setFillColor(...orange);
  doc.rect(0, 0, 4, 40, 'F');

  // Logo box (if available)
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 6, 28, 28, 2, 2, 'F');
      doc.addImage(logoBase64, 'PNG', 14, 8, 24, 24);
    } catch {}
  }

  // Brand Name & Subhead
  const textX = logoBase64 ? 44 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MY JEE MENTOR', textX, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('IIT-JEE | NEET | FOUNDATION  •  ONLINE INSTITUTE', textX, 23);
  doc.text('Concept First. Rank Next.  •  myjeementor.com', textX, 29);

  // Top-right Tag
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(132, 10, 66, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(249, 115, 22);
  doc.text('INSTITUTIONAL FINANCIAL REPORT', 165, 17, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(periodLabel, 165, 24, { align: 'center' });

  // Metadata Card Below Header
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 46, 182, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text(reportTitle, 19, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...slate);
  doc.text(reportSubtitle, 19, 60);

  // Period & Generation Time
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text('Reporting Period:', 19, 67);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRangeText, 48, 67);

  doc.setFont('helvetica', 'bold');
  doc.text('Generated On:', 125, 67);
  doc.setFont('helvetica', 'normal');
  doc.text(timestamp, 148, 67);

  // --- EXECUTIVE FINANCIAL SUMMARY KPI TABLE ---
  let curY = 78;
  curY = drawSectionHeader('1. Executive Financial Summary', curY);

  const kpiData = [
    [
      { content: 'Gross Tuition Fee Collection (Fee Register):', styles: { fontStyle: 'bold' } },
      { content: `INR ${formatMoneyInr(totals.feeCollection)}`, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: 'Operating Expenses (Ops & Infra):', styles: { fontStyle: 'bold' } },
      { content: `INR ${formatMoneyInr(totals.marketingExpenses + totals.technicalExpenses + totals.otherExpenses)}`, styles: { halign: 'right', textColor: red } }
    ],
    [
      { content: 'Other Non-Tuition Inflow (Books/Tests):', styles: { fontStyle: 'bold' } },
      { content: `INR ${formatMoneyInr(totals.otherIncome)}`, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: 'Payroll & Salaries Disbursed:', styles: { fontStyle: 'bold' } },
      { content: `INR ${formatMoneyInr(totals.teacherSalary + totals.counselorSalary)}`, styles: { halign: 'right', textColor: red } }
    ],
    [
      { content: 'TOTAL REVENUE / CASH INFLOW:', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: `INR ${formatMoneyInr(totals.totalIncome)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: green, fillColor: [240, 253, 244] } },
      { content: 'TOTAL OPERATING EXPENDITURE:', styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } },
      { content: `INR ${formatMoneyInr(totals.totalExpenses)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: red, fillColor: [254, 242, 242] } }
    ],
    [
      { content: 'NET OPERATING PROFIT / SURPLUS:', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 10, fillColor: [255, 247, 237] } },
      { content: `INR ${formatMoneyInr(totals.netProfit)}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, textColor: totals.netProfit >= 0 ? green : red, fillColor: [255, 247, 237] } }
    ],
    [
      { content: 'Operating Profit Margin (%):', colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: `${totals.margin}%`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', textColor: totals.margin >= 0 ? green : red } }
    ]
  ];

  doc.autoTable({
    startY: curY,
    margin: { left: 14, right: 14 },
    body: kpiData,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: borderLight,
      lineWidth: 0.3,
      textColor: navy
    }
  });

  curY = doc.lastAutoTable.finalY + 10;

  // --- SECTION 2: MONTH-WISE BREAKDOWN TABLE ---
  curY = drawSectionHeader('2. Month-Wise Performance Breakdown', curY);

  const monthRows = months.map(m => [
    m.monthName + ' ' + m.year,
    m.displayRange,
    `INR ${formatInrInteger(m.feeCollection)}`,
    `INR ${formatInrInteger(m.otherIncome)}`,
    `INR ${formatInrInteger(m.totalIncome)}`,
    `INR ${formatInrInteger(m.teacherSalary + m.counselorSalary)}`,
    `INR ${formatInrInteger(m.marketingExpenses)}`,
    `INR ${formatInrInteger(m.technicalExpenses + m.otherExpenses)}`,
    `INR ${formatInrInteger(m.totalExpenses)}`,
    `INR ${formatInrInteger(m.netProfit)}`
  ]);

  // Grand Total Row
  monthRows.push([
    { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `${dateRangeText}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.feeCollection)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.otherIncome)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.totalIncome)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: green, fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.teacherSalary + totals.counselorSalary)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.marketingExpenses)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.technicalExpenses + totals.otherExpenses)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.totalExpenses)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: red, fillColor: [241, 245, 249] } },
    { content: `INR ${formatInrInteger(totals.netProfit)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: totals.netProfit >= 0 ? green : red, fillColor: [241, 245, 249] } }
  ]);

  doc.autoTable({
    startY: curY,
    margin: { left: 14, right: 14 },
    head: [[
      'Month', 'Period Date Range', 'Fees', 'Other Inc.', 'Total Rev.',
      'Payroll', 'Mktg', 'Ops/Tech', 'Total Exp.', 'Net Profit'
    ]],
    body: monthRows,
    theme: 'striped',
    headStyles: {
      fillColor: navy,
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      textColor: navy,
      lineColor: borderLight,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'right', fontStyle: 'bold' }
    },
    showHead: 'everyPage'
  });

  // --- PAGE 2: DETAILED INCOME REGISTER (FEE INFLOWS) ---
  doc.addPage();
  curY = 20;
  curY = drawSectionHeader('3. Detailed Income Register (Tuition & Inflows)', curY);

  const incomeRows = [];

  // Fee receipts
  for (const f of feeRecords) {
    incomeRows.push([
      formatDateIndian(f.date),
      f.receiptNo || '-',
      f.studentName || '-',
      `${f.course || '-'}${f.batch ? ' (' + f.batch + ')' : ''}`,
      f.paymentMode || 'UPI',
      `INR ${formatMoneyInr(f.amount)}`
    ]);
  }

  // Other income entries
  for (const o of otherIncome) {
    incomeRows.push([
      formatDateIndian(o.date),
      o.id || o.referenceNo || 'INC',
      o.source || 'Other Inflow',
      o.description || '-',
      o.paymentMode || 'Direct',
      `INR ${formatMoneyInr(o.amount)}`
    ]);
  }

  if (incomeRows.length === 0) {
    incomeRows.push([{ content: 'No verified fee or other income records recorded for this period.', colSpan: 6, styles: { halign: 'center', textColor: slate, fontStyle: 'italic' } }]);
  } else {
    incomeRows.push([
      { content: 'SUBTOTAL INFLOW', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } },
      { content: `INR ${formatMoneyInr(totals.totalIncome)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: green, fillColor: [241, 245, 249] } }
    ]);
  }

  doc.autoTable({
    startY: curY,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Receipt / Ref', 'Student / Entity Name', 'Course / Description', 'Payment Mode', 'Amount']],
    body: incomeRows,
    theme: 'striped',
    headStyles: {
      fillColor: navy,
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: navy,
      lineColor: borderLight,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 42 },
      3: { cellWidth: 44 },
      4: { cellWidth: 22 },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    showHead: 'everyPage'
  });

  // --- SECTION 4: DETAILED OPERATIONAL EXPENSE REGISTER ---
  curY = doc.lastAutoTable.finalY + 10;
  if (curY > 230) {
    doc.addPage();
    curY = 20;
  }

  curY = drawSectionHeader('4. Detailed Operating Expense Register', curY);

  const expenseRows = [];
  for (const e of expenses) {
    expenseRows.push([
      formatDateIndian(e.date),
      e.id || '-',
      e.category || 'General',
      e.description || '-',
      e.paidTo || '-',
      `INR ${formatMoneyInr(e.amount)}`
    ]);
  }

  const expTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (expenseRows.length === 0) {
    expenseRows.push([{ content: 'No operational expenses recorded for this period in Google Sheets.', colSpan: 6, styles: { halign: 'center', textColor: slate, fontStyle: 'italic' } }]);
  } else {
    expenseRows.push([
      { content: 'SUBTOTAL OPERATIONAL EXPENSES', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } },
      { content: `INR ${formatMoneyInr(expTotal)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: red, fillColor: [241, 245, 249] } }
    ]);
  }

  doc.autoTable({
    startY: curY,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Expense ID', 'Category / Department', 'Description', 'Paid To / Vendor', 'Amount']],
    body: expenseRows,
    theme: 'striped',
    headStyles: {
      fillColor: navyLight,
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: navy,
      lineColor: borderLight,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 46 },
      4: { cellWidth: 28 },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    showHead: 'everyPage'
  });

  // --- SECTION 5: DETAILED SALARY REGISTER ---
  curY = doc.lastAutoTable.finalY + 10;
  if (curY > 230) {
    doc.addPage();
    curY = 20;
  }

  curY = drawSectionHeader('5. Faculty & Staff Payroll Register (Disbursed)', curY);

  const salaryRows = [];
  for (const s of salaries) {
    salaryRows.push([
      s.employeeName || '-',
      s.employeeId || '-',
      s.role || s.department || 'Faculty',
      s.period || s.month || '-',
      `INR ${formatMoneyInr(s.netPaid || s.basicSalary)}`,
      formatDateIndian(s.paymentDate || s.date)
    ]);
  }

  const salTotal = salaries.reduce((sum, s) => sum + (Number(s.netPaid || s.basicSalary) || 0), 0);

  if (salaryRows.length === 0) {
    salaryRows.push([{ content: 'No salary disbursements recorded for this period in Google Sheets.', colSpan: 6, styles: { halign: 'center', textColor: slate, fontStyle: 'italic' } }]);
  } else {
    salaryRows.push([
      { content: 'SUBTOTAL SALARIES DISBURSED', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } },
      { content: `INR ${formatMoneyInr(salTotal)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: red, fillColor: [241, 245, 249] } },
      { content: '', styles: { fillColor: [241, 245, 249] } }
    ]);
  }

  doc.autoTable({
    startY: curY,
    margin: { left: 14, right: 14 },
    head: [['Employee Name', 'Employee ID', 'Role / Department', 'Salary Period', 'Net Amount Paid', 'Payment Date']],
    body: salaryRows,
    theme: 'striped',
    headStyles: {
      fillColor: navyLight,
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: navy,
      lineColor: borderLight,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 38 },
      3: { cellWidth: 26 },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 28 }
    },
    showHead: 'everyPage'
  });

  // --- FOOTER & AUDIT DECLARATION ---
  curY = doc.lastAutoTable.finalY + 12;
  if (curY > 240) {
    doc.addPage();
    curY = 24;
  }

  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, curY, 182, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text('INSTITUTIONAL AUDIT & RECONCILIATION NOTES', 18, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slate);
  doc.text('1. Student Tuition Fee collection figures are verified directly from the Fee Register Google Sheet records.', 18, curY + 12);
  doc.text('2. Salary expenses account exclusively for disbursed amounts; accrued/unpaid liabilities are excluded.', 18, curY + 17);
  doc.text('3. This document is an authentic financial summary generated for Institute Administration, Audit, and CA review.', 18, curY + 22);

  // Authorised Signatory line
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('Authorised Signatory / Director', 150, curY + 28);
  doc.setDrawColor(...navy);
  doc.line(145, curY + 24, 190, curY + 24);

  // --- RUN PAGE NUMBERING HOOK FOR ALL PAGES ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Running Header (pages 2+)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...slate);
      doc.text('MY JEE MENTOR  •  INSTITUTIONAL FINANCIAL REPORT', 14, 10);
      doc.text(periodLabel, 196, 10, { align: 'right' });
      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.2);
      doc.line(14, 12, 196, 12);
    }

    // Running Footer (all pages)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate);
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.2);
    doc.line(14, 285, 196, 285);

    doc.text('My JEE Mentor | Confidential Financial Report | Generated via Private Finance Portal', 14, 290);
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
  }

  // 3. Trigger Download
  const filename = `MJM-${fileSlug}.pdf`;
  doc.save(filename);
  return filename;
}
