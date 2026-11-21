import { createHmac, createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSetting, setSetting, recordAuditEntry } from './finance-db.js';

const COOKIE = 'mjm_fees_admin';
const SESSION_SECONDS = 4 * 60 * 60; // 4 hours
const loginAttempts = new Map();

/**
 * Checks whether an admin password has been configured in env or secure storage.
 */
export function isPasswordConfigured() {
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
    return true;
  }
  const hash = getSetting('admin_password_hash');
  const salt = getSetting('admin_password_salt');
  return Boolean(hash && salt);
}

/**
 * Derives a PBKDF2-SHA512 hash for a password using a salt.
 */
function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Verifies a candidate password against either process.env.ADMIN_PASSWORD or stored PBKDF2 hash.
 */
export function verifyAdminPassword(candidate) {
  if (!candidate || typeof candidate !== 'string') return false;

  // 1. Check environment variable first if provided
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
    const a = createHash('sha256').update(candidate).digest();
    const b = createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
    return timingSafeEqual(a, b) && candidate.length === process.env.ADMIN_PASSWORD.length;
  }

  // 2. Check PBKDF2 hash in secure database
  const storedHash = getSetting('admin_password_hash');
  const storedSalt = getSetting('admin_password_salt');
  if (!storedHash || !storedSalt) {
    return false;
  }

  const candidateHash = hashPassword(candidate, storedSalt);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Sets the initial master admin password.
 * Strictly prevents overwriting an existing password.
 */
export function setAdminPassword(newPassword, clientIp = 'Unknown') {
  if (isPasswordConfigured()) {
    const error = new Error('Admin password has already been configured. Cannot overwrite.');
    error.code = 'PASSWORD_ALREADY_SET';
    error.status = 403;
    throw error;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.code = 'PASSWORD_TOO_SHORT';
    error.status = 400;
    throw error;
  }

  if (newPassword.length > 200) {
    const error = new Error('Password is too long (maximum 200 characters).');
    error.code = 'PASSWORD_TOO_LONG';
    error.status = 400;
    throw error;
  }

  const salt = randomBytes(32).toString('hex');
  const hash = hashPassword(newPassword, salt);
  const sessionSecret = randomBytes(64).toString('hex');

  setSetting('admin_password_salt', salt);
  setSetting('admin_password_hash', hash);
  setSetting('admin_session_secret', sessionSecret);
  setSetting('admin_password_created_at', new Date().toISOString());

  recordAuditEntry({
    actor: 'Owner Initial Setup',
    action: 'CREATE_ADMIN_PASSWORD',
    entity: 'Authentication',
    details: 'Master admin password successfully configured with PBKDF2-SHA512 encryption.',
    ip_address: clientIp
  });

  return true;
}

/**
 * Returns secret used to sign HMAC session tokens.
 */
function getSessionSigningSecret() {
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
    return process.env.ADMIN_PASSWORD;
  }
  let secret = getSetting('admin_session_secret');
  if (!secret) {
    secret = getSetting('admin_password_hash');
  }
  return secret || '';
}

/**
 * Signs a session payload using HMAC-SHA256.
 */
export function signSessionPayload(payload) {
  const secret = getSessionSigningSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Creates Set-Cookie header for authenticated admin session.
 */
export function makeSessionCookie(age = SESSION_SECONDS) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + age })
  ).toString('base64url');
  const signature = signSessionPayload(payload);
  const token = `${payload}.${signature}`;
  const isProd = process.env.NODE_ENV === 'production';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${age}`;
}

/**
 * Creates Set-Cookie header to clear session cookie on logout.
 */
export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Verifies if the incoming request has a valid, non-expired admin session.
 */
export function hasAdminSession(request) {
  const secret = getSessionSigningSecret();
  if (!secret) return false;

  const cookieHeader = request.headers.get('cookie') || '';
  const value = cookieHeader
    .split(';')
    .map(p => p.trim())
    .find(p => p.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);

  if (!value) return false;

  try {
    const [payload, signature, ...rest] = decodeURIComponent(value).split('.');
    if (!payload || !signature || rest.length) return false;

    const expected = signSessionPayload(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

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
