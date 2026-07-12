const formatStorefrontOrder = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  items: (order.items || []).map((i) => ({
    productId: i.product,
    sku: i.sku,
    name: i.name,
    qty: i.qty,
    unitPrice: i.unitPrice,
    lineTotal: i.lineTotal,
    image: i.image || null
  })),
  subtotal: order.subtotal,
  discount: order.discount,
  shipping: order.shipping,
  tax: order.tax,
  grandTotal: order.grandTotal,
  currency: order.currency,
  couponCode: order.couponCode || null,
  coupon: order.couponSnapshot || null,
  shippingAddress: order.shippingAddress,
  contact: order.contact,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  customerNote: order.customerNote || '',
  paymentReference: order.paymentReference || null,
  placedAt: order.placedAt || order.createdAt,
  cancelReason: order.cancelReason || '',
  cancellationRequestedAt: order.cancellationRequestedAt || null,
  trackingNumber: order.trackingNumber || null,
  carrier: order.carrier || null,
  estimatedDeliveryDate: order.estimatedDeliveryDate || null,
  trackingUrl: order.trackingUrl || null,
  actualDeliveredAt: order.actualDeliveredAt || null,
  statusHistory: (order.statusHistory || []).map((h) => ({
    status: h.status,
    note: h.note || '',
    at: h.at,
    byRole: h.byRole
  })),
  shipmentUpdates: (order.shipmentUpdates || []).map((u) => ({
    message: u.message,
    at: u.at,
    byRole: u.byRole
  }))
});

module.exports = { formatStorefrontOrder };
