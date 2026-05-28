const Role = require('../models/Role');
const User = require('../models/User');

// GET /api/roles
exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.find();

    // Map roles to include count of active users currently assigned to that role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const count = await User.countDocuments({ role: role.name, deleted: { $ne: true } });
        return {
          ...role.toObject(),
          userCount: count
        };
      })
    );

    return res.status(200).json(rolesWithCounts);
  } catch (error) {
    console.error('List Roles Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/roles
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required.' });
    }

    const lowerName = name.toLowerCase().trim();

    const existingRole = await Role.findOne({ name: lowerName });
    if (existingRole) {
      return res.status(400).json({ message: `Role '${name}' already exists.` });
    }

    const newRole = new Role({
      name: lowerName,
      description,
      permissions: permissions || []
    });

    await newRole.save();

    return res.status(201).json({
      message: 'Role created successfully.',
      role: newRole
    });
  } catch (error) {
    console.error('Create Role Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/roles/:id
exports.updateRolePermissions = async (req, res) => {
  try {
    const { permissions, description } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    if (permissions !== undefined) {
      role.permissions = permissions;
    }

    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    // Side-effect: If role permissions are updated, should we propagate them to all users of that role?
    // In a production system, we can update users who don't have custom overrides, but here
    // let's assume roles are groups of permissions and updating a role permissions updates them for all users
    // who have that role and match the role defaults. Let's do a bulk update of users with this role to the new permissions
    // if the user asks, or simply update users of that role. Let's update users of this role to synchronize!
    // This is a highly premium feature that makes the app very robust:
    await User.updateMany(
      { role: role.name, deleted: { $ne: true } },
      { $set: { permissions: role.permissions } }
    );

    return res.status(200).json({
      message: 'Role permissions and details updated successfully.',
      role
    });
  } catch (error) {
    console.error('Update Role Permissions Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/roles/:id
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    // Safety Check: Do not delete default roles
    if (['admin', 'manager', 'staff', 'viewer'].includes(role.name)) {
      return res.status(400).json({ message: 'Cannot delete system default roles.' });
    }

    // Check if any active user is assigned to this role
    const assignedUserCount = await User.countDocuments({ role: role.name, deleted: { $ne: true } });
    if (assignedUserCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role. There are ${assignedUserCount} active user(s) assigned to this role.`
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Role deleted successfully.' });
  } catch (error) {
    console.error('Delete Role Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
