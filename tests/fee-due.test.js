import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAdmissionDate,
  computeCycleDate,
  getDaysInMonth,
  getOrdinalSuffix,
  formatDateDisplay,
  formatMonthYear,
  isStudentActive,
  isPaymentForStudent,
  nameMatches,
  normalizeName,
  matchReceiptsToStudents,
  validateStudentData,
  calculateStudentLedger,
  calculateDueMetrics,
  TRACKING_START_DATE
} from '../js/fee-due-calc.js';

test('parseAdmissionDate handles varied formats and 2-digit years', () => {
  // DD/MM/YYYY
  const d1 = parseAdmissionDate('18/05/2026');
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 4); // May
  assert.equal(d1.getDate(), 18);

  // DD/MM/YY (e.g. 13/08/26 -> 13 Aug 2026)
  const d2 = parseAdmissionDate('13/08/26');
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getMonth(), 7); // August
  assert.equal(d2.getDate(), 13);

  // ISO YYYY-MM-DD
  const d3 = parseAdmissionDate('2026-11-23');
  assert.equal(d3.getFullYear(), 2026);
  assert.equal(d3.getMonth(), 10);
  assert.equal(d3.getDate(), 23);

  // Named month
  const d4 = parseAdmissionDate('05 Jun 2026');
  assert.equal(d4.getFullYear(), 2026);
  assert.equal(d4.getMonth(), 5);
  assert.equal(d4.getDate(), 5);

  // Serial number
  const d5 = parseAdmissionDate(46170); // Google Sheets serial
  assert.ok(d5 instanceof Date);
  assert.equal(d5.getFullYear(), 2026);
});

test('getOrdinalSuffix formats ordinal numbers', () => {
  assert.equal(getOrdinalSuffix(1), '1st');
  assert.equal(getOrdinalSuffix(2), '2nd');
  assert.equal(getOrdinalSuffix(3), '3rd');
  assert.equal(getOrdinalSuffix(4), '4th');
  assert.equal(getOrdinalSuffix(11), '11th');
  assert.equal(getOrdinalSuffix(12), '12th');
  assert.equal(getOrdinalSuffix(18), '18th');
  assert.equal(getOrdinalSuffix(21), '21st');
  assert.equal(getOrdinalSuffix(22), '22nd');
  assert.equal(getOrdinalSuffix(23), '23rd');
  assert.equal(getOrdinalSuffix(31), '31st');
});

test('isStudentActive checks active status correctly', () => {
  assert.ok(isStudentActive('Active'));
  assert.ok(isStudentActive('active'));
  assert.ok(isStudentActive('enrolled'));
  assert.ok(isStudentActive('yes'));
  assert.ok(isStudentActive('true'));
  assert.ok(isStudentActive(null)); // default active
  assert.ok(!isStudentActive('Inactive'));
  assert.ok(!isStudentActive('left'));
  assert.ok(!isStudentActive('false'));
});

test('Month-end clamping: Admitted 31/07/2026 clamps across months', () => {
  const admission = parseAdmissionDate('31/07/2026');
  assert.equal(admission.getDate(), 31);
  assert.equal(admission.getMonth(), 6); // July

  // Cycle 0: 31 July 2026
  const c0 = computeCycleDate(admission, 0);
  assert.equal(c0.getFullYear(), 2026);
  assert.equal(c0.getMonth(), 6); // Jul
  assert.equal(c0.getDate(), 31);

  // Cycle 1: August (31 days) -> 31 Aug
  const c1 = computeCycleDate(admission, 1);
  assert.equal(c1.getFullYear(), 2026);
  assert.equal(c1.getMonth(), 7); // Aug
  assert.equal(c1.getDate(), 31);

  // Cycle 2: September (30 days) -> clamped to 30 Sep
  const c2 = computeCycleDate(admission, 2);
  assert.equal(c2.getFullYear(), 2026);
  assert.equal(c2.getMonth(), 8); // Sep
  assert.equal(c2.getDate(), 30);

  // Cycle 3: October (31 days) -> 31 Oct
  const c3 = computeCycleDate(admission, 3);
  assert.equal(c3.getFullYear(), 2026);
  assert.equal(c3.getMonth(), 9); // Oct
  assert.equal(c3.getDate(), 31);

  // Cycle 4: November (30 days) -> clamped to 30 Nov
  const c4 = computeCycleDate(admission, 4);
  assert.equal(c4.getFullYear(), 2026);
  assert.equal(c4.getMonth(), 10); // Nov
  assert.equal(c4.getDate(), 30);

  // Cycle 5: December (31 days) -> 31 Dec
  const c5 = computeCycleDate(admission, 5);
  assert.equal(c5.getFullYear(), 2026);
  assert.equal(c5.getMonth(), 11); // Dec
  assert.equal(c5.getDate(), 31);

  // Cycle 6: January 2027 (31 days) -> 31 Jan 2027
  const c6 = computeCycleDate(admission, 6);
  assert.equal(c6.getFullYear(), 2027);
  assert.equal(c6.getMonth(), 0); // Jan
  assert.equal(c6.getDate(), 31);

  // Cycle 7: February 2027 (non-leap year, 28 days) -> clamped to 28 Feb 2027
  const c7 = computeCycleDate(admission, 7);
  assert.equal(c7.getFullYear(), 2027);
  assert.equal(c7.getMonth(), 1); // Feb
  assert.equal(c7.getDate(), 28);
});

test('Leap year month-end clamping: Admitted 31/01/2028 clamps to 29 Feb 2028', () => {
  const admission = parseAdmissionDate('31/01/2028');
  const feb2028 = computeCycleDate(admission, 1);
  assert.equal(feb2028.getFullYear(), 2028);
  assert.equal(feb2028.getMonth(), 1); // Feb
  assert.equal(feb2028.getDate(), 29); // 2028 is leap year
});

test('Tracking Start Date Rule: Admitted 18/05/2026 evaluated on 24 Nov 2026 has exactly 2 cycles', () => {
  const student = {
    studentId: 'MJM001',
    studentName: 'M. Vignesh',
    parentName: 'Madhan',
    studentMobile: '6363814536',
    parentMobile: '9663394531',
    batch: 'Ranker',
    class: 'Class 12',
    subject: 'Maths',
    monthlyFee: 2500,
    admissionDate: '18/05/2026',
    status: 'Active'
  };

  const feeRecords = []; // No receipts
  const refDate = new Date(2026, 10, 24); // 24 Nov 2026
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  // Admitted 18/05/2026: Cycles before 1 Oct 2026 (18 May, 18 Jun, 18 Jul, 18 Aug, 18 Sep) are settled.
  // Counted cycles: 18 Oct 2026 and 18 Nov 2026 = exactly 2 cycles!
  assert.equal(ledger.cycles.length, 2);
  assert.equal(ledger.cycles[0].monthYear, 'October 2026');
  assert.equal(ledger.cycles[0].cycleDate.getDate(), 18);
  assert.equal(ledger.cycles[1].monthYear, 'November 2026');
  assert.equal(ledger.cycles[1].cycleDate.getDate(), 18);

  assert.equal(ledger.totalDue, 5000);
  assert.equal(ledger.totalPaid, 0);
  assert.equal(ledger.outstanding, 5000);

  // Overdue since 18 Oct 2026
  assert.equal(ledger.oldestUnpaidDate.getDate(), 18);
  assert.equal(ledger.oldestUnpaidDate.getMonth(), 9); // October
  assert.equal(ledger.status, 'OVERDUE');
  // 37 days overdue (between 18 Oct 2026 and 24 Nov 2026)
  assert.equal(ledger.daysOverdue, 37);
  assert.equal(ledger.monthsPending, 2);
});

test('Month-end clamping with Tracking Start Date: Admitted 31/07/2026', () => {
  const student = {
    studentId: 'MJM006',
    studentName: 'M. Sundaresan',
    monthlyFee: 3000,
    admissionDate: '31/07/2026',
    status: 'Active'
  };

  // Evaluated on 24 Nov 2026:
  // Cycles before 1 Oct 2026 (31 Jul, 31 Aug, 30 Sep) are skipped.
  // 31 Oct 2026 is counted. 30 Nov 2026 is in future (> 24 Nov).
  const ledger24Nov = calculateStudentLedger(student, [], new Date(2026, 10, 24));
  assert.equal(ledger24Nov.cycles.length, 1);
  assert.equal(ledger24Nov.cycles[0].monthYear, 'October 2026');
  assert.equal(ledger24Nov.cycles[0].cycleDate.getDate(), 31);
  assert.equal(ledger24Nov.totalDue, 3000);

  // Evaluated on 30 Nov 2026:
  // Both 31 Oct and 30 Nov (clamped to 30) are counted!
  const ledger30Nov = calculateStudentLedger(student, [], new Date(2026, 10, 30));
  assert.equal(ledger30Nov.cycles.length, 2);
  assert.equal(ledger30Nov.cycles[0].cycleDate.getDate(), 31);
  assert.equal(ledger30Nov.cycles[1].cycleDate.getDate(), 30);
  assert.equal(ledger30Nov.totalDue, 6000);
});

test('Matching Engine: Receipt MJM-2026-0005 matches student MJM002 ("D. Adithya" vs "D.Adithya")', () => {
  const students = [
    {
      studentId: 'MJM001',
      studentName: 'M. Vignesh',
      studentMobile: '6363814536',
      parentMobile: '9663394531',
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
      class: 'Class 11',
      subject: 'Maths Physics',
      monthlyFee: 2500,
      admissionDate: '19/05/2026',
      status: 'Active'
    }
  ];

  const receipts = [
    {
      receiptNo: 'MJM-2026-0005',
      date: '2026-10-21',
      studentName: 'D. Adithya',
      parentName: 'D. Chennaiah',
      phone: '+917013438004',
      course: 'JEE',
      batch: 'Ranker',
      feePeriod: 'October 2026',
      amount: 5000,
      remarks: 'Fee payment for 2 months'
    }
  ];

  const { studentReceiptsMap, audit } = matchReceiptsToStudents(students, receipts);

  assert.equal(audit.matchedCount, 1);
  assert.equal(audit.unmatchedCount, 0);
  assert.equal(audit.ambiguousCount, 0);

  const matchedReceipts = studentReceiptsMap.get('MJM002');
  assert.ok(matchedReceipts);
  assert.equal(matchedReceipts.length, 1);
  assert.equal(matchedReceipts[0].receiptNo, 'MJM-2026-0005');

  // Ledger calculation on 24 Nov 2026
  const refDate = new Date(2026, 10, 24);
  const ledger = calculateStudentLedger(students[1], matchedReceipts, refDate);

  // 2 cycles counted: 19 Oct (2500) and 19 Nov (2500) = 5000 due
  assert.equal(ledger.cycles.length, 2);
  assert.equal(ledger.totalDue, 5000);
  assert.equal(ledger.totalPaid, 5000);
  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.status, 'PAID');
  assert.equal(ledger.nextDueDate.getMonth(), 11); // December 19
});

test('Matching Engine: Sibling phone sharing disambiguation and ambiguity audit', () => {
  const students = [
    {
      studentId: 'MJM025',
      studentName: 'Dimple',
      parentName: 'Raj kumar',
      studentMobile: '9625620051',
      parentMobile: '9829409264',
      monthlyFee: 2500,
      admissionDate: '13/08/2026',
      status: 'Active'
    },
    {
      studentId: 'MJM026',
      studentName: 'Sarveshwaur bt',
      parentName: 'Balamurugan',
      studentMobile: '9123368240',
      parentMobile: '9829409264', // Shares parent phone with MJM025
      monthlyFee: 5000,
      admissionDate: '13/08/2026',
      status: 'Active'
    }
  ];

  // Receipt 1: Shared phone, matches Dimple by name -> should match MJM025
  // Receipt 2: Shared phone, unknown child name -> ambiguous!
  const receipts = [
    {
      receiptNo: 'MJM-2026-0050',
      studentName: 'Dimple',
      phone: '9829409264',
      amount: 2500,
      date: '2026-10-15'
    },
    {
      receiptNo: 'MJM-2026-0051',
      studentName: 'Unknown Child',
      phone: '9829409264',
      amount: 2500,
      date: '2026-10-16'
    }
  ];

  const { studentReceiptsMap, audit } = matchReceiptsToStudents(students, receipts);

  assert.equal(audit.matchedCount, 1);
  assert.equal(audit.ambiguousCount, 1);
  assert.equal(audit.unmatchedCount, 0);

  const dimpleReceipts = studentReceiptsMap.get('MJM025');
  assert.equal(dimpleReceipts.length, 1);
  assert.equal(dimpleReceipts[0].receiptNo, 'MJM-2026-0050');

  assert.equal(audit.ambiguousReceipts[0].receipt.receiptNo, 'MJM-2026-0051');
});

test('Matching Engine: Phone-only match without name match flagged as unmatched', () => {
  const students = [
    {
      studentId: 'MJM003',
      studentName: 'Rohan Sharma',
      parentName: 'Sanjay Sharma',
      studentMobile: '9876543210',
      parentMobile: '9876543211',
      monthlyFee: 2500,
      admissionDate: '05/06/2026',
      status: 'Active'
    }
  ];

  // Phone matches Rohan's phone, but studentName is completely different
  const receipts = [
    {
      receiptNo: 'MJM-2026-0099',
      studentName: 'Pooja Verma',
      phone: '9876543210',
      amount: 2500,
      date: '2026-10-10'
    }
  ];

  const { audit } = matchReceiptsToStudents(students, receipts);
  assert.equal(audit.matchedCount, 0);
  assert.equal(audit.unmatchedCount, 1);
  assert.ok(audit.unmatchedReceipts[0].reason.includes('name mismatch') || audit.unmatchedReceipts[0].reason.includes('receipt name is'));
});

test('Data Quality Validation: validateStudentData partitions invalid students', () => {
  const students = [
    { studentId: 'MJM001', studentName: 'Valid Student', admissionDate: '18/05/2026', monthlyFee: 2500 },
    { studentId: '', studentName: 'No ID Student', admissionDate: '18/05/2026', monthlyFee: 2500 },
    { studentId: 'MJM001', studentName: 'Duplicate ID', admissionDate: '20/05/2026', monthlyFee: 3000 },
    { studentId: 'MJM004', studentName: 'Bad Date', admissionDate: 'invalid-date-string', monthlyFee: 2500 },
    { studentId: 'MJM005', studentName: 'Zero Fee', admissionDate: '18/05/2026', monthlyFee: 0 }
  ];

  const { valid, needsAttention } = validateStudentData(students);

  assert.equal(valid.length, 1);
  assert.equal(valid[0].studentId, 'MJM001');

  assert.equal(needsAttention.length, 4);
  assert.equal(needsAttention[0].reason, 'Missing Student ID');
  assert.equal(needsAttention[1].reason, 'Duplicate Student ID (MJM001)');
  assert.ok(needsAttention[2].reason.includes('Invalid or missing admission date'));
  assert.ok(needsAttention[3].reason.includes('Invalid or missing monthly fee'));
});

test('Status: DUE TODAY when cycle is due on reference date', () => {
  const student = {
    studentId: 'MJM005',
    studentName: 'Aarav Patel',
    monthlyFee: 3000,
    admissionDate: '24/10/2026',
    status: 'Active'
  };

  // Evaluated on 24 Nov 2026:
  // Cycles: 24 Oct (paid), 24 Nov (due today!)
  const feeRecords = [
    { receiptNo: 'MJM-2026-0005', studentName: 'Aarav Patel', amount: 3000, date: '2026-10-24' }
  ];

  const refDate = new Date(2026, 10, 24); // 24 Nov 2026
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.totalDue, 6000);
  assert.equal(ledger.totalPaid, 3000);
  assert.equal(ledger.outstanding, 3000);
  assert.equal(ledger.status, 'DUE TODAY');
  assert.equal(ledger.daysOverdue, 0);
});

test('Status: UPCOMING when student is fully paid and next cycle is <= 7 days away', () => {
  const student = {
    studentId: 'MJM007',
    studentName: 'Priya Verma',
    monthlyFee: 4000,
    admissionDate: '28/09/2026',
    status: 'Active'
  };

  // Evaluate on 23 Nov 2026. Next cycle is 28 Nov 2026 (5 days away <= 7 days).
  // Cycles from 1 Oct up to 23 Nov: 28 Oct (1 cycle = 4000 due).
  const feeRecords = [
    { receiptNo: 'MJM-2026-0007', studentName: 'Priya Verma', amount: 4000, date: '2026-10-28' }
  ];

  const refDate = new Date(2026, 10, 23); // 23 Nov 2026
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.status, 'UPCOMING');
  assert.equal(ledger.daysLeft, 5);
});

test('Advance Credit: handles overpayment gracefully', () => {
  const student = {
    studentId: 'MJM009',
    studentName: 'Vikram Joshi',
    monthlyFee: 5000,
    admissionDate: '01/10/2026',
    status: 'Active'
  };

  // Evaluate on 23 Nov 2026. Cycles: 1 Oct, 1 Nov = 2 cycles = 10000 due.
  // Student paid 15,000 (advance for Dec as well).
  const feeRecords = [
    { receiptNo: 'MJM-2026-0009', studentName: 'Vikram Joshi', amount: 15000, date: '2026-10-01' }
  ];

  const refDate = new Date(2026, 10, 23);
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.totalDue, 10000);
  assert.equal(ledger.totalPaid, 15000);
  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.advanceCredit, 5000);
  assert.equal(ledger.status, 'PAID');
});

test('calculateDueMetrics excludes needsAttention and inactive students from active KPIs', () => {
  const ledgers = [
    { active: true, needsAttention: false, status: 'DUE TODAY', outstanding: 3000, monthlyFee: 3000 },
    { active: true, needsAttention: false, status: 'OVERDUE', outstanding: 5000, monthlyFee: 2500 },
    { active: true, needsAttention: false, status: 'UPCOMING', outstanding: 0, monthlyFee: 4000 },
    { active: true, needsAttention: false, status: 'PAID', outstanding: 0, monthlyFee: 5000 },
    { active: false, needsAttention: false, status: 'OVERDUE', outstanding: 10000, monthlyFee: 5000 }, // Inactive excluded
    { active: true, needsAttention: true, status: 'PAID', outstanding: 0, monthlyFee: 2500 } // Needs attention excluded
  ];

  const feeRecords = [
    { date: '2026-11-23', amount: 3500 },
    { date: '2026-11-23', amount: 5000 },
    { date: '2026-11-20', amount: 2000 }
  ];

  const refDate = new Date(2026, 10, 23);
  const metrics = calculateDueMetrics(ledgers, feeRecords, refDate);

  assert.equal(metrics.dueTodayCount, 1);
  assert.equal(metrics.dueTodayAmount, 3000);
  assert.equal(metrics.overdueCount, 1);
  assert.equal(metrics.overdueAmount, 5000);
  assert.equal(metrics.upcomingCount, 1);
  assert.equal(metrics.upcomingAmount, 4000);
  assert.equal(metrics.collectedTodayAmount, 8500);
  assert.equal(metrics.attentionRequiredCount, 2);
  assert.equal(metrics.needsAttentionCount, 1);
  assert.equal(metrics.totalActiveStudents, 4);
  assert.equal(metrics.totalStudents, 6);
});
