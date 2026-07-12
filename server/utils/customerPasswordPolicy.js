/**
 * Customer password strength rules (secure login).
 */
const validateCustomerPassword = (password) => {
  const value = String(password || '');
  if (value.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  if (value.length > 128) {
    return { ok: false, message: 'Password must be at most 128 characters.' };
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return {
      ok: false,
      message: 'Password must include at least one letter and one number.'
    };
  }
  return { ok: true };
};

module.exports = { validateCustomerPassword };
