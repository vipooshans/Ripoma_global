/**
 * Customer portal auth configuration.
 *
 * CUSTOMER_REQUIRE_EMAIL_VERIFICATION
 *   Development: off by default; set to "true" to enforce verification locally.
 *   Production: on by default; set to "false" to allow login before verifying.
 */

const isEmailVerificationRequired = () => {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.CUSTOMER_REQUIRE_EMAIL_VERIFICATION === 'true';
  }
  return process.env.CUSTOMER_REQUIRE_EMAIL_VERIFICATION !== 'false';
};

const DEV_ACCESS_FALLBACK = 'ripoma_customer_access_secret_12345';
const DEV_REFRESH_FALLBACK = 'ripoma_customer_refresh_secret_67890';
const DEV_FRONTEND_URL = 'http://localhost:5173';

const requireProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['CUSTOMER_JWT_SECRET', 'CUSTOMER_JWT_REFRESH_SECRET', 'FRONTEND_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `[FATAL] Missing required environment variables for customer auth: ${missing.join(', ')}`
    );
    process.exit(1);
  }
};

const getCustomerJwtSecret = () =>
  process.env.CUSTOMER_JWT_SECRET ||
  (process.env.NODE_ENV === 'production' ? undefined : DEV_ACCESS_FALLBACK);

const getCustomerRefreshSecret = () =>
  process.env.CUSTOMER_JWT_REFRESH_SECRET ||
  (process.env.NODE_ENV === 'production' ? undefined : DEV_REFRESH_FALLBACK);

const getFrontendUrl = () =>
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? undefined : DEV_FRONTEND_URL);

module.exports = {
  requireProductionEnv,
  getCustomerJwtSecret,
  getCustomerRefreshSecret,
  getFrontendUrl,
  isEmailVerificationRequired
};
