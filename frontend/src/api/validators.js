export const validateFullName = (value) => {
  if (!value || value.trim().length < 3) return 'Full name must be at least 3 characters.';
  return '';
};

export const validateContactNumber = (value) => {
  if (!value) return 'Contact number is required.';
  const stripped = value.replace(/\s+/g, '');
  if (!/^(\+63|0)[0-9]{10}$/.test(stripped)) {
    return 'Must be a valid PH number (e.g., 0917 123 4567 or +63 917 123 4567).';
  }
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
