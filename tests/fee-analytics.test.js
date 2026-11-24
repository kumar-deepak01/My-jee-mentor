import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInr,
  formatCount,
  parseDateSafe,
  toYmd,
  getKolkataYmd,
  formatKolkataDate
} from '../client/js/fee-analytics.js';

test('formatInr formats Indian currency correctly', () => {
  assert.equal(formatInr(1850000), '₹18,50,000');
  assert.equal(formatInr(25000), '₹25,000');
  assert.equal(formatInr(0), '₹0');
  assert.equal(formatInr(1850000, { compact: true }), '₹18.50 L');
  assert.equal(formatInr(12000000, { compact: true }), '₹1.20 Cr');
  assert.equal(formatInr(5000, { compact: true }), '₹5 k');
});

test('formatCount formats counts in Indian system', () => {
  assert.equal(formatCount(1234), '1,234');
  assert.equal(formatCount(100000), '1,00,000');
  assert.equal(formatCount(0), '0');
});

test('parseDateSafe parses YYYY-MM-DD safely without timezone shifts', () => {
  const d = parseDateSafe('2026-11-21');
  assert.ok(d instanceof Date);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10); // 0-indexed November
  assert.equal(d.getDate(), 21);

  assert.equal(parseDateSafe(''), null);
  assert.equal(parseDateSafe('invalid-date'), null);
  assert.equal(parseDateSafe(null), null);
});

test('parseDateSafe handles named month formats', () => {
  const d1 = parseDateSafe('21 Nov 2026');
  assert.ok(d1 instanceof Date);
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 10);
  assert.equal(d1.getDate(), 21);

  const d2 = parseDateSafe('31 Oct 2026');
  assert.ok(d2 instanceof Date);
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getMonth(), 9); // October
  assert.equal(d2.getDate(), 31);

  const d3 = parseDateSafe('01-November-2026');
  assert.ok(d3 instanceof Date);
  assert.equal(d3.getFullYear(), 2026);
  assert.equal(d3.getMonth(), 10);
  assert.equal(d3.getDate(), 1);

  const d4 = parseDateSafe('Nov 21, 2026');
  assert.ok(d4 instanceof Date);
  assert.equal(d4.getFullYear(), 2026);
  assert.equal(d4.getMonth(), 10);
  assert.equal(d4.getDate(), 21);
});

test('parseDateSafe handles Indian DD-MM-YYYY and DD/MM/YYYY formats', () => {
  const d1 = parseDateSafe('21-11-2026');
  assert.ok(d1 instanceof Date);
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 10);
  assert.equal(d1.getDate(), 21);

  const d2 = parseDateSafe('31/10/2026');
  assert.ok(d2 instanceof Date);
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getMonth(), 9);
  assert.equal(d2.getDate(), 31);
});

test('parseDateSafe handles Date objects and Google Sheets serial numbers', () => {
  const now = new Date(2026, 10, 21, 15, 30, 0);
  const d1 = parseDateSafe(now);
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 10);
  assert.equal(d1.getDate(), 21);
  assert.equal(d1.getHours(), 0);

  // Serial date 46347 (approx Nov 2026)
  const d2 = parseDateSafe(46347);
  assert.ok(d2 instanceof Date);
  assert.equal(d2.getFullYear(), 2026);
});

test('toYmd produces local YYYY-MM-DD string', () => {
  const d = new Date(2026, 10, 21);
  assert.equal(toYmd(d), '2026-11-21');
  assert.equal(toYmd(null), '');
});

test('getKolkataYmd and formatKolkataDate format Indian Standard Time correctly', () => {
  const fixedDate = new Date('2026-11-21T06:00:00Z'); // 11:30 AM IST on 21 Nov 2026
  const ymd = getKolkataYmd(fixedDate);
  assert.equal(ymd, '2026-11-21');

  const formatted = formatKolkataDate(fixedDate);
  assert.match(formatted, /21 Nov 2026/);
});
