import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import {
  Edit2,
  Trash2,
  Lock,
  MoreVertical,
  Activity,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Date formatter helper
const formatLastLogin = (dateString) => {
  if (!dateString) return 'Never logged in';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const UserTable = ({
  users,
  selectedUsers,
  setSelectedUsers,
  onChangeStatus,
  onResetPassword,
  onDelete,
  onBulkStatusChange,
  onBulkDelete
}) => {
  const navigate = useNavigate();
  const { hasPermission, user: currentUser } = useAuth();

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map((u) => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;

  const roleStyles = {
    admin: 'bg-purple-50 text-purple-750 border-purple-200',
    manager: 'bg-blue-50 text-blue-750 border-blue-200',
    staff: 'bg-teal-50 text-teal-750 border-teal-200',
    viewer: 'bg-slate-100 text-slate-700 border-slate-300'
  };

  const statusStyles = {
    active: 'bg-emerald-50 text-emerald-750 border-emerald-200',
    inactive: 'bg-amber-50 text-amber-750 border-amber-200',
    suspended: 'bg-rose-50 text-rose-750 border-rose-200'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Bulk Action Header Banner */}
      {selectedUsers.length > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-slate-900 text-white px-6 py-3 flex items-center justify-between z-20 animate-slideDown">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-teal-500/20 text-teal-350 px-2.5 py-0.5 rounded-full border border-teal-500/30">
              {selectedUsers.length} selected
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">Bulk actions:</span>
          </div>

          <div className="flex gap-2">
            <select
              onChange={(e) => {
                const action = e.target.value;
                if (!action) return;
                if (action === 'delete') {
                  onBulkDelete(selectedUsers);
                } else {
                  onBulkStatusChange(selectedUsers, action);
                }
                e.target.value = ''; // Reset select
              }}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Choose bulk action...</option>
              <option value="active">Set Status: Active</option>
              <option value="inactive">Set Status: Inactive</option>
              <option value="suspended">Set Status: Suspended</option>
              {hasPermission('users:delete') && <option value="delete">Delete selected</option>}
            </select>
            <button
              onClick={() => setSelectedUsers([])}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 transition-colors font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <th className="px-6 py-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded border-slate-350 text-teal-600 focus:ring-teal-500 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">Last Login</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Activity size={32} className="text-slate-300 animate-pulse" />
                    <p className="font-medium text-slate-500">No users found</p>
                    <p className="text-xs text-slate-400">Try adjusting your filters or query strings.</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelected = selectedUsers.includes(u._id);
                return (
                  <tr
                    key={u._id}
                    className={`hover:bg-slate-50/50 transition-colors ${
                      isSelected ? 'bg-teal-50/15' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectUser(u._id, e.target.checked)}
                        disabled={u._id === currentUser?.id} // Cannot bulk select/operate on oneself
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0 w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* Name + Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-50 text-teal-600 border border-teal-150 font-bold uppercase shrink-0">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">
                            {u.name}
                            {u._id === currentUser?.id && (
                              <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-slate-400 text-xs mt-0.5">{u.phone || 'No phone'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-slate-600 truncate max-w-[180px]">
                      {u.email}
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          roleStyles[u.role] || roleStyles.viewer
                        } capitalize`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          statusStyles[u.status] || statusStyles.inactive
                        } capitalize`}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4 text-slate-650 truncate max-w-[120px]">
                      {u.department || <span className="text-slate-350">—</span>}
                    </td>

                    {/* Last Login */}
                    <td className="px-6 py-4 text-slate-500 text-xs shrink-0 whitespace-nowrap">
                      {formatLastLogin(u.lastLogin)}
                    </td>

                    {/* Action Controls */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Action (pencil) */}
                        <button
                          onClick={() => navigate(`/admin/users/${u._id}/edit`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                          title="Edit user details"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* More Options Dropdown */}
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150 focus:outline-none">
                            <MoreVertical size={16} />
                          </Menu.Button>

                          <Menu.Items className="absolute right-0 z-30 w-44 mt-1 origin-top-right bg-white rounded-lg shadow-lg border border-slate-150 ring-1 ring-black/5 focus:outline-none divide-y divide-slate-100 overflow-hidden">
                            {/* Change status action subgroup */}
                            <div className="py-1">
                              <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Set Status
                              </p>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onChangeStatus(u._id, 'active')}
                                    disabled={u.status === 'active'}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors text-left ${
                                      active ? 'bg-slate-50 text-slate-900' : 'text-slate-650'
                                    } disabled:opacity-35`}
                                  >
                                    <UserCheck size={14} className="text-emerald-500" />
                                    <span>Active</span>
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onChangeStatus(u._id, 'inactive')}
                                    disabled={u.status === 'inactive'}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors text-left ${
                                      active ? 'bg-slate-50 text-slate-900' : 'text-slate-650'
                                    } disabled:opacity-35`}
                                  >
                                    <UserX size={14} className="text-amber-500" />
                                    <span>Inactive</span>
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onChangeStatus(u._id, 'suspended')}
                                    disabled={u.status === 'suspended' || u._id === currentUser?.id}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors text-left ${
                                      active ? 'bg-slate-50 text-slate-900' : 'text-slate-650'
                                    } disabled:opacity-35`}
                                  >
                                    <AlertTriangle size={14} className="text-rose-500" />
                                    <span>Suspended</span>
                                  </button>
                                )}
                              </Menu.Item>
                            </div>

                            {/* Security actions */}
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onResetPassword(u)}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors text-left ${
                                      active ? 'bg-slate-50 text-slate-900' : 'text-slate-650'
                                    }`}
                                  >
                                    <Lock size={14} className="text-slate-400" />
                                    <span>Reset Password</span>
                                  </button>
                                )}
                              </Menu.Item>
                            </div>

                            {/* Destructive delete */}
                            {hasPermission('users:delete') && (
                              <div className="py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => onDelete(u._id)}
                                      disabled={u._id === currentUser?.id}
                                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors text-left text-rose-600 font-semibold disabled:opacity-35 ${
                                        active ? 'bg-rose-50' : ''
                                      }`}
                                    >
                                      <Trash2 size={14} className="text-rose-500" />
                                      <span>Delete User</span>
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            )}
                          </Menu.Items>
                        </Menu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
