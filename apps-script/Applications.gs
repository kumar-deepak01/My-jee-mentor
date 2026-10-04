const APPLICATION_SHEET = 'Applications';
const APPLICATION_HEADERS = ['Timestamp', 'Name', 'Phone', 'Email', 'Education', 'Job Title', 'Resume Link'];
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function applicationSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Bind this script to the applications spreadsheet.');
  let sheet = spreadsheet.getSheetByName(APPLICATION_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(APPLICATION_SHEET);
  if (sheet.getLastRow() === 0) sheet.appendRow(APPLICATION_HEADERS);
  return sheet;
}

function cleanApplicationCell(value, limit) {
  const text = String(value == null ? '' : value).trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, limit);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function sendApplicationResult(token, ok, message) {
  const safeToken = /^[a-f0-9-]{36}$/i.test(String(token || '')) ? String(token) : '';
  const result = JSON.stringify({token: safeToken, ok: Boolean(ok), message: String(message || '')});
  const encoded = JSON.stringify(result);
  return HtmlService.createHtmlOutput('<!doctype html><script>parent.postMessage(JSON.parse(' + encoded + '), "*");</script>');
}

function doPost(e) {
  const token = e && e.parameter && e.parameter.callbackToken;
  try {
    const data = JSON.parse(e && e.parameter && e.parameter.payload || '{}');
    const name = cleanApplicationCell(data.name, 100);
    const phone = String(data.phone || '').replace(/\D/g, '');
    const email = cleanApplicationCell(data.email, 254);
    const education = cleanApplicationCell(data.education, 150);
    const jobTitle = cleanApplicationCell(data.jobTitle, 100);
    const resumeName = String(data.resumeName || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const resumeType = String(data.resumeType || 'application/octet-stream');
    const encoded = String(data.resumeData || '');
    if (!name || !/^\d{10}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !education || !jobTitle || !encoded) throw new Error('Complete all required fields with a valid phone and email.');
    if (!/\.(pdf|doc|docx)$/i.test(resumeName)) throw new Error('Resume must be PDF, DOC or DOCX.');
    const bytes = Utilities.base64Decode(encoded);
    if (!bytes.length || bytes.length > MAX_RESUME_BYTES) throw new Error('Resume must be no larger than 5 MB.');
    const folderId = PropertiesService.getScriptProperties().getProperty('APPLICATIONS_FOLDER_ID');
    if (!folderId) throw new Error('Set APPLICATIONS_FOLDER_ID in Apps Script project properties.');
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(Utilities.newBlob(bytes, resumeType, resumeName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const sheet = applicationSheet();
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try { sheet.appendRow([new Date(), name, "'" + phone, email, education, jobTitle, file.getUrl()]); }
    finally { lock.releaseLock(); }
    return sendApplicationResult(token, true, 'Application submitted.');
  } catch (error) {
    return sendApplicationResult(token, false, error && error.message || 'Application could not be saved.');
  }
}
