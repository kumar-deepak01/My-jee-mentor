const SHEET_NAME = 'Fees';
const STUDENTS_SHEET_NAME = 'Students';
const HEADERS = ['Receipt No', 'Date', 'Student Name', 'Parent Name', 'Phone', 'Course', 'Batch', 'Fee Period', 'Amount', 'Payment Mode', 'Balance Due', 'Collected By', 'Remarks'];
const STUDENT_HEADERS = ['Student ID', 'Student Name', 'Parent Name', 'Student Mobile', 'Parent Mobile', 'Batch', 'Class', 'Subject', 'Monthly Fee', 'Admission Date', 'Status', 'Notes'];

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function expectedSecret() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_SECRET') || '';
}

function ensureSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Bind this Apps Script project to the fee spreadsheet.');
  let sheet = spreadsheet.getSheetByName('Fee entry') || spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function readStudents(spreadsheet) {
  if (!spreadsheet) spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) return [];
  const sheet = spreadsheet.getSheetByName(STUDENTS_SHEET_NAME);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, STUDENT_HEADERS.length).getDisplayValues();
  return values.map(function(row) {
    return {
      studentId: cleanCell(row[0], 50),
      studentName: cleanCell(row[1], 100),
      parentName: cleanCell(row[2], 100),
      studentMobile: cleanCell(row[3], 30),
      parentMobile: cleanCell(row[4], 30),
      batch: cleanCell(row[5], 80),
      studentClass: cleanCell(row[6], 50),
      subject: cleanCell(row[7], 100),
      monthlyFee: Number(String(row[8]).replace(/[^0-9.]/g, '')) || 0,
      admissionDate: cleanCell(row[9], 30),
      status: cleanCell(row[10], 30),
      notes: cleanCell(row[11], 500)
    };
  }).filter(function(s) {
    return Boolean(s.studentId || s.studentName);
  });
}

function validSecret(provided) {
  const expected = expectedSecret();
  if (!expected || !provided) return false;
  const expectedDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected);
  const providedDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(provided));
  let difference = 0;
  for (let i = 0; i < expectedDigest.length; i++) difference |= expectedDigest[i] ^ providedDigest[i];
  return difference === 0;
}

function cleanCell(value, maxLength) {
  const text = String(value == null ? '' : value).trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
  return /^[=@]/.test(text) ? "'" + text : text;
}

function doPost(e) {
  let lock;
  try {
    const data = JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (!validSecret(data.secret)) return jsonOutput({ok: false, message: 'Unauthorized request.'});
    const studentName = cleanCell(data.studentName, 100);
    const phone = String(data.phone == null ? '' : data.phone).trim().replace(/^['"]+/, '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 30);
    const amount = Number(data.amount);
    const phoneDigits = (phone.match(/[0-9]/g) || []).length;
    const isPhoneValid = (/^\+?[0-9\s()-]{8,25}$/.test(phone) || /^\+?[0-9-]+$/.test(phone)) && phoneDigits >= 8 && phoneDigits <= 16;
    if (!studentName || !isPhoneValid || !isFinite(amount) || amount <= 0) {
      return jsonOutput({ok: false, message: 'Student name, valid phone and amount are required.'});
    }

    lock = LockService.getScriptLock();
    lock.waitLock(30000);
    const sheet = ensureSheet();
    const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy');
    const prefix = 'MJM-' + year + '-';
    const lastRow = sheet.getLastRow();
    const receiptCells = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues() : [];
    let sequence = 0;
    receiptCells.forEach(function(row) {
      const match = String(row[0]).match(new RegExp('^' + prefix + '(\\d+)$'));
      if (match) sequence = Math.max(sequence, Number(match[1]));
    });
    const receiptNo = prefix + String(sequence + 1).padStart(4, '0');

    let remarks = cleanCell(data.remarks, 500);
    const studentId = cleanCell(data.studentId, 50);
    if (studentId && remarks.indexOf(studentId) === -1) {
      remarks = ('[' + studentId + '] ' + remarks).trim().slice(0, 500);
    }

    const record = {
      receiptNo: receiptNo,
      date: cleanCell(data.date, 10),
      studentName: studentName,
      parentName: cleanCell(data.parentName, 100),
      phone: phone,
      course: cleanCell(data.course, 30),
      batch: cleanCell(data.batch, 80),
      feePeriod: cleanCell(data.feePeriod, 50),
      amount: Number(amount.toFixed(2)),
      paymentMode: cleanCell(data.paymentMode, 30),
      balanceDue: Number(data.balanceDue || 0),
      collectedBy: cleanCell(data.collectedBy, 100),
      remarks: remarks,
      studentId: studentId
    };
    const sheetPhone = /^[=+\-@]/.test(record.phone) ? "'" + record.phone : record.phone;
    sheet.appendRow([record.receiptNo, "'" + record.date, record.studentName, record.parentName, sheetPhone, record.course, record.batch, record.feePeriod, record.amount, record.paymentMode, record.balanceDue, record.collectedBy, record.remarks]);
    return jsonOutput({ok: true, receiptNo: receiptNo, record: record});
  } catch (error) {
    return jsonOutput({ok: false, message: 'Could not save the fee record. Please retry.'});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const params = e && e.parameter || {};
    if (!validSecret(params.secret)) return jsonOutput({ok: false, message: 'Unauthorized request.'});
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (params.action === 'students') {
      const students = readStudents(spreadsheet);
      return jsonOutput({ok: true, students: students});
    }

    const sheet = ensureSheet();
    const lastRow = sheet.getLastRow();
    const students = readStudents(spreadsheet);

    if (lastRow < 2) return jsonOutput({ok: true, records: [], students: students});
    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();
    const search = String(params.search || '').trim().toLowerCase();
    const date = String(params.date || '').trim();
    const records = values.map(function(row) {
      return {
        receiptNo: row[0], date: row[1], studentName: row[2], parentName: row[3], phone: row[4],
        course: row[5], batch: row[6], feePeriod: row[7], amount: Number(String(row[8]).replace(/,/g, '')) || 0,
        paymentMode: row[9], balanceDue: Number(String(row[10]).replace(/,/g, '')) || 0, collectedBy: row[11], remarks: row[12]
      };
    }).filter(function(record) {
      const matchesSearch = !search || [record.receiptNo, record.studentName, record.parentName, record.phone].join(' ').toLowerCase().indexOf(search) !== -1;
      const matchesDate = !date || record.date === date;
      return matchesSearch && matchesDate;
    }).reverse();
    return jsonOutput({ok: true, records: records, students: students});
  } catch (error) {
    return jsonOutput({ok: false, message: 'Could not read fee history.'});
  }
}
