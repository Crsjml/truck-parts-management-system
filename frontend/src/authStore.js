/**
 * authStore.js
 *
 * All auth flows (admin + customer) now go through the backend API.
 * Nothing is hardcoded. Sessions are stored in localStorage/sessionStorage
 * as lightweight wrappers around the JWT returned by the backend.
 */

const CUSTOMER_SESSION_KEY = 'ttp_customer_session_v1';
const ADMIN_SESSION_KEY    = 'ttp_admin_session_v1';
const ADMIN_SECURITY_KEY   = 'ttp_admin_security_v1';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 15 * 60 * 1000; // 15 min

const hasWindow = typeof window !== 'undefined';

// ── Storage helpers ──────────────────────────────────────────────────────────

const readJson = (storage, key, fallback) => {
  if (!hasWindow) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const removeKey = (key) => {
  if (!hasWindow) return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
};

const persistSession = (key, session, rememberMe) => {
  if (!hasWindow) return;
  const storage      = rememberMe ? window.localStorage : window.sessionStorage;
  const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;
  storage.setItem(key, JSON.stringify(session));
  otherStorage.removeItem(key);
};

const readSession = (key) => {
  if (!hasWindow) return null;
  const session =
    readJson(window.localStorage,   key, null) ||
    readJson(window.sessionStorage, key, null);
  if (!session || !session.expiresAt || session.expiresAt <= Date.now()) {
    removeKey(key);
    return null;
  }
  return session;
};

const getAdminSecurityState = () =>
  readJson(window.localStorage, ADMIN_SECURITY_KEY, { failedAttempts: 0, lockedUntil: 0 });

const setAdminSecurityState = (state) => {
  if (!hasWindow) return;
  window.localStorage.setItem(ADMIN_SECURITY_KEY, JSON.stringify(state));
};

// ── JWT decode helper ────────────────────────────────────────────────────────

function decode_jwt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

// ── API base URL ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function getAuthHeaders() {
  const session = readSession(ADMIN_SESSION_KEY) || readSession(CUSTOMER_SESSION_KEY);
  if (session && session.token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`
    };
  }
  return { 'Content-Type': 'application/json' };
}

async function api_post(path, body, timeout_ms = 8000) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: getAuthHeaders(),
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(timeout_ms),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function api_put(path, body, timeout_ms = 8000) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'PUT',
    headers: getAuthHeaders(),
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(timeout_ms),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function api_delete(path, timeout_ms = 8000) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'DELETE',
    headers: getAuthHeaders(),
    signal:  AbortSignal.timeout(timeout_ms),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function api_get(path, timeout_ms = 8000) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'GET',
    headers: getAuthHeaders(),
    signal:  AbortSignal.timeout(timeout_ms),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── Parts & Categories fetching ─────────────────────────────────────────────

export const fetchParts = async (search = '', category = 'All') => {
  try {
    let query = '';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);
    if (params.toString()) query = `?${params.toString()}`;
    
    const { ok, data } = await api_get(`/api/parts${query}`);
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch parts:', err);
    return [];
  }
};

export const fetchCategories = async () => {
  try {
    const { ok, data } = await api_get('/api/parts/categories');
    return ok ? ['All', ...data.filter(c => c !== 'All')] : ['All'];
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return ['All'];
  }
};

// ── Validation helpers (used by UI) ─────────────────────────────────────────

export const validateFullName = (value) => {
  if (!value || value.trim().length < 3) return 'Full name must be at least 3 characters.';
  return '';
};

export const validateContactNumber = (value) => {
  if (!value || !/^\+?[0-9]{7,15}$/.test(value.trim()))
    return 'Contact number must contain 7 to 15 digits.';
  return '';
};

export const validateEmail = (value) => {
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return 'Enter a valid email address.';
  return '';
};

export const validatePassword = (value) => {
  if (!value || value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value))
    return 'Password must include both letters and numbers.';
  return '';
};

export const validateVerificationCode = (value) => {
  if (!value || !/^\d{6}$/.test(value.trim())) return 'Enter the 6-digit verification code.';
  return '';
};

export const validateRegistrationFields = ({ fullName, contactNumber, email, password }) => {
  const errors = {};
  const fn = validateFullName(fullName);
  const cn = validateContactNumber(contactNumber);
  const em = validateEmail(email);
  const pw = validatePassword(password);
  if (fn) errors.fullName       = fn;
  if (cn) errors.contactNumber  = cn;
  if (em) errors.email          = em;
  if (pw) errors.password       = pw;
  return errors;
};

export const validateLoginFields = ({ email, password }) => {
  const errors = {};
  const em = validateEmail(email);
  if (em) errors.email = em;
  if (!password) errors.password = 'Password is required.';
  return errors;
};

// ── Session management ───────────────────────────────────────────────────────

export const clearSession = (role) => {
  if (!role || role === 'customer') removeKey(CUSTOMER_SESSION_KEY);
  if (!role || role === 'admin')    removeKey(ADMIN_SESSION_KEY);
};

export const getActiveSession = () => {
  const admin = readSession(ADMIN_SESSION_KEY);
  if (admin) return admin;
  return readSession(CUSTOMER_SESSION_KEY);
};

// ── Admin login ──────────────────────────────────────────────────────────────

export const loginAdmin = async ({ email, password }) => {
  const errors = validateLoginFields({ email, password });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const security = getAdminSecurityState();
  const now      = Date.now();

  if (security.lockedUntil && security.lockedUntil > now) {
    const minutes_left = Math.ceil((security.lockedUntil - now) / 60000);
    return {
      ok: false,
      error: `Admin portal locked after repeated failures. Try again in ${minutes_left} minute${minutes_left > 1 ? 's' : ''}.`,
      locked: true,
    };
  }

  try {
    const { ok, data } = await api_post('/api/auth/admin/login', {
      email:    email.trim().toLowerCase(),
      password,
    });

    if (!ok) {
      const failed_attempts = (security.failedAttempts || 0) + 1;
      const locked          = failed_attempts >= MAX_FAILED_ATTEMPTS;
      setAdminSecurityState({
        failedAttempts: locked ? 0 : failed_attempts,
        lockedUntil:    locked ? now + LOCK_DURATION_MS : 0,
      });
      return {
        ok: false,
        error: locked
          ? 'Too many failed admin login attempts. Access is temporarily locked.'
          : data.msg || 'Invalid admin credentials.',
      };
    }

    const payload = decode_jwt(data.token);
    const session = {
      token:     data.token,
      user:      { role: 'admin', email: email.trim().toLowerCase(), fullName: payload.full_name || 'System Admin' },
      issuedAt:  now,
      expiresAt: (payload.exp || 0) * 1000,
    };

    setAdminSecurityState({ failedAttempts: 0, lockedUntil: 0 });
    persistSession(ADMIN_SESSION_KEY, session, false);

    return { ok: true, session };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Customer registration ────────────────────────────────────────────────────

export const registerCustomer = async ({ fullName, contactNumber, email, password }) => {
  const errors = validateRegistrationFields({ fullName, contactNumber, email, password });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    const { ok, data } = await api_post('/api/auth/register', {
      full_name:      fullName.trim(),
      contact_number: contactNumber.trim(),
      email:          email.trim().toLowerCase(),
      password,
    });

    if (!ok) {
      if (data.msg?.toLowerCase().includes('email already')) {
        return { ok: false, errors: { email: data.msg } };
      }
      return { ok: false, error: data.msg || 'Registration failed. Please try again.' };
    }

    return {
      ok:               true,
      email:            data.email,
      verificationCode: data.verification_code,
      message:          data.msg,
    };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Verify email ─────────────────────────────────────────────────────────────

export const verifyCustomerEmail = async ({ email, code }) => {
  try {
    const { ok, data } = await api_post('/api/auth/verify', {
      email: email.trim().toLowerCase(),
      code:  code.trim(),
    });

    if (!ok) return { ok: false, error: data.msg || 'Verification failed.' };
    return { ok: true, message: data.msg };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Resend verification code ─────────────────────────────────────────────────

export const resendVerificationCode = async (email) => {
  try {
    const { ok, data } = await api_post('/api/auth/resend-verify', {
      email: email.trim().toLowerCase(),
    });

    if (!ok) return { ok: false, error: data.msg || 'Failed to resend code.' };
    return {
      ok:               true,
      verificationCode: data.verification_code,
      message:          data.msg,
    };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Customer login ───────────────────────────────────────────────────────────

export const loginCustomer = async ({ email, password, rememberMe }) => {
  const errors = validateLoginFields({ email, password });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    const { ok, status, data } = await api_post('/api/auth/login', {
      email:    email.trim().toLowerCase(),
      password,
    });

    if (!ok) {
      return {
        ok:               false,
        error:            data.msg || 'Login failed.',
        needsVerification: data.needs_verification || false,
        locked:           data.locked || false,
      };
    }

    const payload = decode_jwt(data.token);
    const session = {
      token:     data.token,
      user:      {
        role:          'customer',
        email:         email.trim().toLowerCase(),
        fullName:      data.full_name || payload.full_name || '',
        contactNumber: data.contact_number || payload.contact_number || '',
      },
      issuedAt:  Date.now(),
      expiresAt: (payload.exp || 0) * 1000,
    };

    persistSession(CUSTOMER_SESSION_KEY, session, !!rememberMe);
    return { ok: true, session };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Password reset request ───────────────────────────────────────────────────

export const requestPasswordReset = async (email) => {
  try {
    const { ok, data } = await api_post('/api/auth/reset-request', {
      email: email.trim().toLowerCase(),
    });
    if (!ok) return { ok: false, error: data.msg || 'Failed to request reset.' };
    return {
      ok:         true,
      message:    data.msg,
      resetToken: data.reset_token, // dev-only; in prod this comes via email link
    };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Password reset apply ─────────────────────────────────────────────────────

export const resetPassword = async ({ token, password }) => {
  try {
    const { ok, data } = await api_post(`/api/auth/reset/${token}`, { password });
    if (!ok) return { ok: false, error: data.msg || 'Password reset failed.' };
    return { ok: true, message: data.msg };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Change Password (Authenticated) ──────────────────────────────────────────

export const changePassword = async ({ email, currentPassword, newPassword }) => {
  try {
    const { ok, data } = await api_post('/api/auth/change-password', {
      email: email.trim().toLowerCase(),
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (!ok) return { ok: false, error: data.msg || 'Password change failed.' };
    return { ok: true, message: data.msg };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Verification notice helper (used by UI) ──────────────────────────────────

export const getVerificationNotice = (email, code) =>
  `Verification code sent to ${email}. Demo code: ${code}`;

// ── Categories CRUD ──────────────────────────────────────────────────────────

export const fetchCategoriesList = async () => {
  try {
    const { ok, data } = await api_get('/api/categories');
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch categories list:', err);
    return [];
  }
};

export const createCategory = async ({ name, parentCategory }) => {
  try {
    const { ok, data } = await api_post('/api/categories', { name, parentCategory });
    return ok ? { ok: true, category: data } : { ok: false, error: data.msg || 'Failed to create category.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const updateCategory = async (id, { name, parentCategory }) => {
  try {
    const { ok, data } = await api_put(`/api/categories/${id}`, { name, parentCategory });
    return ok ? { ok: true, category: data } : { ok: false, error: data.msg || 'Failed to update category.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const deleteCategory = async (id) => {
  try {
    const { ok, data } = await api_delete(`/api/categories/${id}`);
    return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to delete category.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// ── Parts CRUD ───────────────────────────────────────────────────────────────

export const createPart = async (partData) => {
  try {
    const { ok, data } = await api_post('/api/parts', partData);
    return ok ? { ok: true, part: data } : { ok: false, error: data.msg || 'Failed to create part.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const updatePart = async (id, partData) => {
  try {
    const { ok, data } = await api_put(`/api/parts/${id}`, partData);
    return ok ? { ok: true, part: data } : { ok: false, error: data.msg || 'Failed to update part.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const deletePart = async (id) => {
  try {
    const { ok, data } = await api_delete(`/api/parts/${id}`);
    return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to delete part.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// ── Transactions ─────────────────────────────────────────────────────────────

export const createTransaction = async (txData) => {
  try {
    const { ok, data } = await api_post('/api/transactions', txData);
    return ok ? { ok: true, transaction: data.transaction } : { ok: false, error: data.msg || 'Failed to create transaction.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const fetchTransactions = async () => {
  try {
    const { ok, data } = await api_get('/api/transactions');
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    return [];
  }
};

// ── Settings & Adjustments ───────────────────────────────────────────────────

export const fetchSettings = async () => {
  try {
    const { ok, data } = await api_get('/api/settings');
    return ok ? data : null;
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    return null;
  }
};

export const updateSettings = async (settingsData) => {
  try {
    const { ok, data } = await api_post('/api/settings', settingsData);
    return ok ? { ok: true, settings: data } : { ok: false, error: data.msg || 'Failed to update settings.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const bulkAdjustPrices = async (percentage) => {
  try {
    const { ok, data } = await api_post('/api/parts/bulk-adjust', { percentage });
    return ok ? { ok: true, message: data.msg } : { ok: false, error: data.msg || 'Failed to bulk adjust prices.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// ── Suppliers ────────────────────────────────────────────────────────────────

export const fetchSuppliers = async (archived = false) => {
  try {
    const { ok, data } = await api_get(`/api/suppliers${archived ? '?archived=true' : ''}`);
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch suppliers:', err);
    return [];
  }
};

export const createSupplier = async (supplierData) => {
  try {
    const { ok, data } = await api_post('/api/suppliers', supplierData);
    return ok ? { ok: true, supplier: data } : { ok: false, error: data.msg || 'Failed to create supplier.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const updateSupplier = async (id, supplierData) => {
  try {
    const { ok, data } = await api_put(`/api/suppliers/${id}`, supplierData);
    return ok ? { ok: true, supplier: data } : { ok: false, error: data.msg || 'Failed to update supplier.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// Soft delete (archive)
export const archiveSupplier = async (id) => {
  try {
    const { ok, data } = await api_delete(`/api/suppliers/${id}`);
    return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to archive supplier.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// Restore archived supplier
export const restoreSupplier = async (id) => {
  try {
    const { ok, data } = await api_put(`/api/suppliers/${id}/restore`, {});
    return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to restore supplier.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// Keep backward compat alias
export const deleteSupplier = archiveSupplier;

// ── Purchase Orders ──────────────────────────────────────────────────────────

export const fetchPurchaseOrders = async () => {
  try {
    const { ok, data } = await api_get('/api/purchase-orders');
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch POs:', err);
    return [];
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    const { ok, data } = await api_post('/api/purchase-orders', poData);
    return ok ? { ok: true, purchaseOrder: data } : { ok: false, error: data.msg || 'Failed to create Purchase Order.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const updatePurchaseOrderStatus = async (id, status) => {
  try {
    const { ok, data } = await api_put(`/api/purchase-orders/${id}/status`, { status });
    return ok ? { ok: true, purchaseOrder: data } : { ok: false, error: data.msg || 'Failed to update PO status.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const updatePoBillingStatus = async (id, billingStatus) => {
  try {
    const { ok, data } = await api_put(`/api/purchase-orders/${id}/billing`, { billingStatus });
    return ok ? { ok: true, purchaseOrder: data } : { ok: false, error: data.msg || 'Failed to update billing status.' };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

// ── Parts (extended) ─────────────────────────────────────────────────────────

export const togglePartPublished = async (id, published) => {
  try {
    const { ok, data } = await api_put(`/api/parts/${id}/published`, { published });
    return ok ? { ok: true, published: data.published } : { ok: false, error: data.msg };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};

export const restorePart = async (id) => {
  try {
    const { ok, data } = await api_put(`/api/parts/${id}/restore`, {});
    return ok ? { ok: true } : { ok: false, error: data.msg };
  } catch {
    return { ok: false, error: 'Server connection failed.' };
  }
};
