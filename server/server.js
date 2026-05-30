require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');

const Role = require('./models/Role');
const User = require('./models/User');
const { ROLE_PERMISSIONS } = require('./controllers/user.controller');

const authRoutes = require('./routes/auth.routes');
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
const shipmentRoutes = require('./routes/shipment.routes');
const containerRoutes = require('./routes/container.routes');
const documentRoutes = require('./routes/document.routes');
const documentActivityRoutes = require('./routes/documentActivity.routes');
const paymentRoutes = require('./routes/payment.routes');
const expenseRoutes = require('./routes/expense.routes');
const taxDutyRoutes = require('./routes/taxDuty.routes');
const currencyRoutes = require('./routes/currency.routes');
const profitAnalysisRoutes = require('./routes/profitAnalysis.routes');
const reportRoutes = require('./routes/report.routes');

const { initLowStockCron } = require('./jobs/lowStockCheck');
const { initOverdueCron } = require('./jobs/overdueDeliveryCheck');
const { initOverdueInvoiceCron } = require('./jobs/overdueInvoiceCheck');
const { initCarrierPollCron } = require('./jobs/carrierPoll');
const { initDelayAlertCron } = require('./jobs/delayAlertCheck');
const { startDocumentExpiryCheck } = require('./jobs/documentExpiryCheck');
const { initExchangeRateCron, seedExchangeRates } = require('./jobs/exchangeRateFetch');
const { initPaymentOverdueCron } = require('./jobs/paymentOverdueCheck');
const { initTaxDutyAlertCron } = require('./jobs/taxDutyDueAlerts');
const { initScheduledReportCron } = require('./jobs/scheduledReportRunner');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files (local dev storage adapter)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS config
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

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
    initCarrierPollCron();
    initDelayAlertCron();
    startDocumentExpiryCheck();
    initExchangeRateCron();
    initPaymentOverdueCron();
    initTaxDutyAlertCron();
    initScheduledReportCron();
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
  });

// API Routes
app.use('/api/auth', authRoutes);
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
app.use('/api/shipments', shipmentRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-activity', documentActivityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tax-duty', taxDutyRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/profit-analysis', profitAnalysisRoutes);
app.use('/api/reports', reportRoutes);

// Health check
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
