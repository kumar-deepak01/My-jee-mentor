import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMonthDateRange,
  getFinancialYearRange,
  formatDateIndian,
  formatMoneyInr,
  formatInrInteger,
  classifyExpense,
  classifySalary,
  filterRecordsByPeriod,
  computeMonthBreakdown
} from '../js/finance-pdf.js';

test('getMonthDateRange: calculates exact month boundaries including leap years', () => {
  // November 2026 (30 days)
  const nov26 = getMonthDateRange(2026, 11);
  assert.equal(nov26.startDate, '2026-11-01');
  assert.equal(nov26.endDate, '2026-11-30');
  assert.equal(nov26.label, 'November 2026');
  assert.equal(nov26.displayRange, '01 November 2026 – 30 November 2026');

  // October 2026 (31 days)
  const oct26 = getMonthDateRange(2026, 10);
  assert.equal(oct26.startDate, '2026-10-01');
  assert.equal(oct26.endDate, '2026-10-31');
  assert.equal(oct26.displayRange, '01 October 2026 – 31 October 2026');

  // February 2024 (Leap year: 29 days)
  const feb24 = getMonthDateRange(2024, 2);
  assert.equal(feb24.startDate, '2024-02-01');
  assert.equal(feb24.endDate, '2024-02-29');
  assert.equal(feb24.displayRange, '01 February 2024 – 29 February 2024');

  // February 2025 (Common year: 28 days)
  const feb25 = getMonthDateRange(2025, 2);
  assert.equal(feb25.startDate, '2025-02-01');
  assert.equal(feb25.endDate, '2025-02-28');

  // February 2026 (Common year: 28 days)
  const feb26 = getMonthDateRange(2026, 2);
  assert.equal(feb26.startDate, '2026-02-01');
  assert.equal(feb26.endDate, '2026-02-28');

  // Invalid parameters
  assert.throws(() => getMonthDateRange(2026, 13), /Invalid year/);
  assert.throws(() => getMonthDateRange(2026, 0), /Invalid year/);
});

test('getFinancialYearRange: calculates Indian Financial Year boundaries (01 April to 31 March)', () => {
  const fy26 = getFinancialYearRange(2026);
  assert.equal(fy26.startDate, '2026-04-01');
  assert.equal(fy26.endDate, '2027-03-31');
  assert.equal(fy26.label, 'FY 2026-27');
  assert.equal(fy26.displayRange, '01 April 2026 – 31 March 2027');

  const fy25 = getFinancialYearRange(2025);
  assert.equal(fy25.startDate, '2025-04-01');
  assert.equal(fy25.endDate, '2026-03-31');
  assert.equal(fy25.label, 'FY 2025-26');
  assert.equal(fy25.displayRange, '01 April 2025 – 31 March 2026');
});

test('formatDateIndian & formatMoneyInr: formats dates and amounts in Indian standard', () => {
  assert.equal(formatDateIndian('2026-11-21'), '21 Nov 2026');
  assert.equal(formatDateIndian('2026-01-05'), '05 Jan 2026');
  assert.equal(formatDateIndian(''), '-');

  assert.equal(formatMoneyInr(144000), '1,44,000.00');
  assert.equal(formatMoneyInr(5000), '5,000.00');
  assert.equal(formatMoneyInr(0), '0.00');
  assert.equal(formatInrInteger(144000), '1,44,000');
});

test('Expense and Salary departmental classification', () => {
  assert.equal(classifyExpense({ category: 'Marketing - Google Ads', description: 'Search campaign' }), 'marketing');
  assert.equal(classifyExpense({ category: 'Software & Infrastructure', description: 'Vercel hosting' }), 'technical');
  assert.equal(classifyExpense({ category: 'Teacher Honorarium & Faculty', description: 'Lecture fees' }), 'teacher');
  assert.equal(classifyExpense({ category: 'Counselor Salary', description: 'Monthly call bonus' }), 'counselor');
  assert.equal(classifyExpense({ category: 'Office Rent', description: 'Classroom premises' }), 'other');

  assert.equal(classifySalary({ role: 'Senior JEE Physics Faculty', department: 'Academics' }), 'teacher');
  assert.equal(classifySalary({ role: 'Academic Counselor', department: 'Admissions' }), 'counselor');
  assert.equal(classifySalary({ role: 'Accountant', department: 'Administration' }), 'other');
});

test('filterRecordsByPeriod: excludes out-of-period records and unpaid salaries', () => {
  const sample = {
    feeRecords: [
      { receiptNo: 'MJM-2026-0001', date: '2026-11-05', amount: 5000 },
      { receiptNo: 'MJM-2026-0002', date: '2026-10-25', amount: 8000 }
    ],
    otherIncome: [
      { id: 'INC-1', date: '2026-11-10', amount: 1500, source: 'Study Material' },
      { id: 'INC-2', date: '2026-10-10', amount: 2000, source: 'Study Material' },
      // Duplicate tuition fee record should be ignored
      { id: 'INC-3', date: '2026-11-12', amount: 5000, source: 'Fee Collection' }
    ],
    expenses: [
      { id: 'EXP-1', date: '2026-11-08', amount: 3000, category: 'Marketing' },
      { id: 'EXP-2', date: '2026-09-01', amount: 4000, category: 'Rent' }
    ],
    salaries: [
      { id: 'SAL-1', paymentDate: '2026-11-01', netPaid: 25000, status: 'Paid' },
      // Unpaid salary commitment should NOT count
      { id: 'SAL-2', paymentDate: '2026-11-01', netPaid: 30000, status: 'Unpaid' }
    ]
  };

  const filteredNov = filterRecordsByPeriod(sample, '2026-11-01', '2026-11-30');
  assert.equal(filteredNov.feeRecords.length, 1);
  assert.equal(filteredNov.feeRecords[0].receiptNo, 'MJM-2026-0001');

  assert.equal(filteredNov.otherIncome.length, 1);
  assert.equal(filteredNov.otherIncome[0].id, 'INC-1');

  assert.equal(filteredNov.expenses.length, 1);
  assert.equal(filteredNov.expenses[0].id, 'EXP-1');

  assert.equal(filteredNov.salaries.length, 1);
  assert.equal(filteredNov.salaries[0].id, 'SAL-1');
});

test('computeMonthBreakdown: reconciles verified fee collection and computes net profit', () => {
  // Test dataset matching user production scenario:
  // 41 fee transactions totaling 1,44,000, 0 expenses, 0 salaries
  const dummyFees = Array.from({ length: 41 }, (_, i) => ({
    receiptNo: `MJM-2026-${String(i + 1).padStart(4, '0')}`,
    date: '2026-11-15',
    studentName: `Student ${i + 1}`,
    amount: i === 0 ? 4000 : (140000 / 40) // sum is 1,44,000
  }));

  const dataset = {
    feeRecords: dummyFees,
    otherIncome: [],
    expenses: [],
    salaries: []
  };

  const breakdown = computeMonthBreakdown(dataset, '2026-11-01', '2026-11-30');
  assert.equal(breakdown.months.length, 1);
  const nov = breakdown.months[0];
  assert.equal(nov.monthKey, '2026-11');
  assert.equal(nov.feeCollection, 144000);
  assert.equal(nov.otherIncome, 0);
  assert.equal(nov.totalIncome, 144000);
  assert.equal(nov.totalExpenses, 0);
  assert.equal(nov.netProfit, 144000);
  assert.equal(nov.margin, 100);

  assert.equal(breakdown.totals.feeCollection, 144000);
  assert.equal(breakdown.totals.totalIncome, 144000);
  assert.equal(breakdown.totals.totalExpenses, 0);
  assert.equal(breakdown.totals.netProfit, 144000);
  assert.equal(breakdown.totals.margin, 100);
});

test('computeMonthBreakdown: multi-month calculation with expenses and salaries', () => {
  const dataset = {
    feeRecords: [
      { receiptNo: 'F1', date: '2026-10-10', amount: 50000 },
      { receiptNo: 'F2', date: '2026-11-10', amount: 60000 }
    ],
    otherIncome: [
      { id: 'O1', date: '2026-10-12', amount: 5000, source: 'Test Series' }
    ],
    expenses: [
      { id: 'E1', date: '2026-10-15', amount: 10000, category: 'Marketing - Google Ads' },
      { id: 'E2', date: '2026-11-20', amount: 8000, category: 'Software & Infrastructure' }
    ],
    salaries: [
      { id: 'S1', paymentDate: '2026-10-05', netPaid: 20000, role: 'Teacher', status: 'Paid' },
      { id: 'S2', paymentDate: '2026-11-05', netPaid: 25000, role: 'Teacher', status: 'Paid' }
    ]
  };

  const breakdown = computeMonthBreakdown(dataset, '2026-10-01', '2026-11-30');
  assert.equal(breakdown.months.length, 2);

  const oct = breakdown.months[0];
  assert.equal(oct.monthKey, '2026-10');
  assert.equal(oct.feeCollection, 50000);
  assert.equal(oct.otherIncome, 5000);
  assert.equal(oct.totalIncome, 55000);
  assert.equal(oct.teacherSalary, 20000);
  assert.equal(oct.marketingExpenses, 10000);
  assert.equal(oct.totalExpenses, 30000);
  assert.equal(oct.netProfit, 25000);

  const nov = breakdown.months[1];
  assert.equal(nov.monthKey, '2026-11');
  assert.equal(nov.feeCollection, 60000);
  assert.equal(nov.otherIncome, 0);
  assert.equal(nov.totalIncome, 60000);
  assert.equal(nov.teacherSalary, 25000);
  assert.equal(nov.technicalExpenses, 8000);
  assert.equal(nov.totalExpenses, 33000);
  assert.equal(nov.netProfit, 27000);

  // Grand totals
  assert.equal(breakdown.totals.totalIncome, 115000);
  assert.equal(breakdown.totals.totalExpenses, 63000);
  assert.equal(breakdown.totals.netProfit, 52000);
});

test('Final Testing: 1. November 2026 & 2. October 2026 monthly periods', () => {
  const nov = getMonthDateRange(2026, 11);
  assert.equal(nov.startDate, '2026-11-01');
  assert.equal(nov.endDate, '2026-11-30');
  assert.equal(nov.displayRange, '01 November 2026 – 30 November 2026');

  const oct = getMonthDateRange(2026, 10);
  assert.equal(oct.startDate, '2026-10-01');
  assert.equal(oct.endDate, '2026-10-31');
  assert.equal(oct.displayRange, '01 October 2026 – 31 October 2026');
});

test('Final Testing: 3. Full financial year & 4. Custom date range', () => {
  const fy = getFinancialYearRange(2026);
  assert.equal(fy.startDate, '2026-04-01');
  assert.equal(fy.endDate, '2027-03-31');
  assert.equal(fy.displayRange, '01 April 2026 – 31 March 2027');

  const sampleData = {
    feeRecords: [
      { receiptNo: 'R1', date: '2026-10-15', amount: 15000 },
      { receiptNo: 'R2', date: '2026-11-02', amount: 25000 },
      { receiptNo: 'R3', date: '2026-12-01', amount: 30000 }
    ]
  };

  const custom = computeMonthBreakdown(sampleData, '2026-10-15', '2026-11-15');
  assert.equal(custom.totals.feeCollection, 40000); // Only R1 and R2
  assert.equal(custom.totals.totalIncome, 40000);
});

test('Final Testing: 5. Multiple-page transactions & 6. Empty expense/salary sections', () => {
  // Test large volume (e.g. 150 receipts)
  const largeVolume = Array.from({ length: 150 }, (_, i) => ({
    receiptNo: `MJM-REC-${i + 1}`,
    date: '2026-11-10',
    amount: 1000
  }));

  const data = {
    feeRecords: largeVolume,
    otherIncome: [],
    expenses: [],
    salaries: []
  };

  const breakdown = computeMonthBreakdown(data, '2026-11-01', '2026-11-30');
  assert.equal(breakdown.filteredRecords.feeRecords.length, 150);
  assert.equal(breakdown.totals.feeCollection, 150000);
  assert.equal(breakdown.totals.totalExpenses, 0); // Empty expenses
  assert.equal(breakdown.totals.teacherSalary, 0); // Empty salaries
  assert.equal(breakdown.totals.netProfit, 150000);
});

test('Final Testing: 7. Verified Fee Register Reconciliation (1,44,000 across 41 transactions)', () => {
  const verifiedFees = Array.from({ length: 41 }, (_, i) => ({
    receiptNo: `REC-${i + 1}`,
    date: '2026-11-20',
    amount: i === 0 ? 4000 : 3500
  }));

  const dataset = {
    feeRecords: verifiedFees,
    otherIncome: [],
    expenses: [],
    salaries: []
  };

  const res = computeMonthBreakdown(dataset, '2026-11-01', '2026-11-30');
  assert.equal(res.totals.feeCollection, 144000);
  assert.equal(res.filteredRecords.feeRecords.length, 41);
  assert.equal(res.totals.totalIncome, 144000);
});

