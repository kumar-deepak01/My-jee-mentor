import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.env.FINANCE_DATA_DIR || (process.env.VERCEL ? '/tmp' : './data'));
fs.mkdirSync(dataDir, { recursive: true });

const settingsFilePath = path.join(dataDir, 'finance-settings.json');
const auditFilePath = path.join(dataDir, 'finance-audit.json');

// In-memory cache synced with disk
let settingsCache = {};

try {
  if (fs.existsSync(settingsFilePath)) {
    settingsCache = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
  }
} catch (e) {
  settingsCache = {};
}

function persistSettings() {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settingsCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing finance settings to disk:', err);
  }
}

// In-memory audit log
let auditCache = [];
try {
  if (fs.existsSync(auditFilePath)) {
    auditCache = JSON.parse(fs.readFileSync(auditFilePath, 'utf8'));
  }
} catch {
  auditCache = [];
}

function persistAudit() {
  try {
    fs.writeFileSync(auditFilePath, JSON.stringify(auditCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing finance audit log to disk:', err);
  }
}

export function getSetting(key, defaultValue = null) {
  try {
    if (key in settingsCache) {
      return settingsCache[key];
    }
    return defaultValue;
  } catch (err) {
    console.error(`Error reading setting ${key}:`, err);
    return defaultValue;
  }
}

export function setSetting(key, value) {
  try {
    settingsCache[key] = String(value);
    persistSettings();
    return true;
  } catch (err) {
    console.error(`Error saving setting ${key}:`, err);
    return false;
  }
}

export function deleteSetting(key) {
  try {
    delete settingsCache[key];
    persistSettings();
    return true;
  } catch (err) {
    console.error(`Error deleting setting ${key}:`, err);
    return false;
  }
}

export function getAllSettings() {
  try {
    return { ...settingsCache };
  } catch (err) {
    console.error('Error fetching all settings:', err);
    return {};
  }
}

export function recordAuditEntry(entry) {
  try {
    const record = {
      id: auditCache.length + 1,
      timestamp: new Date().toISOString(),
      ...entry
    };
    auditCache.unshift(record);
    if (auditCache.length > 500) {
      auditCache = auditCache.slice(0, 500);
    }
    persistAudit();
    return record;
  } catch (err) {
    console.error('Error recording audit entry:', err);
    return null;
  }
}

export const financeDb = {
  get: getSetting,
  set: setSetting,
  delete: deleteSetting,
  all: getAllSettings,
  audit: recordAuditEntry
};
