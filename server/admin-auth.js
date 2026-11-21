import { createHmac, createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSetting, setSetting, recordAuditEntry } from './finance-db.js';

export const FINANCE_COOKIE = 'mjm_finance_admin';
const SESSION_SECONDS = 4 * 60 * 60; // 4 hours
const loginAttempts = new Map();

/**
 * Returns trimmed Finance environment variable (strictly process.env.Finance_PASSWORDS).
 * Does NOT check ADMIN_PASSWORD or any other variable.
 */
export function getFinanceEnvPassword() {
  const raw = process.env.Finance_PASSWORDS;
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Checks whether Finance Portal password is configured via Finance_PASSWORDS or secure database hash.
 */
export function isFinancePasswordConfigured() {
  const envPass = getFinanceEnvPassword();
  if (envPass) {
    return true;
  }
  const hash = getSetting('admin_password_hash');
  const salt = getSetting('admin_password_salt');
  return Boolean(hash && salt);
}

// Backward-compatible alias
export const isPasswordConfigured = isFinancePasswordConfigured;

/**
 * Derives a PBKDF2-SHA512 hash for a password using a salt.
 */
function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Verifies candidate password for Finance Portal.
 * Uses timingSafeEqual on SHA-256 digest to prevent timing attacks.
 * Trims whitespace/newlines from input and stored value.
 */
export function verifyFinancePassword(candidate) {
  if (!candidate || typeof candidate !== 'string') return false;
  const candidateTrimmed = candidate.trim();
  if (!candidateTrimmed) return false;

  // 1. Check exact process.env.Finance_PASSWORDS if configured
  const envPass = getFinanceEnvPassword();
  if (envPass) {
    const a = createHash('sha256').update(candidateTrimmed).digest();
    const b = createHash('sha256').update(envPass).digest();
    return timingSafeEqual(a, b);
  }

  // 2. Check PBKDF2 hash in database (only if Finance_PASSWORDS is not set)
  const storedHash = getSetting('admin_password_hash');
  const storedSalt = getSetting('admin_password_salt');
  if (!storedHash || !storedSalt) {
    return false;
  }

  const candidateHash = hashPassword(candidateTrimmed, storedSalt);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Backward-compatible alias
export const verifyAdminPassword = verifyFinancePassword;

/**
 * Sets initial Finance master password in database (only if no env password exists).
 * Strictly prevents overwriting an existing password.
 */
export function setFinancePassword(newPassword, clientIp = 'Unknown') {
  if (isFinancePasswordConfigured()) {
    const error = new Error('Finance password has already been configured. Cannot overwrite.');
    error.code = 'PASSWORD_ALREADY_SET';
    error.status = 403;
    throw error;
  }

  const cleanPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

  if (cleanPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.code = 'PASSWORD_TOO_SHORT';
    error.status = 400;
    throw error;
  }

  if (cleanPassword.length > 200) {
    const error = new Error('Password is too long (maximum 200 characters).');
    error.code = 'PASSWORD_TOO_LONG';
    error.status = 400;
    throw error;
  }

  const salt = randomBytes(32).toString('hex');
  const hash = hashPassword(cleanPassword, salt);
  const sessionSecret = randomBytes(64).toString('hex');

  setSetting('admin_password_salt', salt);
  setSetting('admin_password_hash', hash);
  setSetting('admin_session_secret', sessionSecret);
  setSetting('admin_password_created_at', new Date().toISOString());

  recordAuditEntry({
    actor: 'Owner Initial Setup',
    action: 'CREATE_FINANCE_PASSWORD',
    entity: 'Authentication',
    details: 'Master Finance password successfully configured with PBKDF2-SHA512 encryption.',
    ip_address: clientIp
  });

  return true;
}

// Backward-compatible alias
export const setAdminPassword = setFinancePassword;

/**
 * Returns secret used to sign Finance HMAC session tokens.
 * Strictly uses Finance_PASSWORDS or database secret. Never uses ADMIN_PASSWORD.
 */
function getFinanceSessionSecret() {
  const envPass = getFinanceEnvPassword();
  if (envPass) {
    return envPass;
  }
  let secret = getSetting('admin_session_secret');
  if (!secret) {
    secret = getSetting('admin_password_hash');
  }
  return secret || '';
}

/**
 * Signs a session payload using HMAC-SHA256 for Finance Portal.
 */
export function signFinanceSessionPayload(payload) {
  const secret = getFinanceSessionSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Creates Set-Cookie header for authenticated Finance admin session (mjm_finance_admin).
 */
export function makeFinanceSessionCookie(age = SESSION_SECONDS) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + age })
  ).toString('base64url');
  const signature = signFinanceSessionPayload(payload);
  const token = `${payload}.${signature}`;
  const isProd = process.env.NODE_ENV === 'production';
  return `${FINANCE_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${age}`;
}

// Backward-compatible alias
export const makeSessionCookie = makeFinanceSessionCookie;

/**
 * Creates Set-Cookie header to clear Finance session cookie on logout.
 */
export function clearFinanceSessionCookie() {
  return `${FINANCE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Backward-compatible alias
export const clearSessionCookie = clearFinanceSessionCookie;

/**
 * Verifies if the incoming request has a valid, non-expired Finance admin session.
 */
export function hasFinanceSession(request) {
  const secret = getFinanceSessionSecret();
  if (!secret) return false;

  const cookieHeader = request.headers.get('cookie') || '';
  const value = cookieHeader
    .split(';')
    .map(p => p.trim())
    .find(p => p.startsWith(`${FINANCE_COOKIE}=`))
    ?.slice(FINANCE_COOKIE.length + 1);

  if (!value) return false;

  try {
    const [payload, signature, ...rest] = decodeURIComponent(value).split('.');
    if (!payload || !signature || rest.length) return false;

    const expected = signFinanceSessionPayload(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// Backward-compatible alias
export const hasAdminSession = hasFinanceSession;

/**
 * Rate-limiting helper for login and password setup.
 */
export function checkRateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && entry.until > now && entry.count >= maxAttempts) {
    const waitMins = Math.ceil((entry.until - now) / 60000);
    const error = new Error(`Too many attempts. Please wait ${waitMins} minute(s) before trying again.`);
    error.code = 'RATE_LIMITED';
    error.status = 429;
    throw error;
  }
}

export function recordFailedAttempt(ip, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  const next = entry && entry.until > now ? entry : { count: 0, until: now + windowMs };
  next.count++;
  loginAttempts.set(ip, next);
  if (loginAttempts.size > 2000) {
    for (const [k, v] of loginAttempts.entries()) {
      if (v.until <= now) loginAttempts.delete(k);
    }
  }
}

export function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}
