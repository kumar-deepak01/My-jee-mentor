/**
 * My JEE Mentor - Fee Due Calculation Engine
 * 
 * Bulletproof, timezone-safe (Asia/Kolkata IST) ledger calculation:
 * - Admission date parsing (DD/MM/YYYY, DD/MM/YY, ISO, serial numbers)
 * - Month-end clamping (e.g., 31st clamping to 30th/28th/29th)
 * - FIFO cycle allocation
 * - Real-time status evaluation (DUE TODAY, OVERDUE, UPCOMING, PAID)
 */

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,  // may is 4
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

/**
 * Returns current YYYY-MM-DD in Asia/Kolkata (IST).
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
  } catch {}
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an admission date or transaction date safely into a normalized local Date (00:00:00).
 * Supports:
 * - DD/MM/YYYY or DD-MM-YYYY (e.g. '18/05/2026', '05/06/2026')
 * - DD/MM/YY or DD-MM-YY (e.g. '13/08/26' -> 13 Aug 2026)
 * - ISO YYYY-MM-DD (e.g. '2026-11-21')
 * - Named month ('21 Nov 2026', '18 May 2026')
 * - Google Sheets serial date number (e.g. 46347)
 * - Date instance
 */
export function parseAdmissionDate(val) {
  if (val == null) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
  }
  if (typeof val === 'number') {
    if (val > 30000 && val < 70000) {
      const ms = Math.round((val - 25569) * 86400 * 1000);
      const d = new Date(ms);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
    return null;
  }
  const str = String(val).trim();
  if (!str) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]), m = Number(isoMatch[2]) - 1, d = Number(isoMatch[3]);
    const dt = new Date(y, m, d, 0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // 2. Named month: '18 May 2026', '21 Nov 2026', '01-Nov-2026', '13-Aug-26'
  const namedMatch = str.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]{3,9})[\s\-\/]+(\d{2,4})/);
  if (namedMatch) {
    const d = Number(namedMatch[1]);
    const mStr = namedMatch[2].toLowerCase();
    let y = Number(namedMatch[3]);
    if (y < 100) y = y <= 50 ? 2000 + y : 1900 + y;
    if (mStr in MONTH_MAP) {
      const dt = new Date(y, MONTH_MAP[mStr], d, 0, 0, 0, 0);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  // 3. Indian DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY or DD-MM-YY
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (dmyMatch) {
    let d = Number(dmyMatch[1]);
    let m = Number(dmyMatch[2]) - 1;
    let y = Number(dmyMatch[3]);
    if (y < 100) y = y <= 50 ? 2000 + y : 1900 + y;
    // Disambiguate if month/day reversed
    if (d > 12 && m < 12) {
      // Correct: d is day, m is month
    } else if (d <= 12 && m >= 12) {
      const temp = d;
      d = m + 1;
      m = temp - 1;
    }
    const dt = new Date(y, m, d, 0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // 4. Fallback Date.parse
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Returns total days in a given month.
 * Month is 0-indexed (0 = Jan, 1 = Feb, etc.)
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns ordinal suffix for a day number (e.g. 1st, 2nd, 3rd, 18th).
 */
export function getOrdinalSuffix(day) {
  const j = day % 10, k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

/**
 * Formats a Date object as DD Mon YYYY (e.g., '18 May 2026').
 */
export function formatDateDisplay(date) {
  if (!date) return '';
  const d = date.getDate();
  const m = MONTH_NAMES_SHORT[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

/**
 * Formats a Date object as Month YYYY (e.g., 'May 2026').
 */
export function formatMonthYear(date) {
  if (!date) return '';
  return `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Computes a clamped cycle date for a student given admission day and cycle offset.
 * Example: admitted 31st of July -> target day is 31.
 * For cycle in Sep (30 days) -> clamps to 30 Sep.
 * For cycle in Feb (28/29 days) -> clamps to 28/29 Feb.
 */
export function computeCycleDate(admissionDate, cycleIndex) {
  const origDay = admissionDate.getDate();
  const startYear = admissionDate.getFullYear();
  const startMonth = admissionDate.getMonth();

  const totalMonths = startMonth + cycleIndex;
  const targetYear = startYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const maxDays = getDaysInMonth(targetYear, targetMonth);
  const clampedDay = Math.min(origDay, maxDays);

  return new Date(targetYear, targetMonth, clampedDay, 0, 0, 0, 0);
}

/**
 * Checks if student status is considered active (case-insensitive, trimmed).
 */
export function isStudentActive(status) {
  if (!status) return true; // Default to active if omitted
  const clean = String(status).trim().toLowerCase();
  return clean === 'active' || clean === 'yes' || clean === 'true' || clean === 'enrolled';
}

/**
 * Normalizes phone numbers to digits only or last 10 digits for matching.
 */
export function cleanPhoneDigits(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/**
 * Checks whether a fee record matches a student.
 * Matches by:
 * 1. Student ID mentioned in remarks or receipt or name
 * 2. Exact student name (case-insensitive trim)
 * 3. Mobile phone number match (student mobile or parent mobile)
 */
export function isPaymentForStudent(record, student) {
  if (!record || !student) return false;

  const studentId = String(student.studentId || '').trim().toLowerCase();
  const remarks = String(record.remarks || '').trim().toLowerCase();
  const receiptNo = String(record.receiptNo || '').trim().toLowerCase();
  const recordStudent = String(record.studentName || '').trim().toLowerCase();
  const studentName = String(student.studentName || '').trim().toLowerCase();

  // 1. Direct ID match
  if (studentId) {
    if (remarks.includes(studentId) || receiptNo.includes(studentId) || recordStudent.includes(studentId)) {
      return true;
    }
  }

  // 2. Exact student name match
  if (studentName && recordStudent && studentName === recordStudent) {
    return true;
  }

  // 3. Phone number match
  const recordPhone = cleanPhoneDigits(record.phone);
  if (recordPhone && recordPhone.length >= 10) {
    const sPhone = cleanPhoneDigits(student.studentMobile);
    const pPhone = cleanPhoneDigits(student.parentMobile);
    if ((sPhone && recordPhone === sPhone) || (pPhone && recordPhone === pPhone)) {
      return true;
    }
  }

  return false;
}

/**
 * Core FIFO Ledger Calculator for a single student.
 * 
 * @param {Object} student - Student record from 'Students' tab
 * @param {Array} feeRecords - Array of fee payment records from 'Fee entry' tab
 * @param {Date|string} referenceDate - Evaluation date (defaults to today in IST)
 * @returns {Object} Comprehensive ledger summary
 */
export function calculateStudentLedger(student, feeRecords = [], referenceDate = new Date()) {
  const refDate = parseAdmissionDate(referenceDate) || new Date();
  const refYmd = getKolkataYmd(refDate);
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);

  const admissionDate = parseAdmissionDate(student.admissionDate);
  const monthlyFee = Number(student.monthlyFee) || 0;
  const studentId = String(student.studentId || '').trim();
  const studentName = String(student.studentName || '').trim();
  const parentName = String(student.parentName || '').trim();
  const statusStr = String(student.status || 'Active').trim();
  const active = isStudentActive(statusStr);

  if (!admissionDate) {
    return {
      studentId,
      studentName,
      parentName,
      admissionDate: null,
      admissionDateDisplay: student.admissionDate || 'N/A',
      monthlyFee,
      dueDay: 1,
      dueDayOrdinal: '1st',
      totalDue: 0,
      totalPaid: 0,
      outstanding: 0,
      advanceCredit: 0,
      status: 'PAID',
      statusLabel: 'No Admission Date',
      cycles: [],
      nextDueDate: null,
      nextDueDateDisplay: 'N/A',
      oldestUnpaidDate: null,
      oldestUnpaidDateDisplay: 'None',
      daysOverdue: 0,
      daysLeft: 0,
      monthsPending: 0,
      active
    };
  }

  const dueDay = admissionDate.getDate();
  const dueDayOrdinal = getOrdinalSuffix(dueDay);

  // 1. Find all payments for this student
  const matchingPayments = feeRecords.filter(r => isPaymentForStudent(r, student));
  const totalPaid = matchingPayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // 2. Generate all due cycles up to refMidnight
  // Cycle 0 starts on admissionDate.
  // Cycles exist only if cycleDate <= refMidnight.
  const cycles = [];
  let cycleIdx = 0;
  let nextCycleDate = null;

  while (true) {
    const cycleDate = computeCycleDate(admissionDate, cycleIdx);
    if (cycleDate <= refMidnight) {
      cycles.push({
        cycleIndex: cycleIdx,
        cycleDate,
        cycleDateDisplay: formatDateDisplay(cycleDate),
        monthYear: formatMonthYear(cycleDate),
        fee: monthlyFee,
        paid: 0,
        balance: monthlyFee,
        status: 'UNPAID'
      });
      cycleIdx++;
    } else {
      nextCycleDate = cycleDate;
      break;
    }
  }

  const totalDue = cycles.length * monthlyFee;

  // 3. FIFO Payment Allocation
  let remainingPayment = totalPaid;
  for (const cycle of cycles) {
    if (remainingPayment >= cycle.fee) {
      cycle.paid = cycle.fee;
      cycle.balance = 0;
      cycle.status = 'PAID';
      remainingPayment -= cycle.fee;
    } else if (remainingPayment > 0) {
      cycle.paid = remainingPayment;
      cycle.balance = cycle.fee - remainingPayment;
      cycle.status = 'PARTIAL';
      remainingPayment = 0;
    } else {
      cycle.paid = 0;
      cycle.balance = cycle.fee;
      cycle.status = 'UNPAID';
    }
  }

  const outstanding = Math.max(0, totalDue - totalPaid);
  const advanceCredit = Math.max(0, totalPaid - totalDue);

  // 4. Find oldest unpaid cycle
  const oldestUnpaid = cycles.find(c => c.balance > 0) || null;
  const oldestUnpaidDate = oldestUnpaid ? oldestUnpaid.cycleDate : null;

  // 5. Determine Status
  let status = 'PAID';
  let daysOverdue = 0;
  let daysLeft = 0;
  const unpaidCycles = cycles.filter(c => c.balance > 0);
  const monthsPending = unpaidCycles.length;

  if (outstanding > 0 && oldestUnpaidDate) {
    const diffMs = refMidnight.getTime() - oldestUnpaidDate.getTime();
    const diffDays = Math.round(diffMs / (86400 * 1000));

    if (diffDays === 0) {
      status = 'DUE TODAY';
      daysOverdue = 0;
    } else if (diffDays > 0) {
      status = 'OVERDUE';
      daysOverdue = diffDays;
    } else {
      // Future cycle (shouldn't happen as cycles <= refMidnight)
      status = 'UPCOMING';
    }
  } else {
    // Zero outstanding -> Paid or Upcoming
    if (nextCycleDate) {
      const diffMs = nextCycleDate.getTime() - refMidnight.getTime();
      const diffDays = Math.ceil(diffMs / (86400 * 1000));
      daysLeft = diffDays;

      if (diffDays <= 7 && diffDays >= 0) {
        status = 'UPCOMING';
      } else {
        status = 'PAID';
      }
    } else {
      status = 'PAID';
    }
  }

  return {
    studentId,
    studentName,
    parentName,
    studentMobile: student.studentMobile || '',
    parentMobile: student.parentMobile || '',
    batch: student.batch || '',
    studentClass: student.studentClass || student.class || '',
    subject: student.subject || '',
    monthlyFee,
    admissionDate,
    admissionDateDisplay: formatDateDisplay(admissionDate),
    dueDay,
    dueDayOrdinal,
    totalDue,
    totalPaid,
    outstanding,
    advanceCredit,
    status,
    cycles,
    oldestUnpaidDate,
    oldestUnpaidDateDisplay: oldestUnpaidDate ? formatDateDisplay(oldestUnpaidDate) : 'None',
    oldestUnpaidMonth: oldestUnpaid ? oldestUnpaid.monthYear : '',
    nextDueDate: nextCycleDate,
    nextDueDateDisplay: nextCycleDate ? formatDateDisplay(nextCycleDate) : 'None',
    daysOverdue,
    daysLeft,
    monthsPending,
    active,
    notes: student.notes || ''
  };
}

/**
 * Calculates aggregates and KPI metrics across all students.
 */
export function calculateDueMetrics(studentLedgers = [], feeRecords = [], referenceDate = new Date()) {
  const refYmd = getKolkataYmd(referenceDate);

  // Filter out inactive students by default for the primary KPIs
  const activeStudents = studentLedgers.filter(s => s.active);

  let dueTodayCount = 0;
  let dueTodayAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let upcomingCount = 0;
  let upcomingAmount = 0;

  for (const s of activeStudents) {
    if (s.status === 'DUE TODAY') {
      dueTodayCount++;
      dueTodayAmount += s.outstanding;
    } else if (s.status === 'OVERDUE') {
      overdueCount++;
      overdueAmount += s.outstanding;
    } else if (s.status === 'UPCOMING') {
      upcomingCount++;
      upcomingAmount += s.monthlyFee;
    }
  }

  // Calculate collected today from feeRecords
  const collectedTodayAmount = feeRecords.reduce((sum, r) => {
    const d = parseAdmissionDate(r.date);
    if (d && getKolkataYmd(d) === refYmd) {
      return sum + (Number(r.amount) || 0);
    }
    return sum;
  }, 0);

  const attentionRequiredCount = dueTodayCount + overdueCount;

  return {
    dueTodayCount,
    dueTodayAmount,
    overdueCount,
    overdueAmount,
    upcomingCount,
    upcomingAmount,
    collectedTodayAmount,
    attentionRequiredCount,
    totalActiveStudents: activeStudents.length,
    totalStudents: studentLedgers.length
  };
}
