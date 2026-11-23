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
  calculateStudentLedger,
  calculateDueMetrics
} from '../js/fee-due-calc.js';

test('parseAdmissionDate handles varied formats and 2-digit years', () => {
  // DD/MM/YYYY
  const d1 = parseAdmissionDate('18/05/2026');
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 4); // May
  assert.equal(d1.getDate(), 18);

  // DD/MM/YY (e.g. 13/08/26)
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

test('Worked Example 1: MJM003 admitted 05/06/2026, fee 2500, paid 10000 on 23 Nov 2026', () => {
  const student = {
    studentId: 'MJM003',
    studentName: 'Rohan Sharma',
    parentName: 'Sanjay Sharma',
    studentMobile: '9876543210',
    parentMobile: '9876543211',
    batch: 'Ranker',
    class: 'Class 11',
    subject: 'Maths',
    monthlyFee: 2500,
    admissionDate: '05/06/2026',
    status: 'Active'
  };

  const feeRecords = [
    {
      receiptNo: 'MJM-2026-0001',
      date: '2026-06-05',
      studentName: 'Rohan Sharma',
      amount: 2500,
      remarks: '[MJM003] June fee'
    },
    {
      receiptNo: 'MJM-2026-0010',
      date: '2026-07-05',
      studentName: 'Rohan Sharma',
      amount: 2500,
      remarks: 'July fee'
    },
    {
      receiptNo: 'MJM-2026-0020',
      date: '2026-08-05',
      studentName: 'Rohan Sharma',
      amount: 5000,
      remarks: 'August and September fee'
    }
  ]; // Total paid = 10,000

  const refDate = new Date(2026, 10, 23); // 23 Nov 2026
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  // 6 cycles: 5 Jun, 5 Jul, 5 Aug, 5 Sep, 5 Oct, 5 Nov
  assert.equal(ledger.cycles.length, 6);
  assert.equal(ledger.totalDue, 15000);
  assert.equal(ledger.totalPaid, 10000);
  assert.equal(ledger.outstanding, 5000);
  assert.equal(ledger.advanceCredit, 0);

  // FIFO check
  assert.equal(ledger.cycles[0].status, 'PAID'); // Jun
  assert.equal(ledger.cycles[1].status, 'PAID'); // Jul
  assert.equal(ledger.cycles[2].status, 'PAID'); // Aug
  assert.equal(ledger.cycles[3].status, 'PAID'); // Sep
  assert.equal(ledger.cycles[4].status, 'UNPAID'); // Oct
  assert.equal(ledger.cycles[5].status, 'UNPAID'); // Nov

  // Oldest unpaid: 5 Oct 2026
  assert.equal(ledger.oldestUnpaidDate.getDate(), 5);
  assert.equal(ledger.oldestUnpaidDate.getMonth(), 9); // October

  // Overdue days between 5 Oct 2026 and 23 Nov 2026 = 49 days
  assert.equal(ledger.daysOverdue, 49);
  assert.equal(ledger.monthsPending, 2);
  assert.equal(ledger.status, 'OVERDUE');
});

test('Status: DUE TODAY when cycle is due on reference date', () => {
  const student = {
    studentId: 'MJM005',
    studentName: 'Aarav Patel',
    monthlyFee: 3000,
    admissionDate: '23/05/2026',
    status: 'Active'
  };

  // On 23 Nov 2026, 7th cycle (23 Nov) is due today!
  // Student paid for first 6 cycles: 6 * 3000 = 18000
  const feeRecords = [
    { receiptNo: 'MJM-2026-0005', studentName: 'Aarav Patel', amount: 18000 }
  ];

  const refDate = new Date(2026, 10, 23); // 23 Nov 2026
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.totalDue, 21000);
  assert.equal(ledger.totalPaid, 18000);
  assert.equal(ledger.outstanding, 3000);
  assert.equal(ledger.status, 'DUE TODAY');
  assert.equal(ledger.daysOverdue, 0);
});

test('Status: UPCOMING when student is fully paid and next cycle is <= 7 days away', () => {
  const student = {
    studentId: 'MJM007',
    studentName: 'Priya Verma',
    monthlyFee: 4000,
    admissionDate: '28/05/2026',
    status: 'Active'
  };

  // Evaluate on 23 Nov 2026. Next cycle is 28 Nov 2026 (5 days away <= 7 days).
  // Cycles up to 23 Nov: May 28, Jun 28, Jul 28, Aug 28, Sep 28, Oct 28 = 6 cycles (24000 due).
  const feeRecords = [
    { receiptNo: 'MJM-2026-0007', studentName: 'Priya Verma', amount: 24000 }
  ];

  const refDate = new Date(2026, 10, 23); // 23 Nov 2026
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.status, 'UPCOMING');
  assert.equal(ledger.daysLeft, 5);
});

test('Status: PAID when fully paid and next cycle is > 7 days away', () => {
  const student = {
    studentId: 'MJM008',
    studentName: 'Ananya Gupta',
    monthlyFee: 4000,
    admissionDate: '15/05/2026',
    status: 'Active'
  };

  // Evaluate on 23 Nov 2026. Last due cycle was 15 Nov 2026.
  // Next cycle is 15 Dec 2026 (22 days away > 7 days).
  // Total due for 7 cycles: 7 * 4000 = 28000
  const feeRecords = [
    { receiptNo: 'MJM-2026-0008', studentName: 'Ananya Gupta', amount: 28000 }
  ];

  const refDate = new Date(2026, 10, 23);
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.status, 'PAID');
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
    { receiptNo: 'MJM-2026-0009', studentName: 'Vikram Joshi', amount: 15000 }
  ];

  const refDate = new Date(2026, 10, 23);
  const ledger = calculateStudentLedger(student, feeRecords, refDate);

  assert.equal(ledger.totalDue, 10000);
  assert.equal(ledger.totalPaid, 15000);
  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.advanceCredit, 5000);
  assert.equal(ledger.status, 'PAID');
});

test('Student matching: matches by remarks studentId, exact name, or phone numbers', () => {
  const student = {
    studentId: 'MJM010',
    studentName: 'Aditi Singh',
    studentMobile: '9123456789',
    parentMobile: '9876501234'
  };

  // ID in remarks
  assert.ok(isPaymentForStudent({ remarks: 'Fee payment for [MJM010]' }, student));
  // Exact name
  assert.ok(isPaymentForStudent({ studentName: 'Aditi Singh' }, student));
  assert.ok(isPaymentForStudent({ studentName: '  aditi singh  ' }, student));
  // Student phone
  assert.ok(isPaymentForStudent({ phone: '+919123456789' }, student));
  // Parent phone
  assert.ok(isPaymentForStudent({ phone: '9876501234' }, student));
  // Unrelated record
  assert.ok(!isPaymentForStudent({ studentName: 'Other Student', phone: '9999999999' }, student));
});

test('calculateDueMetrics computes accurate KPIs', () => {
  const ledgers = [
    { active: true, status: 'DUE TODAY', outstanding: 3000, monthlyFee: 3000 },
    { active: true, status: 'OVERDUE', outstanding: 5000, monthlyFee: 2500 },
    { active: true, status: 'OVERDUE', outstanding: 2000, monthlyFee: 2000 },
    { active: true, status: 'UPCOMING', outstanding: 0, monthlyFee: 4000 },
    { active: true, status: 'PAID', outstanding: 0, monthlyFee: 5000 },
    { active: false, status: 'OVERDUE', outstanding: 10000, monthlyFee: 5000 } // Inactive excluded from active KPIs
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
  assert.equal(metrics.overdueCount, 2);
  assert.equal(metrics.overdueAmount, 7000);
  assert.equal(metrics.upcomingCount, 1);
  assert.equal(metrics.upcomingAmount, 4000);
  assert.equal(metrics.collectedTodayAmount, 8500);
  assert.equal(metrics.attentionRequiredCount, 3);
  assert.equal(metrics.totalActiveStudents, 5);
  assert.equal(metrics.totalStudents, 6);
});
