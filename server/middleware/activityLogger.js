const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');

// Map URL prefix to mongoose model and module enum
const getModelAndModule = (url) => {
  const cleanUrl = url.split('?')[0]; // strip query params
  
  if (cleanUrl.startsWith('/api/users')) {
    return { modelName: 'User', module: 'users', entityType: 'User' };
  }
  if (cleanUrl.startsWith('/api/auth')) {
    return { modelName: 'User', module: 'users', entityType: 'User' };
  }
  if (cleanUrl.startsWith('/api/inventory') || cleanUrl.startsWith('/api/products') || cleanUrl.startsWith('/api/warehouses') || cleanUrl.startsWith('/api/categories')) {
    return { modelName: 'Inventory', module: 'inventory', entityType: 'Inventory' };
  }
  if (cleanUrl.startsWith('/api/suppliers')) {
    return { modelName: 'Supplier', module: 'suppliers', entityType: 'Supplier' };
  }
  if (cleanUrl.startsWith('/api/customers')) {
    return { modelName: 'Customer', module: 'customers', entityType: 'Customer' };
  }
  if (cleanUrl.startsWith('/api/import-orders')) {
    return { modelName: 'ImportOrder', module: 'import_orders', entityType: 'ImportOrder' };
  }
  if (cleanUrl.startsWith('/api/export-orders')) {
    return { modelName: 'ExportOrder', module: 'export_orders', entityType: 'ExportOrder' };
  }
  if (cleanUrl.startsWith('/api/shipments')) {
    return { modelName: 'Shipment', module: 'shipments', entityType: 'Shipment' };
  }
  if (cleanUrl.startsWith('/api/documents')) {
    return { modelName: 'Document', module: 'documents', entityType: 'Document' };
  }
  if (cleanUrl.startsWith('/api/payments')) {
    return { modelName: 'Payment', module: 'finance', entityType: 'Payment' };
  }
  if (cleanUrl.startsWith('/api/expenses')) {
    return { modelName: 'Expense', module: 'finance', entityType: 'Expense' };
  }
  if (cleanUrl.startsWith('/api/tax-duty')) {
    return { modelName: 'TaxDutyRecord', module: 'finance', entityType: 'TaxDutyRecord' };
  }
  if (cleanUrl.startsWith('/api/reports')) {
    return { modelName: 'Report', module: 'reports', entityType: 'Report' };
  }
  if (cleanUrl.startsWith('/api/notifications')) {
    return { modelName: 'Notification', module: 'notifications', entityType: 'Notification' };
  }
  if (cleanUrl.startsWith('/api/reminders')) {
    return { modelName: 'Reminder', module: 'notifications', entityType: 'Reminder' };
  }
  return { modelName: null, module: 'system', entityType: 'System' };
};

const resolveEntityRef = (body, beforeState) => {
  if (!body && !beforeState) return '';
  const obj = { ...(beforeState || {}), ...(body || {}) };
  return (
    obj.paymentNumber ||
    obj.expenseNumber ||
    obj.recordNumber ||
    obj.shipmentNumber ||
    obj.poNumber ||
    obj.orderNumber ||
    obj.dispatchNumber ||
    obj.name ||
    obj.title ||
    obj.filename ||
    obj.label ||
    (obj._id ? obj._id.toString() : '')
  );
};

const activityLogger = async (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Determine model details
  const { modelName, module, entityType } = getModelAndModule(req.originalUrl);
  
  // Extract ID from URL if present
  const objectIdRegex = /\b[0-9a-fA-F]{24}\b/;
  const urlMatch = req.originalUrl.match(objectIdRegex);
  const pathId = urlMatch ? urlMatch[0] : null;

  // 1. Capture BEFORE state for updates/deletes
  if (pathId && modelName && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      const Model = mongoose.model(modelName);
      req.beforeState = await Model.findById(pathId).lean();
    } catch (err) {
      // Model/Lookup error ignored to avoid blocking the request
    }
  }

  // 2. Intercept response JSON
  const originalJson = res.json;
  res.json = function (body) {
    res.locals.responseBody = body;
    return originalJson.apply(this, arguments);
  };

  // 3. Hook into response completion
  res.on('finish', async () => {
    // Only log successful mutating requests (2xx status codes)
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }

    try {
      // Extract target entity ID
      const responseData = res.locals.responseBody;
      let finalEntityId = pathId;
      let entityData = null;

      // Extract entity structure from common response patterns
      if (responseData) {
        if (responseData.success && responseData[entityType.charAt(0).toLowerCase() + entityType.slice(1)]) {
          entityData = responseData[entityType.charAt(0).toLowerCase() + entityType.slice(1)];
        } else if (responseData.success && responseData.data) {
          entityData = responseData.data;
        } else if (responseData._id) {
          entityData = responseData;
        }
      }

      if (entityData && entityData._id) {
        finalEntityId = entityData._id;
      }

      // Compute metadata diff for updates
      let metadata = {};
      if (['PUT', 'PATCH'].includes(req.method)) {
        const before = {};
        const after = {};
        const compareData = entityData || req.body || {};
        
        // Loop keys submitted in req.body
        for (const key of Object.keys(req.body || {})) {
          if (['password', 'token', 'trackingEvents', 'history'].includes(key)) {
            continue;
          }
          const valBefore = req.beforeState ? req.beforeState[key] : undefined;
          const valAfter = compareData[key] !== undefined ? compareData[key] : req.body[key];
          
          if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
            before[key] = valBefore;
            after[key] = valAfter;
          }
        }

        if (Object.keys(after).length > 0) {
          metadata = { before, after };
        }
      }

      // Action determination
      let action = 'updated';
      if (req.method === 'POST') action = 'created';
      if (req.method === 'DELETE') action = 'deleted';

      // Special action tags for operations
      if (req.originalUrl.includes('/approve')) action = 'approved';
      if (req.originalUrl.includes('/reject')) action = 'rejected';
      if (req.originalUrl.includes('/dispatch')) action = 'dispatched';
      if (req.originalUrl.includes('/receive')) action = 'received';

      // Reference resolve
      const entityRef = resolveEntityRef(entityData || req.body, req.beforeState);

      // Create human readable description
      const actorLabel = req.user ? `${req.user.name} (${req.user.role})` : 'System';
      const refSuffix = entityRef ? ` [${entityRef}]` : '';
      let description = '';

      if (action === 'created') {
        description = `${actorLabel} created new ${entityType}${refSuffix}`;
      } else if (action === 'deleted') {
        description = `${actorLabel} deleted ${entityType}${refSuffix}`;
      } else if (['approved', 'rejected', 'dispatched', 'received'].includes(action)) {
        description = `${actorLabel} ${action} ${entityType}${refSuffix}`;
      } else {
        const changedKeys = Object.keys(metadata.after || {});
        if (changedKeys.length > 0) {
          description = `${actorLabel} updated ${entityType}${refSuffix} (changed: ${changedKeys.join(', ')})`;
        } else {
          description = `${actorLabel} updated ${entityType}${refSuffix}`;
        }
      }

      // Save log to DB
      await ActivityLog.create({
        actor: req.user ? req.user._id : null,
        actorName: req.user ? req.user.name : 'System',
        actorRole: req.user ? req.user.role : 'system',
        action,
        module,
        entityType,
        entityId: finalEntityId,
        entityRef,
        description,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

    } catch (logError) {
      console.error('[ACTIVITY LOGGER ERROR] Failed to record activity log:', logError);
    }
  });

  next();
};

module.exports = activityLogger;
