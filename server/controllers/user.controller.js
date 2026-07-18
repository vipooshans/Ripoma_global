const User = require('../models/User');

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

// GET /api/users
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '', sort = '-createdAt' } = req.query;

    const query = { deleted: { $ne: true } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    // Pagination setup
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sorting setup
    let sortOption = {};
    if (sort) {
      if (sort.startsWith('-')) {
        sortOption[sort.substring(1)] = -1;
      } else {
        sortOption[sort] = 1;
      }
    } else {
      sortOption = { createdAt: -1 };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('List Users Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, status, avatar, phone, department, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email, deleted: { $ne: true } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // Use explicit permissions or fall back to default role permissions
    const userRole = role || 'staff';
    const userPermissions = permissions || ROLE_PERMISSIONS[userRole] || [];

    const newUser = new User({
      name,
      email,
      password,
      role: userRole,
      status: status || 'active',
      avatar,
      phone,
      department,
      permissions: userPermissions
    });

    await newUser.save();

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: 'User created successfully.',
      user: userObj
    });
  } catch (error) {
    console.error('Create User Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deleted: { $ne: true } }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get User Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, status, avatar, phone, department, permissions } = req.body;

    const user = await User.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), deleted: { $ne: true } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email is already in use by another account.' });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (avatar !== undefined) user.avatar = avatar;

    // Admin-only fields restriction could be checked here, but routes handle admin guards.
    // However, if a user is updating their own profile, they shouldn't change role/status/permissions.
    // Let's assume the controller allows updating them (admin routes call this or check permissions)
    if (role && role !== user.role) {
      // If role changed and permissions were not explicitly passed, reset to new role defaults
      user.role = role;
      if (!permissions) {
        user.permissions = ROLE_PERMISSIONS[role] || [];
      }
    }

    if (status) user.status = status;
    if (permissions) user.permissions = permissions;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message: 'User updated successfully.',
      user: userObj
    });
  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const result = await User.updateOne(
      { _id: req.params.id, deleted: { $ne: true } },
      { $set: { deleted: true, status: 'suspended' } },
      { runValidators: true }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ message: 'User soft-deleted successfully.' });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/users/:id/status
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    const user = await User.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      message: `User status changed to ${status} successfully.`,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Change Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/users/:id/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const user = await User.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.password = password; // pre-save hook handles hashing
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully by administrator.' });
  } catch (error) {
    console.error('Admin Password Reset Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
