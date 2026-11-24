import test from 'node:test';
import assert from 'node:assert/strict';
import * as libphonenumber from 'libphonenumber-js';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByIso,
  findCountryByDialCode,
  searchCountries,
  detectCountryFromNumber,
  validatePhoneNumber,
  formatAsYouType,
  setLibphonenumber
} from '../client/js/intl-phone.js';
import { validateRecord } from '../server/_fees-handler.js';

// Ensure libphonenumber is provided in Node test environment
setLibphonenumber(libphonenumber);

test('International Phone Support - Catalog covers all required countries and defaults to India (+91)', () => {
  assert.equal(DEFAULT_COUNTRY.iso2, 'IN');
  assert.equal(DEFAULT_COUNTRY.dialCode, '+91');
  assert.ok(COUNTRIES.length >= 240, 'Should cover 240+ countries and territories');

  const requiredCountries = [
    { iso: 'IN', dial: '+91', name: 'India' },
    { iso: 'US', dial: '+1', name: 'United States' },
    { iso: 'GB', dial: '+44', name: 'United Kingdom' },
    { iso: 'AE', dial: '+971', name: 'United Arab Emirates' },
    { iso: 'NP', dial: '+977', name: 'Nepal' },
    { iso: 'AU', dial: '+61', name: 'Australia' }
  ];

  for (const req of requiredCountries) {
    const found = getCountryByIso(req.iso);
    assert.ok(found, `Should find country for ${req.iso}`);
    assert.equal(found.dialCode, req.dial);
  }
});

test('Country Search - matches by name, dial code and ISO2 code', () => {
  // By name
  const indiaResults = searchCountries('India');
  assert.ok(indiaResults.some(c => c.iso2 === 'IN'));

  const emiratesResults = searchCountries('Emirates');
  assert.ok(emiratesResults.some(c => c.iso2 === 'AE'));

  // By dial code with and without +
  const uaeDialResults = searchCountries('+971');
  assert.ok(uaeDialResults.some(c => c.iso2 === 'AE'));

  const ukDialResults = searchCountries('44');
  assert.ok(ukDialResults.some(c => c.iso2 === 'GB'));

  // By ISO2 code
  const auIsoResults = searchCountries('AU');
  assert.ok(auIsoResults.some(c => c.iso2 === 'AU'));
});

test('detectCountryFromNumber detects international calling prefix', () => {
  const us = detectCountryFromNumber('+12025550123');
  assert.equal(us?.country.iso2, 'US');

  const uae = detectCountryFromNumber('+971501234567');
  assert.equal(uae?.country.iso2, 'AE');

  const nep = detectCountryFromNumber('+9779841234567');
  assert.equal(nep?.country.iso2, 'NP');

  const ind = detectCountryFromNumber('+917304256203');
  assert.equal(ind?.country.iso2, 'IN');
});

test('Mandatory 6 Test Countries - Validation and E.164 Formatting', () => {
  const testCases = [
    {
      country: 'IN',
      input: '7304256203',
      expectedE164: '+917304256203'
    },
    {
      country: 'US',
      input: '(202) 555-0123',
      expectedE164: '+12025550123'
    },
    {
      country: 'GB',
      input: '07911 123456',
      expectedE164: '+447911123456'
    },
    {
      country: 'AE',
      input: '050 123 4567',
      expectedE164: '+971501234567'
    },
    {
      country: 'NP',
      input: '984-1234567',
      expectedE164: '+9779841234567'
    },
    {
      country: 'AU',
      input: '0412 345 678',
      expectedE164: '+61412345678'
    }
  ];

  for (const tc of testCases) {
    const res = validatePhoneNumber(tc.input, tc.country);
    assert.equal(res.isValid, true, `Validation failed for ${tc.country} with input ${tc.input}: ${res.error}`);
    assert.equal(res.e164, tc.expectedE164, `E.164 mismatch for ${tc.country}`);
  }
});

test('As-You-Type formatting works for international numbers', () => {
  const formattedUs = formatAsYouType('2025550123', 'US');
  assert.ok(formattedUs.includes('(') || formattedUs.includes(' '), 'US number should be formatted');

  const formattedIn = formatAsYouType('7304256203', 'IN');
  assert.ok(formattedIn.length > 10, 'Indian number should include formatted spacing');
});

test('Invalid Phone Rejection', () => {
  // Too short
  const shortRes = validatePhoneNumber('123', 'IN');
  assert.equal(shortRes.isValid, false);
  assert.ok(shortRes.error);

  // Invalid area/mobile prefix
  const invalidUs = validatePhoneNumber('0000000000', 'US');
  assert.equal(invalidUs.isValid, false);

  // Empty input
  const emptyRes = validatePhoneNumber('', 'IN');
  assert.equal(emptyRes.isValid, false);
});

test('Backend validateRecord normalizes international phone numbers to E.164', () => {
  const baseRecord = {
    studentName: 'Aarav Sharma',
    parentName: 'Ramesh Sharma',
    course: 'JEE',
    batch: 'Class 11 Morning',
    feePeriod: 'November 2026',
    amount: 15000,
    paymentMode: 'UPI',
    date: '2026-11-21',
    balanceDue: 0,
    collectedBy: 'Admin',
    remarks: 'Full fees paid'
  };

  // 1. India
  const recIn = validateRecord({ ...baseRecord, phone: '7304256203', phoneCountry: 'IN' });
  assert.equal(recIn.phone, '+917304256203');

  // 2. US
  const recUs = validateRecord({ ...baseRecord, phone: '202-555-0123', phoneCountry: 'US' });
  assert.equal(recUs.phone, '+12025550123');

  // 3. UK
  const recGb = validateRecord({ ...baseRecord, phone: '07911123456', phoneCountry: 'GB' });
  assert.equal(recGb.phone, '+447911123456');

  // 4. UAE
  const recAe = validateRecord({ ...baseRecord, phone: '+971501234567' });
  assert.equal(recAe.phone, '+971501234567');

  // 5. Nepal
  const recNp = validateRecord({ ...baseRecord, phone: '9841234567', phoneCountry: 'NP' });
  assert.equal(recNp.phone, '+9779841234567');

  // 6. Australia
  const recAu = validateRecord({ ...baseRecord, phone: '+61412345678' });
  assert.equal(recAu.phone, '+61412345678');

  // Backward compatibility: 10 digit Indian number without country specified
  const recLegacy = validateRecord({ ...baseRecord, phone: '9876543210' });
  assert.equal(recLegacy.phone, '+919876543210');
});

test('Backend validateRecord rejects invalid phone numbers', () => {
  const baseRecord = {
    studentName: 'Test Student',
    course: 'JEE',
    amount: 5000,
    paymentMode: 'Cash',
    date: '2026-11-21'
  };

  assert.throws(() => {
    validateRecord({ ...baseRecord, phone: '1234' });
  }, (err) => err.code === 'PHONE_INVALID' && /international phone number/i.test(err.message));

  assert.throws(() => {
    validateRecord({ ...baseRecord, phone: 'abcdefghij' });
  }, (err) => err.code === 'PHONE_INVALID' && /international phone number/i.test(err.message));
});


test('Backend validateRecord rejects empty student name', () => {
  const baseRecord = {
    phone: '+917294048814',
    course: 'JEE',
    amount: 5000,
    paymentMode: 'UPI',
    date: '2026-11-21'
  };

  assert.throws(() => {
    validateRecord({ ...baseRecord, studentName: '' });
  }, (err) => err.code === 'STUDENT_REQUIRED');

  assert.throws(() => {
    validateRecord({ ...baseRecord, studentName: '   ' });
  }, (err) => err.code === 'STUDENT_REQUIRED');
});

test('Backend validateRecord rejects empty or non-positive amount', () => {
  const baseRecord = {
    studentName: 'Deepak Kumar',
    phone: '+917294048814',
    course: 'JEE',
    paymentMode: 'UPI',
    date: '2026-11-21'
  };

  assert.throws(() => {
    validateRecord({ ...baseRecord, amount: 0 });
  }, (err) => err.code === 'AMOUNT_INVALID');

  assert.throws(() => {
    validateRecord({ ...baseRecord, amount: -500 });
  }, (err) => err.code === 'AMOUNT_INVALID');

  assert.throws(() => {
    validateRecord({ ...baseRecord, amount: 'invalid' });
  }, (err) => err.code === 'AMOUNT_INVALID');
});

test('Backend validateRecord accepts 0 and positive balance due', () => {
  const baseRecord = {
    studentName: 'Deepak Kumar',
    phone: '+917294048814',
    course: 'JEE',
    amount: 5000,
    paymentMode: 'UPI',
    date: '2026-11-21'
  };

  const recZero = validateRecord({ ...baseRecord, balanceDue: 0 });
  assert.equal(recZero.balanceDue, 0);

  const recEmpty = validateRecord({ ...baseRecord, balanceDue: '' });
  assert.equal(recEmpty.balanceDue, 0);

  const recPositive = validateRecord({ ...baseRecord, balanceDue: 2500 });
  assert.equal(recPositive.balanceDue, 2500);
});

test('Google Apps Script compatibility - handles phone numbers with and without leading +', () => {
  const phoneWithPlus = '+917294048814';
  const phoneWithoutPlus = phoneWithPlus.replace(/\D/g, '');
  assert.equal(phoneWithoutPlus, '917294048814');

  // Both forms contain 12 digits
  const digits1 = (phoneWithPlus.match(/[0-9]/g) || []).length;
  const digits2 = (phoneWithoutPlus.match(/[0-9]/g) || []).length;
  assert.equal(digits1, 12);
  assert.equal(digits2, 12);

  // Both forms pass /^\+?[0-9-]+$/
  assert.equal(/^\+?[0-9-]+$/.test(phoneWithPlus), true);
  assert.equal(/^\+?[0-9-]+$/.test(phoneWithoutPlus), true);

  // Both forms pass legacy /^\+?[0-9 ()-]{8,20}$/
  assert.equal(/^\+?[0-9 ()-]{8,20}$/.test(phoneWithPlus), true);
  assert.equal(/^\+?[0-9 ()-]{8,20}$/.test(phoneWithoutPlus), true);
});
