import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import userService from '../../services/user.service';
import UserFilters from '../../components/users/UserFilters';
import UserTable from '../../components/users/UserTable';
import { ChevronLeft, ChevronRight, RefreshCw, Key, ShieldAlert } from 'lucide-react';

const UserList = () => {
  const { hasPermission } = useAuth();

  // List State
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('-createdAt');

  // Selection
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modals / Dialogs State
  const [resetUser, setResetUser] = useState(null); // stores user object when resetting password
  const [newPassword, setNewPassword] = useState('');
  const [deleteUserId, setDeleteUserId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers({
        page,
        limit,
        search: debouncedSearch,
        role,
        status,
        sort
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    setSelectedUsers([]); // Clear selection when filter changes
  }, [page, limit, debouncedSearch, role, status, sort]);

  // Actions handlers
  const handleResetFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setLimit(10);
    setPage(1);
    setSort('-createdAt');
  };

  const handleChangeStatus = async (id, newStatus) => {
    try {
      await userService.changeStatus(id, newStatus);
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleOpenResetPassword = (user) => {
    setResetUser(user);
    setNewPassword('');
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    try {
      await userService.adminResetPassword(resetUser._id, newPassword);
      toast.success(`Password for ${resetUser.name} reset successfully.`);
      setResetUser(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await userService.deleteUser(deleteUserId);
      toast.success('User soft-deleted successfully.');
      setDeleteUserId(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user.');
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (userIds, newStatus) => {
    try {
      // Process status updates concurrently
      await Promise.all(userIds.map((id) => userService.changeStatus(id, newStatus)));
      toast.success(`Bulk updated ${userIds.length} users to ${newStatus}`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error('Some status updates failed.');
      fetchUsers();
    }
  };

  const handleBulkDelete = async (userIds) => {
    if (!window.confirm(`Are you sure you want to soft-delete the ${userIds.length} selected users?`)) {
      return;
    }
    try {
      await Promise.all(userIds.map((id) => userService.deleteUser(id)));
      toast.success(`Soft-deleted ${userIds.length} users.`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete some users.');
      fetchUsers();
    }
  };

  // Sort helper
  const handleSortToggle = (field) => {
    if (sort === field) {
      setSort(`-${field}`);
    } else {
      setSort(field);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">
            Display, search, and administer personnel profiles, system permissions, and credential security.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg shadow-sm text-slate-500 hover:text-slate-700 transition-colors"
          title="Reload table"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters Module */}
      <UserFilters
        search={search}
        setSearch={setSearch}
        role={role}
        setRole={setRole}
        status={status}
        setStatus={setStatus}
        limit={limit}
        setLimit={setLimit}
        onReset={handleResetFilters}
      />

      {/* Data Table */}
      {loading && users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm font-semibold">Fetching user directory...</span>
        </div>
      ) : (
        <UserTable
          users={users}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          onChangeStatus={handleChangeStatus}
          onResetPassword={handleOpenResetPassword}
          onDelete={setDeleteUserId}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {/* Pagination controls */}
      {!loading && users.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-bold text-slate-700">{pagination.total}</span> records
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={pagination.page === 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  pagination.page === p
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, pagination.pages))}
              disabled={pagination.page === pagination.pages}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="bg-slate-900 text-white p-5 flex items-center gap-3">
              <Key className="text-teal-400" size={20} />
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 leading-none">
                  Reset Password
                </h3>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  ADMIN SECURITY OVERRIDE
                </span>
              </div>
            </div>

            <form onSubmit={handleAdminResetPassword} className="p-6 space-y-4">
              <div className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-150">
                You are directly resetting the password for user:{' '}
                <strong className="text-slate-800 font-bold">{resetUser.name}</strong> ({resetUser.email}).
              </div>

              <div>
                <label className="form-label">New Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input font-mono"
                  placeholder="Type temporary password..."
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Provide at least 6 characters. Advise the user to update it upon sign in.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="btn-secondary py-1.5 px-3.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 px-3.5 text-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="p-6 text-center space-y-3">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-600">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-850">Confirm Deletion</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Are you sure you want to soft-delete this user account? The user status will be suspended and their login access revoked.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-150">
              <button
                onClick={() => setDeleteUserId(null)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="btn-danger py-1.5 px-3 text-xs"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
