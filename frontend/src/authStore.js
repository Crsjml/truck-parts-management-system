/**
 * authStore.js — barrel re-export.
 *
 * All API, validation, and auth logic now lives in:
 *   api/apiClient.js    — HTTP methods + token management
 *   api/validators.js   — field validation helpers
 *
 * This file re-exports everything so existing imports still work.
 */

import { supabase } from './supabaseClient';
import { apiGet, apiPost, apiPut, apiDelete, invalidateToken } from "./api/apiClient";
import {
  validateEmail,
  validateLoginFields,
  validateRegistrationFields,
  validateVerificationCode,
} from "./api/validators";

export {
  validateEmail,
  validateLoginFields,
  validateRegistrationFields,
  validateVerificationCode,
};

const CUSTOMER_SESSION_KEY = 'ttp_customer_session_v1';
const ADMIN_SESSION_KEY    = 'ttp_admin_session_v1';
const ADMIN_SECURITY_KEY   = 'ttp_admin_security_v1';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 15 * 60 * 1000;

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

// ── JWT decode ───────────────────────────────────────────────────────────────

function decode_jwt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

// ── API helpers ──────────────────────────────────────────────────────────────

const api = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

const apiCatch = (fn) => async (...args) => {
  try {
    const { ok, data } = await fn(...args);
    return ok ? data : [];
  } catch (err) {
    console.error(`Failed: ${fn.name}`, err);
    return [];
  }
};

// ── Parts & Categories fetching ─────────────────────────────────────────────

export const fetchParts = async (search = '', category = 'All', filters = {}) => {
  try {
    let query = '';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.series) params.append('series', filters.series);
    if (filters.engineCode) params.append('engineCode', filters.engineCode);
    if (params.toString()) query = `?${params.toString()}`;

    const { ok, data } = await apiGet(`/api/parts${query}`, { supabase });
    return ok ? (data.data || data) : [];
  } catch (err) {
    console.error('Failed to fetch parts:', err);
    return [];
  }
};

export const fetchCategories = async () => {
  try {
    const { ok, data } = await apiGet('/api/parts/categories', { supabase });
    return ok ? ['All', ...data.filter(c => c !== 'All')] : ['All'];
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return ['All'];
  }
};

export const fetchVehicleOptions = async () => {
  try {
    const { ok, data } = await apiGet('/api/parts/vehicle-options', { supabase });
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch vehicle options:', err);
    return [];
  }
};

// ── Customer Profile ─────────────────────────────────────────────────────────

export const fetchCustomerProfile = async () => {
  try {
    const { ok, data } = await apiGet('/api/customers/me', { supabase });
    return ok ? data : null;
  } catch (err) {
    console.error('Failed to fetch customer profile:', err);
    return null;
  }
};

export const updateCustomerProfile = async (profileData) => {
  try {
    const { ok, data } = await apiPut('/api/customers/me', profileData, { supabase });
    return ok ? data : null;
  } catch (err) {
    console.error('Failed to update customer profile:', err);
    throw err;
  }
};

// ── Staff & Roles Management ──────────────────────────────────────────────

export const fetchStaffRoles = async () => {
  try {
    const { ok, data } = await apiGet('/api/staff', { supabase });
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch staff roles:', err);
    return [];
  }
};

export const checkStaffRole = async (email) => {
  try {
    const { ok, data } = await apiPost('/api/staff/check', { email }, { supabase });
    return ok ? data : null;
  } catch (err) {
    console.error('Failed to check staff role:', err);
    return null;
  }
};

export const createStaffRole = api(async (payload) => {
  const { ok, data } = await apiPost('/api/staff', payload, { supabase });
  return ok ? { ok: true, data } : { ok: false, error: data.msg || 'Failed to add staff' };
});

export const updateStaffRole = api(async (id, payload) => {
  const { ok, data } = await apiPut(`/api/staff/${id}`, payload, { supabase });
  return ok ? { ok: true, data } : { ok: false, error: data.msg || 'Failed to update staff' };
});

export const deleteStaffRole = api(async (id) => {
  const { ok, data } = await apiDelete(`/api/staff/${id}`, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to delete staff' };
});

// ── Session management ───────────────────────────────────────────────────────

const clearSession = (role) => {
  if (!role || role === 'customer') removeKey(CUSTOMER_SESSION_KEY);
  if (!role || role === 'admin')    removeKey(ADMIN_SESSION_KEY);
};

const getActiveSession = () => {
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
    const { ok, data } = await apiPost('/api/auth/admin/login', {
      email:    email.trim().toLowerCase(),
      password,
    }, { supabase });

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
    const { ok, data } = await apiPost('/api/auth/register', {
      full_name:      fullName.trim(),
      contact_number: contactNumber.trim(),
      email:          email.trim().toLowerCase(),
      password,
    }, { supabase });

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
    const { ok, data } = await apiPost('/api/auth/verify', {
      email: email.trim().toLowerCase(),
      code:  code.trim(),
    }, { supabase });

    if (!ok) return { ok: false, error: data.msg || 'Verification failed.' };
    return { ok: true, message: data.msg };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Resend verification code ─────────────────────────────────────────────────

export const resendVerificationCode = async (email) => {
  try {
    const { ok, data } = await apiPost('/api/auth/resend-verify', {
      email: email.trim().toLowerCase(),
    }, { supabase });

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
    const { ok, status, data } = await apiPost('/api/auth/login', {
      email:    email.trim().toLowerCase(),
      password,
    }, { supabase });

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
    const { ok, data } = await apiPost('/api/auth/reset-request', {
      email: email.trim().toLowerCase(),
    }, { supabase });
    if (!ok) return { ok: false, error: data.msg || 'Failed to request reset.' };
    return {
      ok:         true,
      message:    data.msg,
      resetToken: data.reset_token,
    };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Password reset apply ─────────────────────────────────────────────────────

export const resetPassword = async ({ token, password }) => {
  try {
    const { ok, data } = await apiPost(`/api/auth/reset/${token}`, { password }, { supabase });
    if (!ok) return { ok: false, error: data.msg || 'Password reset failed.' };
    return { ok: true, message: data.msg };
  } catch {
    return { ok: false, error: 'Could not reach the backend server. Is it running?' };
  }
};

// ── Change Password (Authenticated) ──────────────────────────────────────────

export const changePassword = async ({ email, currentPassword, newPassword }) => {
  try {
    const { ok, data } = await apiPost('/api/auth/change-password', {
      email: email.trim().toLowerCase(),
      current_password: currentPassword,
      new_password: newPassword,
    }, { supabase });
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
    const { ok, data } = await apiGet('/api/categories', { supabase });
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch categories list:', err);
    return [];
  }
};

export const createCategory = api(async ({ name, parentCategory, iconName, colorTheme }) => {
  const { ok, data } = await apiPost('/api/categories', { name, parentCategory, iconName, colorTheme }, { supabase });
  return ok ? { ok: true, category: data } : { ok: false, error: data.msg || 'Failed to create category.' };
});

export const updateCategory = api(async (id, { name, parentCategory, iconName, colorTheme }) => {
  const { ok, data } = await apiPut(`/api/categories/${id}`, { name, parentCategory, iconName, colorTheme }, { supabase });
  return ok ? { ok: true, category: data } : { ok: false, error: data.msg || 'Failed to update category.' };
});

export const deleteCategory = api(async (id) => {
  const { ok, data } = await apiDelete(`/api/categories/${id}`, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to delete category.' };
});

// ── Parts CRUD ───────────────────────────────────────────────────────────────

export const createPart = api(async (partData) => {
  const { ok, data } = await apiPost('/api/parts', partData, { supabase });
  return ok ? { ok: true, part: data } : { ok: false, error: data.msg || 'Failed to create part.' };
});

export const updatePart = api(async (id, partData) => {
  const { ok, data } = await apiPut(`/api/parts/${id}`, partData, { supabase });
  return ok ? { ok: true, part: data } : { ok: false, error: data.msg || 'Failed to update part.' };
});

export const deletePart = api(async (id) => {
  const { ok, data } = await apiDelete(`/api/parts/${id}`, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to delete part.' };
});

// ── Transactions ─────────────────────────────────────────────────────────────

export const createTransaction = api(async (txData) => {
  const { ok, data } = await apiPost('/api/transactions', txData, { supabase });
  return ok ? { ok: true, transaction: data.transaction } : { ok: false, error: data.msg || 'Failed to create transaction.' };
});

export const fetchTransactions = apiCatch(async () => {
  return await apiGet('/api/transactions', { supabase });
});

// ── Settings & Adjustments ───────────────────────────────────────────────────

export const fetchSettings = async () => {
  try {
    const { ok, data } = await apiGet('/api/settings', { supabase });
    return ok ? data : null;
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    return null;
  }
};

export const updateSettings = api(async (settingsData) => {
  const { ok, data } = await apiPost('/api/settings', settingsData, { supabase });
  return ok ? { ok: true, settings: data } : { ok: false, error: data.msg || 'Failed to update settings.' };
});

export const bulkAdjustPrices = api(async (percentage) => {
  const { ok, data } = await apiPost('/api/parts/bulk-adjust', { percentage }, { supabase });
  return ok ? { ok: true, message: data.msg } : { ok: false, error: data.msg || 'Failed to bulk adjust prices.' };
});

// ── Suppliers ────────────────────────────────────────────────────────────────

export const fetchSuppliers = async (archived = false) => {
  try {
    const { ok, data } = await apiGet(`/api/suppliers${archived ? '?archived=true' : ''}`, { supabase });
    return ok ? data : [];
  } catch (err) {
    console.error('Failed to fetch suppliers:', err);
    return [];
  }
};

export const createSupplier = api(async (supplierData) => {
  const { ok, data } = await apiPost('/api/suppliers', supplierData, { supabase });
  return ok ? { ok: true, supplier: data } : { ok: false, error: data.msg || 'Failed to create supplier.' };
});

export const updateSupplier = api(async (id, supplierData) => {
  const { ok, data } = await apiPut(`/api/suppliers/${id}`, supplierData, { supabase });
  return ok ? { ok: true, supplier: data } : { ok: false, error: data.msg || 'Failed to update supplier.' };
});

export const archiveSupplier = api(async (id) => {
  const { ok, data } = await apiDelete(`/api/suppliers/${id}`, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to archive supplier.' };
});

export const restoreSupplier = api(async (id) => {
  const { ok, data } = await apiPut(`/api/suppliers/${id}/restore`, {}, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to restore supplier.' };
});

export const deleteSupplier = archiveSupplier;

// ── Purchase Orders ──────────────────────────────────────────────────────────

export const fetchPurchaseOrders = apiCatch(async () => {
  return await apiGet('/api/purchase-orders', { supabase });
});

export const createPurchaseOrder = api(async (poData) => {
  const { ok, data } = await apiPost('/api/purchase-orders', poData, { supabase });
  return ok ? { ok: true, purchaseOrder: data } : { ok: false, error: data.msg || 'Failed to create Purchase Order.' };
});

export const updatePurchaseOrderStatus = api(async (id, status) => {
  const { ok, data } = await apiPut(`/api/purchase-orders/${id}/status`, { status }, { supabase });
  return ok ? { ok: true, purchaseOrder: data } : { ok: false, error: data.msg || 'Failed to update PO status.' };
});

export const updatePoBillingStatus = api(async (id, billingStatus) => {
  const { ok, data } = await apiPut(`/api/purchase-orders/${id}/billing`, { billingStatus }, { supabase });
  return ok ? { ok: true, purchaseOrder: data } : { ok: false, error: data.msg || 'Failed to update billing status.' };
});

// ── Parts (extended) ─────────────────────────────────────────────────────────

export const togglePartPublished = api(async (id, published) => {
  const { ok, data } = await apiPut(`/api/parts/${id}/published`, { published }, { supabase });
  return ok ? { ok: true, published: data.published } : { ok: false, error: data.msg };
});

export const restorePart = api(async (id) => {
  const { ok, data } = await apiPut(`/api/parts/${id}/restore`, {}, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg };
});

// ── Reviews ──────────────────────────────────────────────────────────────────

export const fetchReviews = async (partId) => {
  try {
    const { ok, data } = await apiGet(`/api/reviews/${partId}`, { supabase });
    return ok ? data : { reviews: [], stats: { totalReviews: 0, averageRating: 0 } };
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    return { reviews: [], stats: { totalReviews: 0, averageRating: 0 } };
  }
};

export const createReview = api(async (reviewData) => {
  const { ok, data } = await apiPost('/api/reviews', reviewData, { supabase });
  return ok ? { ok: true, review: data } : { ok: false, error: data.msg || 'Failed to submit review.' };
});

export const deleteReview = api(async (id) => {
  const { ok, data } = await apiDelete(`/api/reviews/${id}`, { supabase });
  return ok ? { ok: true } : { ok: false, error: data.msg || 'Failed to delete review.' };
});
