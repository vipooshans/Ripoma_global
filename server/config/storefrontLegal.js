/**
 * Static legal copy for privacy / terms (no CMS).
 */
const PRIVACY_VERSION = '2026-07-12';

const PRIVACY_SECTIONS = [
  {
    title: 'What we collect',
    body:
      'We collect account details you provide (name, email, phone, company, addresses), order and payment-status records, support messages, and basic technical data such as IP address and browser type used for security and session management.'
  },
  {
    title: 'How we use your data',
    body:
      'We use your information to create and secure your account, process orders, send transactional notifications you allow, prevent fraud and abuse, and improve the storefront experience.'
  },
  {
    title: 'Payments',
    body:
      'We do not collect or store full card numbers on our servers. Cash on delivery and bank transfer are handled offline. The card (demo) option simulates a successful payment without charging a card or transmitting PAN data.'
  },
  {
    title: 'Cookies and local storage',
    body:
      'We use an httpOnly refresh cookie to keep you signed in securely. Cart and wishlist items may be stored in your browser’s local storage on this device.'
  },
  {
    title: 'Your choices',
    body:
      'You can update profile data, notification preferences, export a copy of your account data, or request account deletion from Account → Security. Marketing emails are off by default until you opt in.'
  },
  {
    title: 'Contact',
    body:
      'Privacy questions: support@ripomaglobal.com or use Help & Support on the storefront.'
  }
];

const TERMS_SECTIONS = [
  {
    title: 'Using the storefront',
    body:
      'You must provide accurate registration details and keep your login credentials confidential. Accounts may be suspended for abuse, fraud, or violation of these terms.'
  },
  {
    title: 'Orders and pricing',
    body:
      'Order totals are calculated on our servers from current product prices, shipping rules, and valid coupons. We may refuse or cancel orders that appear fraudulent or erroneous.'
  },
  {
    title: 'Payments',
    body:
      'Available methods include cash on delivery, bank transfer, and a card demo that does not process real charges. You remain responsible for paying amounts due under your chosen method.'
  },
  {
    title: 'Limitation',
    body:
      'The storefront is provided as-is for browsing and ordering. To the extent permitted by law, RIPOMA GLOBAL is not liable for indirect or consequential damages arising from use of the site.'
  }
];

module.exports = {
  PRIVACY_VERSION,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS
};
