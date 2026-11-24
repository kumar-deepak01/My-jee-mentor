/**
 * My JEE Mentor - Students Feed (Standalone Apps Script)
 * 
 * Standalone web app for Sheet A:
 * "Fee Entry MJM" (ID: 1dkboi-dfnfnO8lHhq9pgpzdZMLq3TNlwvtrqBetn-d4)
 * 
 * STRICTLY READ-ONLY:
 * - Reads the "Students" tab by HEADER NAME (case-insensitive, trimmed).
 * - Uses getDisplayValues() so dates and phone numbers keep exact text without timezone shift.
 * - Protects access with Script Property 'STUDENTS_SECRET'.
 * - No setValue, appendRow, or deleteRow anywhere in this file.
 */

const SHEET_ID = '1dkboi-dfnfnO8lHhq9pgpzdZMLq3TNlwvtrqBetn-d4';
const STUDENTS_TAB_NAME = 'Students';

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function expectedSecret() {
  return PropertiesService.getScriptProperties().getProperty('STUDENTS_SECRET') || '';
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

function cleanText(value) {
  return String(value == null ? '' : value).trim().replace(/[\u0000-\u001f\u007f]/g, '');
}

function parseMonthlyFee(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  const numStr = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(numStr);
  return isFinite(num) ? num : 0;
}

function fetchStudents() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  if (!spreadsheet) throw new Error('Could not open spreadsheet by ID.');
  const sheet = spreadsheet.getSheetByName(STUDENTS_TAB_NAME);
  if (!sheet) throw new Error('Worksheet "' + STUDENTS_TAB_NAME + '" not found.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return {
      ok: true,
      count: 0,
      generatedAt: new Date().toISOString(),
      students: []
    };
  }

  // Read headers by row 1
  const headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const headerMap = {};
  for (let c = 0; c < headerValues.length; c++) {
    const h = cleanText(headerValues[c]).toLowerCase();
    if (h) headerMap[h] = c;
  }

  const getColIdx = function(namePatterns) {
    for (let i = 0; i < namePatterns.length; i++) {
      const p = namePatterns[i].toLowerCase();
      if (p in headerMap) return headerMap[p];
    }
    for (let h in headerMap) {
      for (let j = 0; j < namePatterns.length; j++) {
        if (h.indexOf(namePatterns[j].toLowerCase()) !== -1) return headerMap[h];
      }
    }
    return -1;
  };

  const idCol = getColIdx(['student id', 'id']);
  const nameCol = getColIdx(['student name', 'name']);
  const parentCol = getColIdx(['parent name', 'father name', 'parent']);
  const sMobileCol = getColIdx(['student mobile', 'student phone', 'mobile']);
  const pMobileCol = getColIdx(['parent mobile', 'parent phone']);
  const batchCol = getColIdx(['batch']);
  const classCol = getColIdx(['class']);
  const subjectCol = getColIdx(['subject']);
  const feeCol = getColIdx(['monthly fee', 'fee']);
  const admissionCol = getColIdx(['admission date', 'joining date', 'admission']);
  const statusCol = getColIdx(['status']);
  const notesCol = getColIdx(['notes', 'remarks']);

  // Read all rows via getDisplayValues() to guarantee text preservation
  const displayValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

  const students = [];
  for (let r = 0; r < displayValues.length; r++) {
    const row = displayValues[r];
    const studentId = idCol >= 0 ? cleanText(row[idCol]) : '';
    const studentName = nameCol >= 0 ? cleanText(row[nameCol]) : '';

    // Skip fully empty row
    if (!studentId && !studentName) continue;

    students.push({
      studentId: studentId,
      studentName: studentName,
      parentName: parentCol >= 0 ? cleanText(row[parentCol]) : '',
      studentMobile: sMobileCol >= 0 ? cleanText(row[sMobileCol]) : '',
      parentMobile: pMobileCol >= 0 ? cleanText(row[pMobileCol]) : '',
      batch: batchCol >= 0 ? cleanText(row[batchCol]) : '',
      studentClass: classCol >= 0 ? cleanText(row[classCol]) : '',
      subject: subjectCol >= 0 ? cleanText(row[subjectCol]) : '',
      monthlyFee: feeCol >= 0 ? parseMonthlyFee(row[feeCol]) : 0,
      admissionDate: admissionCol >= 0 ? cleanText(row[admissionCol]) : '',
      status: statusCol >= 0 ? cleanText(row[statusCol]) : '',
      notes: notesCol >= 0 ? cleanText(row[notesCol]) : ''
    });
  }

  return {
    ok: true,
    count: students.length,
    generatedAt: new Date().toISOString(),
    students: students
  };
}

function doPost(e) {
  try {
    const data = JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (!validSecret(data.secret)) {
      return jsonOutput({ok: false, error: 'unauthorized', message: 'Unauthorized request.'});
    }
    const result = fetchStudents();
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({ok: false, error: 'SERVER_ERROR', message: error.message || 'Error reading students.'});
  }
}

function doGet(e) {
  try {
    const params = e && e.parameter || {};
    if (!validSecret(params.secret)) {
      return jsonOutput({ok: false, error: 'unauthorized', message: 'Unauthorized request.'});
    }
    const result = fetchStudents();
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({ok: false, error: 'SERVER_ERROR', message: error.message || 'Error reading students.'});
  }
}
