require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ripoma_global';

async function run() {
  try {
    console.log('Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB.');

    let admin = await User.findOne({ email: 'admin@ripoma.com' });
    if (!admin) {
      console.log('Admin user does not exist. Creating admin user...');
      admin = new User({
        name: 'Global Administrator',
        email: 'admin@ripoma.com',
        password: 'AdminPassword123!', // Automatically hashed in pre-save
        role: 'admin',
        status: 'active',
        phone: '+1 (555) 019-2834',
        department: 'Operations & IT',
        permissions: ['admin', 'manager', 'staff', 'viewer']
      });
      await admin.save();
      console.log('Created default admin: admin@ripoma.com / AdminPassword123!');
    } else {
      console.log('Admin user found. Status:', admin.status, 'Role:', admin.role);
      // Let's reset the password to make absolutely sure it matches
      console.log('Resetting admin password to: AdminPassword123!');
      admin.password = 'AdminPassword123!';
      admin.status = 'active'; // make sure it's active
      await admin.save();
      console.log('Admin user password successfully reset and activated.');
    }

    const allUsers = await User.find({}, 'name email role status');
    console.log('All Users in DB:', allUsers);

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

run();
