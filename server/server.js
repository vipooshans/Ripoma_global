require('dotenv').config();
const { requireProductionEnv, isEmailVerificationRequired } = require('./utils/customerAuthConfig');
requireProductionEnv();

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const { corsOptions } = require('./utils/corsOrigins');

const Role = require('./models/Role');
const User = require('./models/User');
const { ROLE_PERMISSIONS } = require('./controllers/user.controller');

const authRoutes = require('./routes/auth.routes');
const customerAuthRoutes = require('./routes/customerAuth.routes');
const storefrontRoutes = require('./routes/storefront.routes');
const storefrontOrderAdminRoutes = require('./routes/storefrontOrderAdmin.routes');
const storefrontReviewAdminRoutes = require('./routes/storefrontReviewAdmin.routes');
const storefrontSupportAdminRoutes = require('./routes/storefrontSupportAdmin.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const stockMovementRoutes = require('./routes/stockMovement.routes');
const alertRoutes = require('./routes/alert.routes');
const supplierRoutes = require('./routes/supplier.routes');
const customerRoutes = require('./routes/customer.routes');
const communicationRoutes = require('./routes/communication.routes');
const contactRoutes = require('./routes/contact.routes');
const importOrderRoutes = require('./routes/importOrder.routes');
const goodsReceiptRoutes = require('./routes/goodsReceipt.routes');
const exportOrderRoutes = require('./routes/exportOrder.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const dispatchRoutes = require('./routes/dispatch.routes');
const documentRoutes = require('./routes/document.routes');
const documentActivityRoutes = require('./routes/documentActivity.routes');
const paymentRoutes = require('./routes/payment.routes');
const expenseRoutes = require('./routes/expense.routes');
const taxDutyRoutes = require('./routes/taxDuty.routes');
const currencyRoutes = require('./routes/currency.routes');
const profitAnalysisRoutes = require('./routes/profitAnalysis.routes');
const reportRoutes = require('./routes/report.routes');
const settingsRoutes = require('./routes/settings.routes');
const activityLogger = require('./middleware/activityLogger');

const notificationRoutes = require('./routes/notification.routes');
const notificationPreferenceRoutes = require('./routes/notificationPreference.routes');
const reminderRoutes = require('./routes/reminder.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const authMiddleware = require('./middleware/authMiddleware');
const { globalSearch } = require('./controllers/dashboard.controller');

const { initLowStockCron } = require('./jobs/lowStockCheck');
const { initOverdueCron } = require('./jobs/overdueDeliveryCheck');
const { initOverdueInvoiceCron } = require('./jobs/overdueInvoiceCheck');
const { startDocumentExpiryCheck } = require('./jobs/documentExpiryCheck');
const { initExchangeRateCron, seedExchangeRates } = require('./jobs/exchangeRateFetch');
const { seedCategories } = require('./seed/categories');
const { seedProducts } = require('./seed/products');
const { seedCoupons } = require('./seed/coupons');
const { initPaymentOverdueCron } = require('./jobs/paymentOverdueCheck');
const { initTaxDutyAlertCron } = require('./jobs/taxDutyDueAlerts');
const { initScheduledReportCron } = require('./jobs/scheduledReportRunner');
const { initScheduledReminderCron } = require('./jobs/reminderCheck');
const { initScheduledDigestCron } = require('./jobs/notificationDigest');
const { initCustomerOrderReminderCron } = require('./jobs/customerOrderReminders');

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Cloudflare Worker / reverse proxies
app.set('trust proxy', 1);

// CORS must run first so preflight OPTIONS always get ACAO headers
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files (local dev storage adapter)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(activityLogger);

// DB Connection & Seeding
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ripoma_global';

async function seedDB() {
  try {
    // 1. Seed Roles
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Administrator with full system control and configuration access.',
        permissions: ROLE_PERMISSIONS.admin
      },
      {
        name: 'manager',
        description: 'Operations manager. Directs staff, edits data, but cannot delete users or manage company finances.',
        permissions: ROLE_PERMISSIONS.manager
      },
      {
        name: 'staff',
        description: 'Operational staff. Accesses order processing, inventory levels, and shipment manifests.',
        permissions: ROLE_PERMISSIONS.staff
      },
      {
        name: 'viewer',
        description: 'Read-only access for internal reporting, dashboards, and auditors.',
        permissions: ROLE_PERMISSIONS.viewer
      }
    ];

    for (const roleDef of defaultRoles) {
      const exists = await Role.findOne({ name: roleDef.name });
      if (!exists) {
        await new Role(roleDef).save();
        console.log(`[SEED] Created role: ${roleDef.name}`);
      }
    }

    // 2. Seed Default Admin User
    const adminExists = await User.findOne({ role: 'admin', deleted: { $ne: true } });
    if (!adminExists) {
      const adminUser = new User({
        name: 'Global Administrator',
        email: 'admin@ripoma.com',
        password: 'AdminPassword123!', // Automatically hashed in pre-save
        role: 'admin',
        status: 'active',
        phone: '+1 (555) 019-2834',
        department: 'Operations & IT',
        permissions: ROLE_PERMISSIONS.admin
      });
      await adminUser.save();
      console.log('[SEED] Created default administrator: admin@ripoma.com / AdminPassword123!');
    }

    await seedCategories();
    await seedProducts();
    await seedCoupons();
  } catch (error) {
    console.error('[SEED ERROR] Failed to seed database:', error);
  }
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedDB();
    await seedExchangeRates();
    initLowStockCron();
    initOverdueCron();
    initOverdueInvoiceCron();
    startDocumentExpiryCheck();
    initExchangeRateCron();
    initPaymentOverdueCron();
    initTaxDutyAlertCron();
    initScheduledReportCron();
    initScheduledReminderCron();
    initScheduledDigestCron();
    initCustomerOrderReminderCron();
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/storefront-orders', storefrontOrderAdminRoutes);
app.use('/api/storefront-reviews', storefrontReviewAdminRoutes);
app.use('/api/storefront-support', storefrontSupportAdminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/import-orders', importOrderRoutes);
app.use('/api/goods-receipts', goodsReceiptRoutes);
app.use('/api/export-orders', exportOrderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-activity', documentActivityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tax-duty', taxDutyRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/profit-analysis', profitAnalysisRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-preferences', notificationPreferenceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/search', authMiddleware, globalSearch);

// Root + health (used by Containers pingEndpoint and load balancers)
app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ripoma-api',
    health: '/health',
    api: '/api'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong on the server!'
  });
});

const http = require('http');
const socketIO = require('./socket');

const server = http.createServer(app);
socketIO.init(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`✖ Port ${PORT} is already in use — the API is most likely already running via pm2.`);
    console.error('');
    console.error('  You do NOT need "npm run dev" while pm2 is online. Instead:');
    console.error('    • Apply server code changes:  npx pm2 restart ripoma-api');
    console.error('    • Watch server logs:          npx pm2 logs ripoma-api');
    console.error('');
    console.error('  To really use "npm run dev", first stop pm2 (also stops the live tunnel):');
    console.error('    cd E:\\project\\Rippoma ; npm run api:offline');
    console.error('');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `[CUSTOMER AUTH] Email verification on login: ${isEmailVerificationRequired() ? 'required' : 'disabled'}`
  );
});
