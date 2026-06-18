const CUSTOMER_ACCOUNTS_KEY = 'ttp_customer_accounts_v1';
const CUSTOMER_SESSION_KEY = 'ttp_customer_session_v1';
const ADMIN_SESSION_KEY = 'ttp_admin_session_v1';
const ADMIN_SECURITY_KEY = 'ttp_admin_security_v1';

const ADMIN_EMAIL = 'admin@tarlactruckparts.local';
const ADMIN_PASSWORD = 'Admin@12345';

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const CUSTOMER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const CUSTOMER_REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

const hasWindow = typeof window !== 'undefined';

const normalizeEmail = (value = '') => value.trim().toLowerCase();

const readJson = (storage, key, fallback) => {
  if (!hasWindow) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (storage, key, value) => {
  if (!hasWindow) return;
  storage.setItem(key, JSON.stringify(value));
};

const removeKey = (key) => {
  if (!hasWindow) return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
};

const generateVerificationCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const encodeBase64Url = (value) =>
  btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

export const validateFullName = (value) => {
  if (!value || value.trim().length < 3) {
    return 'Full name must be at least 3 characters.';
  }

  return '';
};

export const validateContactNumber = (value) => {
  if (!value || !/^\+?[0-9]{7,15}$/.test(value.trim())) {
    return 'Contact number must contain 7 to 15 digits.';
  }

  return '';
};

export const validateEmail = (value) => {
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Enter a valid email address.';
  }

  return '';
};

export const validatePassword = (value) => {
  if (!value || value.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include both letters and numbers.';
  }

  return '';
};

export const validateVerificationCode = (value) => {
  if (!value || !/^\d{6}$/.test(value.trim())) {
    return 'Enter the 6-digit verification code.';
  }

  return '';
};

export const validateRegistrationFields = ({ fullName, contactNumber, email, password }) => {
  const errors = {};

  const fullNameError = validateFullName(fullName);
  const contactError = validateContactNumber(contactNumber);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (fullNameError) errors.fullName = fullNameError;
  if (contactError) errors.contactNumber = contactError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return errors;
};

export const validateLoginFields = ({ email, password }) => {
  const errors = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';

  return errors;
};

export const hashText = async (value) => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return toHex(digest);
  }

  return encodeBase64Url(value);
};

const createToken = async ({ role, email, fullName, rememberMe, expiresAt }) => {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({
    role,
    email,
    fullName,
    rememberMe: !!rememberMe,
    exp: expiresAt
  }));
  const signature = await hashText(`${header}.${payload}.${email}.${role}`);

  return `${header}.${payload}.${signature}`;
};

const getCustomerAccounts = () => readJson(window.localStorage, CUSTOMER_ACCOUNTS_KEY, []);
const setCustomerAccounts = (accounts) => writeJson(window.localStorage, CUSTOMER_ACCOUNTS_KEY, accounts);
const getAdminSecurityState = () => readJson(window.localStorage, ADMIN_SECURITY_KEY, { failedAttempts: 0, lockedUntil: 0 });
const setAdminSecurityState = (state) => writeJson(window.localStorage, ADMIN_SECURITY_KEY, state);

const createSession = async ({ role, email, fullName, rememberMe, ttlMs }) => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ttlMs;
  const token = await createToken({ role, email, fullName, rememberMe, expiresAt });

  return {
    token,
    user: { role, email, fullName },
    rememberMe: !!rememberMe,
    issuedAt,
    expiresAt
  };
};

const persistSession = (key, session, rememberMe) => {
  if (!hasWindow) return;

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

  storage.setItem(key, JSON.stringify(session));
  otherStorage.removeItem(key);
};

const readSession = (key) => {
  if (!hasWindow) return null;

  const session =
    readJson(window.localStorage, key, null) ||
    readJson(window.sessionStorage, key, null);

  if (!session || !session.expiresAt || session.expiresAt <= Date.now()) {
    removeKey(key);
    return null;
  }

  return session;
};

export const clearSession = (role) => {
  if (!role || role === 'customer') {
    removeKey(CUSTOMER_SESSION_KEY);
  }

  if (!role || role === 'admin') {
    removeKey(ADMIN_SESSION_KEY);
  }
};

export const getActiveSession = () => {
  const adminSession = readSession(ADMIN_SESSION_KEY);
  if (adminSession) return adminSession;

  return readSession(CUSTOMER_SESSION_KEY);
};

export const registerCustomer = async ({ fullName, contactNumber, email, password }) => {
  const errors = validateRegistrationFields({ fullName, contactNumber, email, password });
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const normalizedEmail = normalizeEmail(email);
  const accounts = getCustomerAccounts();

  if (accounts.some((account) => account.email === normalizedEmail)) {
    return { ok: false, errors: { email: 'An account with this email already exists.' } };
  }

  const verificationCode = generateVerificationCode();
  const passwordHash = await hashText(password);

  const account = {
    id: `cust-${Date.now()}`,
    fullName: fullName.trim(),
    contactNumber: contactNumber.trim(),
    email: normalizedEmail,
    passwordHash,
    verified: false,
    verificationCode,
    verificationExpiresAt: Date.now() + VERIFICATION_TTL_MS,
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: new Date().toISOString()
  };

  setCustomerAccounts([account, ...accounts]);

  return {
    ok: true,
    email: normalizedEmail,
    verificationCode,
    message: `Verification email sent to ${normalizedEmail}.`
  };
};

export const resendVerificationCode = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const accounts = getCustomerAccounts();
  const index = accounts.findIndex((account) => account.email === normalizedEmail);

  if (index === -1) {
    return { ok: false, error: 'Account not found.' };
  }

  const verificationCode = generateVerificationCode();
  accounts[index] = {
    ...accounts[index],
    verificationCode,
    verificationExpiresAt: Date.now() + VERIFICATION_TTL_MS
  };

  setCustomerAccounts(accounts);

  return {
    ok: true,
    verificationCode,
    message: `Verification email resent to ${normalizedEmail}.`
  };
};

export const verifyCustomerEmail = ({ email, code }) => {
  const normalizedEmail = normalizeEmail(email);
  const accounts = getCustomerAccounts();
  const index = accounts.findIndex((account) => account.email === normalizedEmail);

  if (index === -1) {
    return { ok: false, error: 'Account not found.' };
  }

  const account = accounts[index];

  if (account.verified) {
    return { ok: true, message: 'Email is already verified.' };
  }

  if (!account.verificationCode || account.verificationExpiresAt <= Date.now()) {
    return { ok: false, error: 'Verification code expired. Request a new code.' };
  }

  if (account.verificationCode !== code.trim()) {
    return { ok: false, error: 'Verification code does not match.' };
  }

  accounts[index] = {
    ...account,
    verified: true,
    verificationCode: null,
    verificationExpiresAt: 0
  };

  setCustomerAccounts(accounts);

  return { ok: true, message: 'Email verified successfully.' };
};

export const loginCustomer = async ({ email, password, rememberMe }) => {
  const errors = validateLoginFields({ email, password });
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const normalizedEmail = normalizeEmail(email);
  const accounts = getCustomerAccounts();
  const index = accounts.findIndex((account) => account.email === normalizedEmail);

  if (index === -1) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  const account = accounts[index];
  const now = Date.now();

  if (account.lockedUntil && account.lockedUntil > now) {
    const minutesLeft = Math.ceil((account.lockedUntil - now) / 60000);
    return {
      ok: false,
      error: `Account locked after multiple failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
      locked: true,
      lockedUntil: account.lockedUntil
    };
  }

  if (!account.verified) {
    return {
      ok: false,
      error: 'Email is not verified yet. Complete verification before logging in.',
      needsVerification: true
    };
  }

  const passwordHash = await hashText(password);
  if (passwordHash !== account.passwordHash) {
    const failedAttempts = (account.failedAttempts || 0) + 1;
    const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;

    accounts[index] = {
      ...account,
      failedAttempts: locked ? 0 : failedAttempts,
      lockedUntil: locked ? now + LOCK_DURATION_MS : 0
    };

    setCustomerAccounts(accounts);

    return {
      ok: false,
      error: locked ? 'Too many failed attempts. Account locked for 15 minutes.' : 'Invalid email or password.'
    };
  }

  const session = await createSession({
    role: 'customer',
    email: account.email,
    fullName: account.fullName,
    rememberMe,
    ttlMs: rememberMe ? CUSTOMER_REMEMBER_ME_TTL_MS : CUSTOMER_SESSION_TTL_MS
  });

  accounts[index] = {
    ...account,
    failedAttempts: 0,
    lockedUntil: 0
  };

  setCustomerAccounts(accounts);
  persistSession(CUSTOMER_SESSION_KEY, session, rememberMe);

  return { ok: true, session };
};

export const loginAdmin = async ({ email, password, rememberMe = false }) => {
  const errors = validateLoginFields({ email, password });
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const adminSecurity = getAdminSecurityState();
  const now = Date.now();

  if (adminSecurity.lockedUntil && adminSecurity.lockedUntil > now) {
    const minutesLeft = Math.ceil((adminSecurity.lockedUntil - now) / 60000);
    return {
      ok: false,
      error: `Admin portal locked after repeated failures. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
      locked: true,
      lockedUntil: adminSecurity.lockedUntil
    };
  }

  const [submittedEmailHash, submittedPasswordHash, expectedEmailHash, expectedPasswordHash] = await Promise.all([
    hashText(normalizeEmail(email)),
    hashText(password),
    hashText(normalizeEmail(ADMIN_EMAIL)),
    hashText(ADMIN_PASSWORD)
  ]);

  if (submittedEmailHash !== expectedEmailHash || submittedPasswordHash !== expectedPasswordHash) {
    const failedAttempts = (adminSecurity.failedAttempts || 0) + 1;
    const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;

    setAdminSecurityState({
      failedAttempts: locked ? 0 : failedAttempts,
      lockedUntil: locked ? now + LOCK_DURATION_MS : 0
    });

    return {
      ok: false,
      error: locked ? 'Too many failed admin login attempts. Access is temporarily locked.' : 'Invalid admin credentials.'
    };
  }

  const session = await createSession({
    role: 'admin',
    email: ADMIN_EMAIL,
    fullName: 'System Admin',
    rememberMe,
    ttlMs: ADMIN_SESSION_TTL_MS
  });

  setAdminSecurityState({ failedAttempts: 0, lockedUntil: 0 });
  persistSession(ADMIN_SESSION_KEY, session, rememberMe);

  return { ok: true, session };
};

export const getVerificationNotice = (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  return `Verification email sent to ${normalizedEmail}. Demo code: ${code}`;
};
