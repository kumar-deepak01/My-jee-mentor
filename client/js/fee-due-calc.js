/**
 * My JEE Mentor - Fee Due Calculation Engine
 * 
 * Bulletproof, timezone-safe (Asia/Kolkata IST) ledger calculation:
 * - Tracking start date enforcement (2026-10-01: prior cycles considered settled)
 * - Admission date parsing (DD/MM/YYYY, DD/MM/YY, ISO, serial numbers)
 * - Month-end clamping (e.g., 31st clamping to 30th/28th/29th)
 * - Robust read-only matching engine (ID in remarks, Phone + Name, sibling disambiguation)
 * - Data quality validation (missing dates/fees, duplicate IDs -> Needs Attention)
 * - FIFO cycle allocation
 * - Real-time status evaluation (DUE TODAY, OVERDUE, UPCOMING, PAID)
 */

export const TRACKING_START_DATE = '2026-10-01';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
 * Normalizes human names for comparison:
 * Lowercases, strips dots and special characters, collapses spaces.
 */
export function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Compares two names with robust tolerance for:
 * - Exact match after whitespace & dot stripping ("D.Adithya" == "D. Adithya")
 * - Substring containment ("Adithya" in "Dirasantham Adithya")
 * - Initial + surname ("D Adithya" vs "Dirasantham Adithya")
 * - Word token overlap
 */
export function nameMatches(nameA, nameB) {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Dot-less / space-less equality (e.g. "dadithya" === "dadithya")
  const compactA = normA.replace(/\s+/g, '');
  const compactB = normB.replace(/\s+/g, '');
  if (compactA === compactB) return true;

  // Substring containment if length >= 3
  if (compactA.length >= 3 && compactB.length >= 3) {
    if (compactA.includes(compactB) || compactB.includes(compactA)) return true;
  }

  // Token-level comparison
  const tokensA = normA.split(' ').filter(Boolean);
  const tokensB = normB.split(' ').filter(Boolean);

  // Check if significant tokens (>=3 chars) overlap
  const sigA = tokensA.filter(t => t.length >= 3);
  const sigB = tokensB.filter(t => t.length >= 3);
  const overlap = sigA.some(t => sigB.includes(t));
  if (overlap) return true;

  return false;
}

/**
 * Extracts a candidate student ID like 'MJM002' from text.
 */
export function extractStudentIdFromText(text) {
  if (!text) return null;
  const match = String(text).match(/\[\s*(MJM\s*\d+)\s*\]/i) || String(text).match(/\b(MJM\d+)\b/i);
  if (match) {
    return match[1].replace(/\s+/g, '').toUpperCase();
  }
  return null;
}

/**
 * Checks whether a fee record matches a student.
 * Priority:
 * 1. [MJMxxx] in remarks or receiptNo or studentName
 * 2. Phone match on Student or Parent mobile AND (Student Name or Parent Name matches)
 * 3. Exact name match if phone is omitted
 */
export function isPaymentForStudent(record, student) {
  if (!record || !student) return false;

  const studentId = String(student.studentId || '').trim().toUpperCase();
  const remarks = String(record.remarks || '');
  const receiptNo = String(record.receiptNo || '');
  const recordStudent = String(record.studentName || '');
  const recordParent = String(record.parentName || '');

  // 1. Direct ID match
  if (studentId) {
    const textId = extractStudentIdFromText(`${remarks} ${receiptNo} ${recordStudent}`);
    if (textId && textId === studentId) {
      return true;
    }
  }

  // 2. Phone match + Name match
  const recordPhone = cleanPhoneDigits(record.phone);
  if (recordPhone && recordPhone.length >= 10) {
    const sPhone = cleanPhoneDigits(student.studentMobile);
    const pPhone = cleanPhoneDigits(student.parentMobile);
    if ((sPhone && recordPhone === sPhone) || (pPhone && recordPhone === pPhone)) {
      if (nameMatches(recordStudent, student.studentName) ||
          nameMatches(recordStudent, student.parentName) ||
          (recordParent && (nameMatches(recordParent, student.parentName) || nameMatches(recordParent, student.studentName)))) {
        return true;
      }
    }
    // If phone matched but name didn't, do not match (could be sibling or unrelated)
    return false;
  }

  // 3. Exact student name match (only when record has no phone)
  if (recordStudent && student.studentName && nameMatches(recordStudent, student.studentName)) {
    return true;
  }

  return false;
}

/**
 * Matches fee receipts to student records across the entire dataset.
 * Adheres strictly to:
 * - Rule (a): [MJMxxx] in Remarks if ID exists in Students
 * - Rule (b): Phone match on Student or Parent mobile AND Name match
 * - Rule (c): Sibling phone sharing disambiguated by student name; if ambiguous -> AMBIGUOUS
 * - Rule (d): Phone-only match without name match -> UNMATCHED (reason: name mismatch)
 * 
 * @param {Array} students - All student objects
 * @param {Array} feeRecords - All fee receipt records
 * @returns {Object} { studentReceiptsMap: Map, audit: Object }
 */
export function matchReceiptsToStudents(students = [], feeRecords = []) {
  const studentMap = new Map();
  for (const s of students) {
    if (s.studentId) {
      studentMap.set(String(s.studentId).trim().toUpperCase(), s);
    }
  }

  const studentReceiptsMap = new Map();
  for (const s of students) {
    if (s.studentId) {
      studentReceiptsMap.set(String(s.studentId).trim().toUpperCase(), []);
    }
  }

  const audit = {
    matchedCount: 0,
    ambiguousCount: 0,
    unmatchedCount: 0,
    matchedReceipts: [],
    ambiguousReceipts: [],
    unmatchedReceipts: []
  };

  for (const receipt of feeRecords) {
    let matchedStudent = null;
    let matchMethod = '';

    // Rule (a): [MJMxxx] in remarks or receiptNo
    const remarks = String(receipt.remarks || '');
    const receiptNo = String(receipt.receiptNo || '');
    const textId = extractStudentIdFromText(`${remarks} ${receiptNo}`);
    if (textId && studentMap.has(textId)) {
      matchedStudent = studentMap.get(textId);
      matchMethod = `ID in remarks [${textId}]`;
    }

    // Rule (b) & (c): Phone match + Name match
    if (!matchedStudent) {
      const phone = cleanPhoneDigits(receipt.phone);
      if (phone && phone.length >= 10) {
        const phoneCandidates = students.filter(s => {
          const sPhone = cleanPhoneDigits(s.studentMobile);
          const pPhone = cleanPhoneDigits(s.parentMobile);
          return (sPhone && sPhone === phone) || (pPhone && pPhone === phone);
        });

        if (phoneCandidates.length === 1) {
          const cand = phoneCandidates[0];
          const rName = receipt.studentName || '';
          const rParent = receipt.parentName || '';
          const nameOk = nameMatches(rName, cand.studentName) ||
                         nameMatches(rName, cand.parentName) ||
                         (rParent && (nameMatches(rParent, cand.parentName) || nameMatches(rParent, cand.studentName)));

          if (nameOk) {
            matchedStudent = cand;
            matchMethod = `Phone + Name match (${cand.studentId})`;
          } else {
            audit.unmatchedCount++;
            audit.unmatchedReceipts.push({
              receipt,
              reason: `Phone (${phone}) matches student ${cand.studentName} (${cand.studentId}) but receipt name is "${rName}"`
            });
            continue;
          }
        } else if (phoneCandidates.length > 1) {
          // Multiple students share phone (e.g. siblings)
          const rName = receipt.studentName || '';
          const matchedByName = phoneCandidates.filter(c =>
            nameMatches(rName, c.studentName) || nameMatches(rName, c.parentName)
          );

          if (matchedByName.length === 1) {
            matchedStudent = matchedByName[0];
            matchMethod = `Sibling phone disambiguated by name (${matchedStudent.studentId})`;
          } else {
            audit.ambiguousCount++;
            audit.ambiguousReceipts.push({
              receipt,
              candidates: phoneCandidates.map(c => `${c.studentName} (${c.studentId})`),
              reason: `Multiple students share phone ${phone}; receipt name "${rName}" is ambiguous`
            });
            continue;
          }
        }
      }
    }

    // Fallback: Exact name match if phone was missing
    if (!matchedStudent && !cleanPhoneDigits(receipt.phone) && receipt.studentName) {
      const nameCandidates = students.filter(s => nameMatches(receipt.studentName, s.studentName));
      if (nameCandidates.length === 1) {
        matchedStudent = nameCandidates[0];
        matchMethod = `Name-only match (${matchedStudent.studentId})`;
      }
    }

    if (matchedStudent) {
      const sId = String(matchedStudent.studentId).trim().toUpperCase();
      if (!studentReceiptsMap.has(sId)) {
        studentReceiptsMap.set(sId, []);
      }
      studentReceiptsMap.get(sId).push({ ...receipt, _matchedStudentId: sId, _matchMethod: matchMethod });
      audit.matchedCount++;
      audit.matchedReceipts.push({
        receiptNo: receipt.receiptNo,
        studentId: sId,
        studentName: matchedStudent.studentName,
        method: matchMethod
      });
    } else {
      audit.unmatchedCount++;
      audit.unmatchedReceipts.push({
        receipt,
        reason: 'No matching student ID or phone found'
      });
    }
  }

  return { studentReceiptsMap, audit };
}

/**
 * Validates students dataset for data quality.
 * Partitions students into valid and needsAttention.
 */
export function validateStudentData(students = []) {
  const valid = [];
  const needsAttention = [];
  const seenIds = new Set();

  for (const s of students) {
    const studentId = String(s?.studentId || '').trim();
    const adm = parseAdmissionDate(s?.admissionDate);
    const fee = Number(s?.monthlyFee);

    let reason = '';
    if (!studentId) {
      reason = 'Missing Student ID';
    } else if (seenIds.has(studentId.toUpperCase())) {
      reason = `Duplicate Student ID (${studentId})`;
    } else if (!adm) {
      reason = `Invalid or missing admission date: "${s?.admissionDate ?? ''}"`;
    } else if (!Number.isFinite(fee) || fee <= 0) {
      reason = `Invalid or missing monthly fee: "${s?.monthlyFee ?? ''}"`;
    }

    if (reason) {
      needsAttention.push({ student: s, reason });
    } else {
      seenIds.add(studentId.toUpperCase());
      valid.push(s);
    }
  }

  return { valid, needsAttention };
}

/**
 * Core FIFO Ledger Calculator for a single student.
 * 
 * @param {Object} student - Student record from 'Students' tab
 * @param {Array} feeRecords - Array of fee payment records or pre-filtered student receipts
 * @param {Date|string} referenceDate - Evaluation date (defaults to today in IST)
 * @param {Object} options - Options including trackingStartDate override
 * @returns {Object} Comprehensive ledger summary
 */
export function calculateStudentLedger(student, feeRecords = [], referenceDate = new Date(), options = {}) {
  const refDate = parseAdmissionDate(referenceDate) || new Date();
  const refYmd = getKolkataYmd(refDate);
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);

  const admissionDate = parseAdmissionDate(student?.admissionDate);
  const monthlyFee = Number(student?.monthlyFee) || 0;
  const studentId = String(student?.studentId || '').trim();
  const studentName = String(student?.studentName || '').trim();
  const parentName = String(student?.parentName || '').trim();
  const statusStr = String(student?.status || 'Active').trim();
  const active = isStudentActive(statusStr);

  const trackingStartDateStr = options.trackingStartDate !== undefined ? options.trackingStartDate : TRACKING_START_DATE;
  const trackingStartDate = trackingStartDateStr ? parseAdmissionDate(trackingStartDateStr) : null;
  const trackingMidnight = trackingStartDate ? new Date(trackingStartDate.getFullYear(), trackingStartDate.getMonth(), trackingStartDate.getDate(), 0, 0, 0, 0) : null;

  if (!admissionDate || !Number.isFinite(monthlyFee) || monthlyFee <= 0 || !studentId) {
    const reasons = [];
    if (!studentId) reasons.push('Missing Student ID');
    if (!admissionDate) reasons.push('Invalid Admission Date');
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) reasons.push('Invalid Monthly Fee');

    return {
      studentId,
      studentName,
      parentName,
      admissionDate: null,
      admissionDateDisplay: student?.admissionDate || 'N/A',
      monthlyFee,
      dueDay: 1,
      dueDayOrdinal: '1st',
      totalDue: 0,
      totalPaid: 0,
      outstanding: 0,
      advanceCredit: 0,
      status: 'PAID',
      statusLabel: `Needs Attention: ${reasons.join(', ')}`,
      cycles: [],
      nextDueDate: null,
      nextDueDateDisplay: 'N/A',
      oldestUnpaidDate: null,
      oldestUnpaidDateDisplay: 'None',
      daysOverdue: 0,
      daysLeft: 0,
      monthsPending: 0,
      active,
      needsAttention: true,
      attentionReason: reasons.join(', ')
    };
  }

  const dueDay = admissionDate.getDate();
  const dueDayOrdinal = getOrdinalSuffix(dueDay);

  // 1. Find all payments for this student
  // If feeRecords is already pre-matched to this student, use them directly; otherwise filter with isPaymentForStudent.
  const matchingPayments = feeRecords.filter(r => {
    if (r._matchedStudentId && r._matchedStudentId === studentId.toUpperCase()) {
      return true;
    }
    return isPaymentForStudent(r, student);
  }).filter(r => {
    // If tracking start date is active, ignore payments before tracking start date (they paid for settled prior cycles)
    if (trackingMidnight) {
      const pDate = parseAdmissionDate(r.date);
      if (pDate && pDate < trackingMidnight) {
        return false;
      }
    }
    return true;
  });

  const totalPaid = matchingPayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // 2. Generate due cycles up to refMidnight
  // Enforces TRACKING_START_DATE: only cycles with dueDate >= max(admissionDate, trackingMidnight) are counted.
  // Prior cycles (< TRACKING_START_DATE) are considered historical and settled.
  const cycles = [];
  let cycleIdx = 0;
  let nextCycleDate = null;

  while (true) {
    const cycleDate = computeCycleDate(admissionDate, cycleIdx);
    if (cycleDate <= refMidnight) {
      if (!trackingMidnight || cycleDate >= trackingMidnight) {
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
      }
      cycleIdx++;
    } else {
      nextCycleDate = cycleDate;
      break;
    }
  }

  const totalDue = cycles.length * monthlyFee;

  // 3. Cycle-based Receipt Settlement (no partial carry-over balances)
  // Each valid receipt settles at least 1 billing cycle so prior fee rates or
  // discounts never leave a partial shortfall; multi-month lump-sum receipts
  // (>= 2x monthlyFee) settle the corresponding whole number of cycles.
  const validPayments = matchingPayments
    .map((r, idx) => ({
      amount: Number(r.amount) || 0,
      dateMs: parseAdmissionDate(r.date)?.getTime() ?? Number.MAX_SAFE_INTEGER,
      idx
    }))
    .filter(p => p.amount > 0)
    .sort((a, b) => (a.dateMs - b.dateMs) || (a.idx - b.idx));

  let cycleCursor = 0;
  for (const payment of validPayments) {
    const cyclesForReceipt = Math.max(1, Math.floor(payment.amount / monthlyFee));
    let remainingReceiptAmount = payment.amount;

    for (let k = 0; k < cyclesForReceipt; k++) {
      if (cycleCursor < cycles.length) {
        const cycle = cycles[cycleCursor];
        const allocated = cyclesForReceipt === 1
          ? remainingReceiptAmount
          : Math.min(remainingReceiptAmount, monthlyFee);
        cycle.paid = allocated;
        cycle.balance = 0;
        cycle.status = 'PAID';
        remainingReceiptAmount = Math.max(0, remainingReceiptAmount - allocated);
        cycleCursor++;
      }
    }
  }

  // 4. Find oldest unpaid cycle and enforce Amount Due = Monthly Fee × Pending Months
  const unpaidCycles = cycles.filter(c => c.balance > 0);
  const monthsPending = unpaidCycles.length;
  const oldestUnpaid = unpaidCycles[0] || null;
  const oldestUnpaidDate = oldestUnpaid ? oldestUnpaid.cycleDate : null;

  const outstanding = monthsPending * monthlyFee;
  const advanceCredit = monthsPending === 0 ? Math.max(0, totalPaid - totalDue) : 0;

  // 5. Determine Status
  let status = 'PAID';
  let daysOverdue = 0;
  let daysLeft = 0;

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
    studentMobile: student?.studentMobile || '',
    parentMobile: student?.parentMobile || '',
    batch: student?.batch || '',
    studentClass: student?.studentClass || student?.class || '',
    subject: student?.subject || '',
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
    needsAttention: false,
    attentionReason: '',
    notes: student?.notes || ''
  };
}

/**
 * Calculates aggregates and KPI metrics across all students.
 * Excludes students marked with needsAttention or inactive from active totals.
 */
export function calculateDueMetrics(studentLedgers = [], feeRecords = [], referenceDate = new Date()) {
  const refYmd = getKolkataYmd(referenceDate);

  // Filter out inactive and needsAttention students for primary KPIs
  const activeStudents = studentLedgers.filter(s => s.active && !s.needsAttention);
  const attentionStudents = studentLedgers.filter(s => s.needsAttention);

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
    needsAttentionCount: attentionStudents.length,
    totalActiveStudents: activeStudents.length,
    totalStudents: studentLedgers.length
  };
}
