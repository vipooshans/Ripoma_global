/**
 * Global storefront Help FAQs (static config — no CMS for section 16).
 */
const STOREFRONT_FAQS = [
  {
    id: 'shipping-1',
    category: 'shipping',
    question: 'How long does shipping take?',
    answer:
      'Most orders ship within 1–2 business days. Standard delivery typically arrives in 3–7 business days depending on your location. You will receive tracking details once your order ships.'
  },
  {
    id: 'shipping-2',
    category: 'shipping',
    question: 'Do you offer free shipping?',
    answer:
      'Free shipping may apply when your cart meets the current free-shipping threshold shown at checkout. Promotional coupons can also waive shipping fees when eligible.'
  },
  {
    id: 'orders-1',
    category: 'orders',
    question: 'How can I track my order?',
    answer:
      'Sign in and open Account → Orders, or open the order confirmation email link. Shipped orders show carrier, tracking number, and estimated delivery when available.'
  },
  {
    id: 'orders-2',
    category: 'orders',
    question: 'Can I cancel or change an order?',
    answer:
      'You can request cancellation from the order detail page while the order is still eligible. Our team reviews cancel requests. For address changes, contact support as soon as possible with your order number.'
  },
  {
    id: 'payments-1',
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer:
      'We currently support cash on delivery, bank transfer, and card (demo) at checkout. Payment status for each order is shown under Account → Payments.'
  },
  {
    id: 'payments-2',
    category: 'payments',
    question: 'When will I receive an invoice?',
    answer:
      'You can download a PDF invoice from the order detail page at any time after placing an order.'
  },
  {
    id: 'account-1',
    category: 'account',
    question: 'How do I reset my password?',
    answer:
      'Use “Forgot password” on the sign-in page. We will email a reset link to your registered address. Check spam if you do not see it within a few minutes.'
  },
  {
    id: 'account-2',
    category: 'account',
    question: 'Where is my wishlist saved?',
    answer:
      'Wishlist items are saved in your browser on this device. Open the heart icon in the header or Account → Wishlist to manage them.'
  },
  {
    id: 'returns-1',
    category: 'returns',
    question: 'What is your return policy?',
    answer:
      'If an item arrives damaged or incorrect, file a complaint from Help & Support within 7 days and include your order number and photos when possible. Our team will guide next steps.'
  },
  {
    id: 'support-1',
    category: 'support',
    question: 'How do I contact support?',
    answer:
      'Use the Contact or Complaint forms on the Help page, or Message support when signed in. You can also email support@ripomaglobal.com or call during business hours listed in the footer.'
  }
];

const getStorefrontFaqs = () => STOREFRONT_FAQS;

module.exports = { getStorefrontFaqs, STOREFRONT_FAQS };
