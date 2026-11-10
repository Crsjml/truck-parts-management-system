// Mirrors backend/src/utils/recordFormats.js — the server is authoritative.
export const SKU_PATTERN = /^[A-Z]{3}-[A-Z]{3}-\d{5}$/;
export const SKU_FORMAT_MESSAGE = 'SKU must look like CAT-PRT-##### (e.g. BRK-PAD-00012).';

/** @param {unknown} value @returns {string} trimmed, uppercase */
export const normalizeSku = (value) => String(value ?? '').trim().toUpperCase();
