export const NOTIFICATION_TYPES = {
  // Orders
  po_submitted: { label: 'PO Submitted', icon: '📝', color: 'text-blue-500 bg-blue-50' },
  po_approved: { label: 'PO Approved', icon: '✅', color: 'text-emerald-500 bg-emerald-50' },
  po_rejected: { label: 'PO Rejected', icon: '❌', color: 'text-rose-500 bg-rose-50' },
  po_received: { label: 'PO Received', icon: '📦', color: 'text-indigo-500 bg-indigo-50' },
  so_confirmed: { label: 'SO Confirmed', icon: '💼', color: 'text-teal-500 bg-teal-50' },
  so_dispatched: { label: 'SO Dispatched', icon: '🚚', color: 'text-cyan-500 bg-cyan-50' },
  so_delivered: { label: 'SO Delivered', icon: '🏁', color: 'text-emerald-500 bg-emerald-50' },
  
  // Shipments & logistics
  shipment_delayed: { label: 'Shipment Delayed', icon: '⚠️', color: 'text-amber-500 bg-amber-50' },
  shipment_delivered: { label: 'Shipment Delivered', icon: '🏁', color: 'text-emerald-500 bg-emerald-50' },
  shipment_customs_hold: { label: 'Customs Hold', icon: '🛑', color: 'text-rose-500 bg-rose-50' },
  carrier_update: { label: 'Carrier Update', icon: '📍', color: 'text-sky-500 bg-sky-50' },
  
  // Inventory
  low_stock: { label: 'Low Stock Alert', icon: '📉', color: 'text-amber-500 bg-amber-50' },
  out_of_stock: { label: 'Out of Stock', icon: '🚫', color: 'text-rose-500 bg-rose-50' },
  stock_expiring: { label: 'Stock Expiring', icon: '⏳', color: 'text-orange-500 bg-orange-50' },
  
  // Finance
  invoice_overdue: { label: 'Invoice Overdue', icon: '💸', color: 'text-rose-500 bg-rose-50' },
  payment_overdue: { label: 'Payment Overdue', icon: '💸', color: 'text-rose-500 bg-rose-50' },
  payment_received: { label: 'Payment Received', icon: '💰', color: 'text-emerald-500 bg-emerald-50' },
  credit_limit_exceeded: { label: 'Credit Limit Exceeded', icon: '🚨', color: 'text-red-500 bg-red-50' },
  
  // Documents
  document_expiring: { label: 'Document Expiring', icon: '📅', color: 'text-amber-500 bg-amber-50' },
  document_uploaded: { label: 'Document Uploaded', icon: '📤', color: 'text-blue-500 bg-blue-50' },
  
  // Tax & compliance
  tax_due: { label: 'Tax Due', icon: '⚖️', color: 'text-purple-500 bg-purple-50' },
  duty_due: { label: 'Duty Due', icon: '⚖️', color: 'text-violet-500 bg-violet-50' },
  
  // System
  user_added: { label: 'New User Added', icon: '👤', color: 'text-indigo-500 bg-indigo-50' },
  role_changed: { label: 'Role Changed', icon: '🔑', color: 'text-amber-500 bg-amber-50' },
  report_ready: { label: 'Report Ready', icon: '📊', color: 'text-emerald-500 bg-emerald-50' },
  scheduled_report_sent: { label: 'Digest Sent', icon: '📧', color: 'text-teal-500 bg-teal-50' },
  
  // Reminders
  reminder: { label: 'Reminder', icon: '⏰', color: 'text-teal-600 bg-teal-50 border-teal-100' }
};

export const getNotificationStyle = (type, severity) => {
  const config = NOTIFICATION_TYPES[type] || { label: 'System Alert', icon: '🔔', color: 'text-gray-500 bg-gray-50' };
  
  // Override color if severity is error/warning
  if (severity === 'error') {
    return { ...config, color: 'text-rose-600 bg-rose-50 border border-rose-100' };
  }
  if (severity === 'warning') {
    return { ...config, color: 'text-amber-600 bg-amber-50 border border-amber-100' };
  }
  if (severity === 'success') {
    return { ...config, color: 'text-emerald-600 bg-emerald-50 border border-emerald-100' };
  }
  
  return config;
};
