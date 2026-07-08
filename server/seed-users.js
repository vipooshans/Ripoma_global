/**
 * Seed script: create one user per role for RIPOMA GLOBAL
 * Run: node seed-users.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const ROLE_PERMISSIONS = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'orders:read', 'orders:write',
    'inventory:read', 'inventory:write',
    'finance:read', 'finance:write',
    'documents:read', 'documents:write',
    'reports:read',
    'shipments:read', 'shipments:write'
  ],
  manager: [
    'users:read', 'users:write',
    'orders:read', 'orders:write',
    'inventory:read', 'inventory:write',
    'finance:read',
    'documents:read', 'documents:write',
    'reports:read',
    'shipments:read', 'shipments:write'
  ],
  staff: [
    'orders:read', 'orders:write',
    'inventory:read',
    'shipments:read'
  ],
  viewer: [
    'users:read',
    'orders:read',
    'inventory:read',
    'finance:read',
    'documents:read',
    'reports:read',
    'shipments:read'
  ]
};

const accounts = [
  {
    name: 'Global Administrator',
    email: 'admin@ripoma.com',
    password: 'AdminPassword123!',
    role: 'admin',
    department: 'Management',
    phone: '+1 555 000 0001',
    status: 'active'
  },
  {
    name: 'Sarah Manager',
    email: 'manager@ripoma.com',
    password: 'Manager123!',
    role: 'manager',
    department: 'Operations',
    phone: '+1 555 100 0001',
    status: 'active'
  },
  {
    name: 'Tom Staff',
    email: 'staff@ripoma.com',
    password: 'Staff123!',
    role: 'staff',
    department: 'Logistics',
    phone: '+1 555 100 0002',
    status: 'active'
  },
  {
    name: 'Lisa Viewer',
    email: 'viewer@ripoma.com',
    password: 'Viewer123!',
    role: 'viewer',
    department: 'Finance',
    phone: '+1 555 100 0003',
    status: 'active'
  }
];

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ripoma_global';
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');

  for (const acc of accounts) {
    const exists = await User.findOne({ email: acc.email, deleted: { $ne: true } });
    if (exists) {
      console.log(`⏭  SKIP  [${acc.role.padEnd(7)}] ${acc.email} — already exists`);
      continue;
    }
    const user = new User({
      ...acc,
      permissions: ROLE_PERMISSIONS[acc.role] || []
    });
    await user.save();
    console.log(`✅ CREATE [${acc.role.padEnd(7)}] ${acc.email}  →  pwd: ${acc.password}`);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('  RIPOMA GLOBAL — Login Credentials Summary');
  console.log('─────────────────────────────────────────────');
  console.log('  Role      Email                    Password');
  console.log('─────────────────────────────────────────────');
  for (const a of accounts) {
    console.log(`  ${a.role.padEnd(9)} ${a.email.padEnd(25)} ${a.password}`);
  }
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
