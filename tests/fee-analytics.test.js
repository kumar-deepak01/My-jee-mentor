import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInr, formatCount, parseDateSafe, toYmd } from '../js/fee-analytics.js';

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

test('toYmd produces local YYYY-MM-DD string', () => {
  const d = new Date(2026, 10, 21);
  assert.equal(toYmd(d), '2026-11-21');
});
