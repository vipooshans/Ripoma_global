/**
 * Mongo collection -> D1 table mapping, consumed by scripts/export-mongo-to-d1.mjs.
 *
 * Per entry:
 *   collection  Mongo collection name
 *   table       D1 table name (see d1/schema.sql)
 *   fields      scalar/date/boolean paths -> snake_cased column of the same name
 *   refs        ObjectId reference paths  -> snake_cased column + `_id` suffix
 *   json        nested objects/arrays     -> snake_cased TEXT column with JSON
 *
 * `_id` is always exported as the `id` column (24-char hex).
 * Entries are ordered so foreign-key targets import before their dependents.
 */

export const MAPPINGS = [
  {
    collection: 'counters',
    table: 'counters',
    fields: ['name', 'seq']
  },
  {
    collection: 'roles',
    table: 'roles',
    fields: ['name', 'description', 'createdAt'],
    json: ['permissions']
  },
  {
    collection: 'users',
    table: 'users',
    fields: [
      'name', 'email', 'password', 'role', 'status', 'avatar', 'phone', 'department',
      'lastLogin', 'passwordResetToken', 'passwordResetExpires', 'deleted',
      'createdAt', 'updatedAt'
    ],
    json: ['permissions']
  },
  {
    collection: 'settings',
    table: 'settings',
    fields: ['key', 'createdAt', 'updatedAt'],
    json: ['value']
  },
  {
    collection: 'exchangerates',
    table: 'exchange_rates',
    fields: ['baseCurrency', 'date', 'source', 'fetchedAt', 'createdAt', 'updatedAt'],
    json: ['rates']
  },
  {
    collection: 'categories',
    table: 'categories',
    fields: ['name', 'slug', 'description', 'icon', 'sortOrder', 'createdAt', 'updatedAt'],
    refs: ['parent']
  },
  {
    collection: 'warehouses',
    table: 'warehouses',
    fields: ['name', 'code', 'capacity', 'status', 'createdAt', 'updatedAt'],
    refs: ['manager'],
    json: ['address']
  },
  {
    collection: 'suppliers',
    table: 'suppliers',
    fields: [
      'companyName', 'code', 'type', 'status', 'country', 'website', 'taxId',
      'paymentTerms', 'notes', 'currency', 'leadTimeDays', 'rating', 'deleted',
      'deletedAt', 'createdAt', 'updatedAt'
    ],
    refs: ['createdBy'],
    json: ['address', 'tags', 'contacts', 'bankDetails', 'documents']
  },
  {
    collection: 'customers',
    table: 'customers',
    fields: [
      'companyName', 'code', 'type', 'status', 'country', 'website', 'taxId',
      'paymentTerms', 'notes', 'currency', 'creditLimit', 'outstandingBalance',
      'rating', 'source', 'deleted', 'deletedAt', 'createdAt', 'updatedAt'
    ],
    refs: ['createdBy'],
    json: ['address', 'shippingAddress', 'tags', 'contacts', 'documents']
  },
  {
    collection: 'products',
    table: 'products',
    fields: [
      'sku', 'name', 'description', 'unit', 'unitCost', 'sellingPrice', 'currency',
      'barcode', 'hsCode', 'countryOfOrigin', 'weight', 'brand', 'isFeatured',
      'status', 'lowStockThreshold', 'reorderQuantity', 'deleted', 'createdAt', 'updatedAt'
    ],
    refs: ['category', 'supplier', 'createdBy'],
    json: ['images', 'dimensions', 'tags', 'faqs']
  },
  {
    collection: 'inventoryitems',
    table: 'inventory_items',
    fields: [
      'quantityOnHand', 'quantityReserved', 'lastStockCheck', 'batchNumber',
      'expiryDate', 'location', 'createdAt', 'updatedAt'
    ],
    refs: ['product', 'warehouse']
  },
  {
    collection: 'stockmovements',
    table: 'stock_movements',
    fields: ['type', 'quantity', 'quantityBefore', 'quantityAfter', 'reference', 'note', 'createdAt'],
    refs: ['product', 'warehouse', 'performedBy']
  },
  {
    collection: 'importorders',
    table: 'import_orders',
    fields: [
      'poNumber', 'status', 'priority', 'currency', 'exchangeRate', 'subtotal',
      'taxTotal', 'discountTotal', 'grandTotal', 'shippingCost', 'otherCharges',
      'shippingMethod', 'incoterms', 'orderDate', 'expectedDeliveryDate',
      'actualDeliveryDate', 'paymentStatus', 'paymentTerms', 'amountPaid',
      'notes', 'internalNotes', 'createdAt', 'updatedAt'
    ],
    refs: ['supplier', 'warehouse', 'createdBy'],
    json: ['items', 'deliveryAddress', 'tags', 'documents', 'approvals']
  },
  {
    collection: 'goodsreceipts',
    table: 'goods_receipts',
    fields: ['receiptNumber', 'receivedAt', 'notes', 'createdAt', 'updatedAt'],
    refs: ['importOrder', 'receivedBy', 'warehouse'],
    json: ['items', 'documents']
  },
  {
    collection: 'exportorders',
    table: 'export_orders',
    fields: [
      'orderNumber', 'status', 'priority', 'currency', 'exchangeRate', 'subtotal',
      'taxTotal', 'discountTotal', 'grandTotal', 'shippingCharge', 'otherCharges',
      'shippingMethod', 'incoterms', 'paymentTerms', 'paymentStatus', 'amountPaid',
      'orderDate', 'confirmedDate', 'requestedDeliveryDate', 'estimatedDispatchDate',
      'stockDeductedOnConfirm', 'customerReference', 'notes', 'internalNotes',
      'createdAt', 'updatedAt'
    ],
    refs: ['customer', 'warehouse', 'createdBy'],
    json: ['items', 'billingAddress', 'shippingAddress', 'tags', 'documents', 'timeline']
  },
  {
    collection: 'dispatches',
    table: 'dispatches',
    fields: [
      'dispatchNumber', 'status', 'carrier', 'trackingNumber', 'trackingUrl',
      'shippingMethod', 'dispatchDate', 'estimatedArrival', 'actualArrival',
      'weight', 'volume', 'numberOfPackages', 'notes', 'createdAt', 'updatedAt'
    ],
    refs: ['exportOrder', 'dispatchedBy'],
    json: ['items', 'originAddress', 'destinationAddress', 'documents']
  },
  {
    collection: 'invoices',
    table: 'invoices',
    fields: [
      'invoiceNumber', 'type', 'status', 'issueDate', 'dueDate', 'paidDate',
      'currency', 'subtotal', 'taxTotal', 'discountTotal', 'grandTotal', 'amountDue',
      'shippingCharge', 'amountPaid', 'paymentInstructions', 'notes', 'pdfUrl',
      'createdAt', 'updatedAt'
    ],
    refs: ['exportOrder', 'customer', 'createdBy'],
    json: ['items']
  },
  {
    collection: 'expenses',
    table: 'expenses',
    fields: [
      'expenseNumber', 'title', 'category', 'amount', 'currency', 'exchangeRate',
      'amountInBaseCurrency', 'status', 'paymentStatus', 'expenseDate', 'vendor',
      'invoiceReference', 'receiptUrl', 'rejectionReason', 'approvedAt',
      'createdAt', 'updatedAt'
    ],
    refs: ['importOrder', 'exportOrder', 'shipment', 'approvedBy', 'submittedBy']
  },
  {
    collection: 'payments',
    table: 'payments',
    fields: [
      'paymentNumber', 'type', 'status', 'counterpartyType', 'counterpartyId',
      'counterpartyName', 'amount', 'currency', 'exchangeRate', 'amountInBaseCurrency',
      'paymentMethod', 'referenceNumber', 'bankAccount', 'paymentDate', 'dueDate',
      'isOverdue', 'notes', 'createdAt', 'updatedAt'
    ],
    refs: ['importOrder', 'exportOrder', 'invoice', 'expense', 'recordedBy'],
    json: ['attachments']
  },
  {
    collection: 'taxdutyrecords',
    table: 'tax_duty_records',
    fields: [
      'recordNumber', 'type', 'status', 'country', 'hsCode', 'description',
      'taxableValue', 'rate', 'amount', 'currency', 'amountInBaseCurrency',
      'dueDate', 'filedDate', 'paidDate', 'dueAlertSent', 'referenceNumber',
      'notes', 'createdAt', 'updatedAt'
    ],
    refs: ['importOrder', 'exportOrder', 'shipment', 'recordedBy'],
    json: ['attachments']
  },
  {
    collection: 'customeraccounts',
    table: 'customer_accounts',
    fields: [
      'firstName', 'lastName', 'email', 'phone', 'password', 'googleId',
      'companyName', 'companyDetails', 'status', 'emailVerified',
      'emailVerificationToken', 'emailVerificationExpires', 'passwordResetToken',
      'passwordResetExpires', 'lastLogin', 'failedLoginAttempts', 'lockUntil',
      'privacyConsentAt', 'privacyConsentVersion', 'deletedAt', 'createdAt', 'updatedAt'
    ],
    refs: ['linkedCustomer'],
    json: ['shippingAddress', 'billingAddress', 'notificationPrefs']
  },
  {
    collection: 'customersessions',
    table: 'customer_sessions',
    fields: [
      'refreshTokenHash', 'userAgent', 'ip', 'lastActiveAt', 'expiresAt',
      'revokedAt', 'createdAt', 'updatedAt'
    ],
    refs: ['customerAccount']
  },
  {
    collection: 'coupons',
    table: 'coupons',
    fields: [
      'code', 'type', 'value', 'minSubtotal', 'active', 'expiresAt', 'maxUses',
      'maxUsesPerCustomer', 'redemptionCount', 'createdAt', 'updatedAt'
    ]
  },
  {
    collection: 'storefrontorders',
    table: 'storefront_orders',
    fields: [
      'orderNumber', 'subtotal', 'discount', 'shipping', 'tax', 'grandTotal',
      'currency', 'couponCode', 'paymentMethod', 'paymentStatus', 'orderStatus',
      'customerNote', 'paymentReference', 'placedAt', 'cancelReason',
      'cancellationRequestedAt', 'previousStatusBeforeCancelRequest',
      'trackingNumber', 'carrier', 'trackingUrl', 'estimatedDeliveryDate',
      'actualDeliveredAt', 'createdAt', 'updatedAt'
    ],
    refs: ['customerAccount'],
    json: [
      'items', 'couponSnapshot', 'shippingAddress', 'contact', 'riskFlags',
      'statusHistory', 'shipmentUpdates'
    ]
  },
  {
    collection: 'productreviews',
    table: 'product_reviews',
    fields: ['rating', 'title', 'comment', 'status', 'verifiedPurchase', 'createdAt', 'updatedAt'],
    refs: ['product', 'customer']
  },
  {
    collection: 'supporttickets',
    table: 'support_tickets',
    fields: [
      'ticketNumber', 'type', 'status', 'subject', 'category', 'guestName',
      'guestEmail', 'guestPhone', 'createdAt', 'updatedAt'
    ],
    refs: ['customerAccount', 'relatedOrder'],
    json: ['messages']
  },
  {
    collection: 'documents',
    table: 'documents',
    fields: [
      'docNumber', 'name', 'originalFilename', 'mimeType', 'extension', 'sizeBytes',
      'category', 'description', 'language', 'isConfidential', 'isDeleted',
      'storageKey', 'storageUrl', 'thumbnailKey', 'version', 'isLatestVersion',
      'issueDate', 'expiryDate', 'isExpired', 'expiryAlertSent', 'downloadCount',
      'lastDownloadedAt', 'uploadedAt', 'updatedAt'
    ],
    refs: ['lastDownloadedBy', 'uploadedBy'],
    json: ['tags', 'linkedEntities', 'previousVersions']
  },
  {
    collection: 'documentactivities',
    table: 'document_activities',
    fields: ['docNumber', 'action', 'ipAddress', 'details', 'createdAt'],
    refs: ['document', 'performedBy']
  },
  {
    collection: 'notifications',
    table: 'notifications',
    fields: [
      'type', 'severity', 'title', 'body', 'isRead', 'readAt', 'isDismissed',
      'actionUrl', 'actionLabel', 'entityType', 'entityRef', 'entityId', 'createdAt'
    ],
    refs: ['recipient'],
    json: ['channels']
  },
  {
    collection: 'customernotifications',
    table: 'customer_notifications',
    fields: [
      'type', 'severity', 'title', 'body', 'isRead', 'readAt', 'actionUrl',
      'actionLabel', 'entityType', 'entityRef', 'entityId', 'createdAt'
    ],
    refs: ['recipient'],
    json: ['channels']
  },
  {
    collection: 'notificationpreferences',
    table: 'notification_preferences',
    fields: [
      'inAppEnabled', 'emailEnabled', 'emailDigest', 'digestTime', 'digestDayOfWeek',
      'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd', 'nextDigestAt', 'updatedAt'
    ],
    refs: ['user'],
    json: ['typeOverrides']
  },
  {
    collection: 'notificationdigestqueues',
    table: 'notification_digest_queues',
    fields: ['sent', 'sentAt', 'createdAt'],
    refs: ['user', 'notification']
  },
  {
    collection: 'activitylogs',
    table: 'activity_logs',
    fields: [
      'actorName', 'actorRole', 'action', 'module', 'entityType', 'entityRef',
      'entityId', 'description', 'ipAddress', 'userAgent', 'createdAt'
    ],
    refs: ['actor'],
    json: ['metadata']
  },
  {
    collection: 'reminders',
    table: 'reminders',
    fields: [
      'title', 'body', 'dueAt', 'status', 'snoozeUntil', 'entityType', 'entityRef',
      'entityId', 'notifiedAt', 'createdAt', 'updatedAt'
    ],
    refs: ['createdBy'],
    json: ['assignedTo', 'recurrence']
  },
  {
    collection: 'communicationlogs',
    table: 'communication_logs',
    fields: [
      'entityType', 'entityId', 'type', 'direction', 'subject', 'body',
      'followUpDate', 'followUpDone', 'createdAt', 'updatedAt'
    ],
    refs: ['loggedBy'],
    json: ['attachments']
  },
  {
    collection: 'reportdefinitions',
    table: 'report_definitions',
    fields: [
      'reportId', 'name', 'description', 'type', 'isShared', 'isFavourite',
      'lastRunAt', 'createdAt', 'updatedAt'
    ],
    refs: ['lastRunBy', 'createdBy'],
    json: ['config']
  },
  {
    collection: 'scheduledreports',
    table: 'scheduled_reports',
    fields: [
      'name', 'frequency', 'dayOfWeek', 'dayOfMonth', 'time', 'timezone', 'format',
      'isActive', 'lastRunAt', 'nextRunAt', 'lastRunStatus', 'createdAt', 'updatedAt'
    ],
    refs: ['reportDefinition', 'createdBy'],
    json: ['recipients']
  },
  {
    collection: 'reportexports',
    table: 'report_exports',
    fields: [
      'name', 'type', 'format', 'status', 'fileUrl', 'storageKey', 'fileSizeBytes',
      'rowCount', 'generatedAt', 'expiresAt', 'createdAt', 'updatedAt'
    ],
    refs: ['reportDefinition', 'scheduledReport', 'generatedBy']
  }
];
