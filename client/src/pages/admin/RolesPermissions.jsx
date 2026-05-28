import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import userService from '../../services/user.service';
import { ShieldCheck, Plus, Users, Save, ShieldAlert, X, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Granular permissions groupings
const PERMISSION_GROUPS = [
  {
    module: 'User Accounts',
    permissions: [
      { key: 'users:read', label: 'View users list & profiles' },
      { key: 'users:write', label: 'Create and edit user details' },
      { key: 'users:delete', label: 'Soft delete user accounts' }
    ]
  },
  {
    module: 'Order Processing',
    permissions: [
      { key: 'orders:read', label: 'View customer orders' },
      { key: 'orders:write', label: 'Create, modify & process orders' }
    ]
  },
  {
    module: 'Inventory Control',
    permissions: [
      { key: 'inventory:read', label: 'View stock levels & catalog' },
      { key: 'inventory:write', label: 'Update quantities & add products' }
    ]
  },
  {
    module: 'Company Finance',
    permissions: [
      { key: 'finance:read', label: 'View accounts, invoices & ledgers' },
      { key: 'finance:write', label: 'Record transactions & issue refunds' }
    ]
  },
  {
    module: 'Document Hub',
    permissions: [
      { key: 'documents:read', label: 'View declarations, customs & receipts' },
      { key: 'documents:write', label: 'Upload, sign & delete documentation' }
    ]
  },
  {
    module: 'Shipments & Logistics',
    permissions: [
      { key: 'shipments:read', label: 'Track shipments & view manifest' },
      { key: 'shipments:write', label: 'Create shipments & dispatch cargo' }
    ]
  },
  {
    module: 'Analytical Reports',
    permissions: [
      { key: 'reports:read', label: 'Generate & export business intelligence reports' }
    ]
  }
];

const RolesPermissions = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);

  // Create Role Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState([]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await userService.getRoles();
      setRoles(data);

      // Auto expand first role if none is selected
      if (data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
        setRolePermissions(data[0].permissions);
      } else if (selectedRole) {
        // Refresh selected role
        const updated = data.find((r) => r._id === selectedRole._id);
        if (updated) {
          setSelectedRole(updated);
          setRolePermissions(updated.permissions);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load system roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setRolePermissions(role.permissions);
  };

  const handleTogglePermission = (permKey) => {
    if (rolePermissions.includes(permKey)) {
      setRolePermissions((prev) => prev.filter((p) => p !== permKey));
    } else {
      setRolePermissions((prev) => [...prev, permKey]);
    }
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can edit role permissions.');
      return;
    }
    try {
      await userService.updateRolePermissions(selectedRole._id, rolePermissions, selectedRole.description);
      toast.success(`Updated permissions for role: ${selectedRole.name}`);
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update permissions.');
    }
  };

  const handleToggleNewRolePerm = (permKey) => {
    if (newRolePerms.includes(permKey)) {
      setNewRolePerms((prev) => prev.filter((p) => p !== permKey));
    } else {
      setNewRolePerms((prev) => [...prev, permKey]);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName) {
      toast.error('Role name is required.');
      return;
    }

    try {
      await userService.createRole({
        name: newRoleName,
        description: newRoleDesc,
        permissions: newRolePerms
      });

      toast.success(`Role '${newRoleName}' created successfully.`);
      setCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRolePerms([]);
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create role.');
    }
  };

  if (loading && roles.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 text-sm font-semibold">Loading access permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Access Control & Roles</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure system access groupings, assign granular module permissions, and view role populations.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary py-2 px-3.5 text-xs shadow-teal-500/10 shrink-0"
          >
            <Plus size={15} />
            <span>Create Custom Role</span>
          </button>
        )}
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Role List Cards */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Available Roles</h3>
          {roles.map((role) => {
            const isSelected = selectedRole?._id === role._id;
            return (
              <div
                key={role._id}
                onClick={() => handleSelectRole(role)}
                className={`group border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-teal-500 bg-white ring-2 ring-teal-500/10 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-800 capitalize flex items-center gap-2">
                      <span>{role.name}</span>
                      {['admin', 'manager', 'staff', 'viewer'].includes(role.name) && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          System Default
                        </span>
                      )}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed truncate max-w-[220px]">
                      {role.description || 'No description provided.'}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-slate-350 transition-transform group-hover:translate-x-0.5 shrink-0 ${
                      isSelected ? 'text-teal-500 rotate-95 lg:rotate-0' : ''
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-semibold">
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-slate-400" />
                    <span>{role.userCount} Active Users</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <div>{role.permissions?.length} Permission keys</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Permissions Grid Tree */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRole ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
              {/* Card Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-850 flex items-center gap-2 text-base">
                    <ShieldCheck className="text-teal-600" size={18} />
                    <span>Permissions Configuration: </span>
                    <span className="capitalize text-teal-600 underline decoration-2 decoration-teal-600/25">
                      {selectedRole.name}
                    </span>
                  </h3>
                  <p className="text-slate-450 text-xs mt-0.5">
                    {selectedRole.description || 'Configure user group roles.'}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleSavePermissions}
                    disabled={selectedRole.name === 'admin'} // Admin role bypasses permission matrix check, permissions are unchangeable
                    className="btn-primary py-1.5 px-3 text-xs w-full sm:w-auto shadow-teal-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={selectedRole.name === 'admin' ? 'Admins always retain full access rights' : ''}
                  >
                    <Save size={14} />
                    <span>Save Changes</span>
                  </button>
                )}
              </div>

              {/* Permissions List */}
              <div className="p-6 divide-y divide-slate-100 space-y-6 overflow-y-auto max-h-[500px]">
                {selectedRole.name === 'admin' && (
                  <div className="flex items-start gap-3 p-4 bg-purple-50 text-purple-750 border border-purple-150 rounded-lg text-xs font-semibold leading-relaxed">
                    <ShieldAlert className="shrink-0 text-purple-650 mt-0.5" size={16} />
                    <div>
                      The Administrator account holds absolute privileges. These permission matrix keys are read-only and automatically bypass system access guards.
                    </div>
                  </div>
                )}

                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.module} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 first:pt-0 border-slate-100">
                    <div className="md:col-span-1">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        {group.module}
                      </h4>
                    </div>

                    <div className="md:col-span-2 space-y-3.5">
                      {group.permissions.map((perm) => {
                        const isChecked = rolePermissions.includes(perm.key) || selectedRole.name === 'admin';
                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                              isChecked
                                ? 'border-teal-200 bg-teal-50/10'
                                : 'border-slate-150 bg-slate-50/20 hover:bg-slate-50/50 hover:border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={selectedRole.name === 'admin' || !isAdmin}
                              onChange={() => handleTogglePermission(perm.key)}
                              className="rounded border-slate-300 text-teal-650 focus:ring-teal-500 focus:ring-offset-0 w-4 h-4 cursor-pointer mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-slate-800 leading-none">{perm.key}</p>
                              <p className="text-slate-450 mt-1 font-normal leading-relaxed">{perm.label}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-slate-400">
              Select a role card to manage permissions.
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-teal-400" size={20} />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 leading-none">
                    Create Custom Role
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1">
                    ACCESS CONFIGURATION LAYER
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role Name */}
                <div>
                  <label className="form-label">Role Name</label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. auditor, supervisor..."
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Lowercase alphabets only.
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="form-label">Role Description</label>
                  <input
                    type="text"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="form-input"
                    placeholder="Provide description..."
                  />
                </div>
              </div>

              {/* Permissions list inside Modal */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  Assign Initial Permissions
                </h4>

                <div className="space-y-4 max-h-[300px] overflow-y-auto divide-y divide-slate-100 pr-2">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.module} className="pt-4 first:pt-0">
                      <h5 className="font-bold text-slate-700 text-xs mb-2">{group.module}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const isChecked = newRolePerms.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border text-[11px] font-medium cursor-pointer transition-all ${
                                isChecked
                                  ? 'border-teal-200 bg-teal-50/10'
                                  : 'border-slate-100 bg-slate-50/10 hover:bg-slate-50/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleNewRolePerm(perm.key)}
                                className="rounded border-slate-350 text-teal-650 focus:ring-teal-500 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer mt-0.5 shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-slate-850 leading-none">{perm.key}</p>
                                <p className="text-slate-400 mt-1 font-normal leading-tight">{perm.label}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary py-1.5 px-3.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 px-3.5 text-xs">
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPermissions;
