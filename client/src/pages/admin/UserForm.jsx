import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import userService from '../../services/user.service';
import { ArrowLeft, Upload, Key, User, FileText, CheckCircle2, Shield } from 'lucide-react';

// Create Schema
const createSchema = z.object({
  name: z.string().min(1, 'Full name is required').trim(),
  email: z.string().min(1, 'Email is required').email('Invalid email address').trim(),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['admin', 'manager', 'staff', 'viewer'], { errorMap: () => ({ message: 'Select a valid role' }) }),
  status: z.enum(['active', 'inactive', 'suspended']),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

// Edit Schema
const editSchema = z.object({
  name: z.string().min(1, 'Full name is required').trim(),
  email: z.string().min(1, 'Email is required').email('Invalid email address').trim(),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['admin', 'manager', 'staff', 'viewer']),
  status: z.enum(['active', 'inactive', 'suspended'])
});

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState('');
  const [pwdStrength, setPwdStrength] = useState({ score: 0, text: 'Weak', color: 'bg-rose-500' });
  const [userMeta, setUserMeta] = useState({ createdAt: '', lastLogin: '' });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(isEditMode ? editSchema : createSchema),
    mode: 'onBlur',
    defaultValues: {
      role: 'staff',
      status: 'active',
      phone: '',
      department: ''
    }
  });

  // Watch password field to compute strength indicator
  const passwordVal = watch('password', '');

  useEffect(() => {
    if (!isEditMode) {
      // Calculate strength
      let score = 0;
      if (passwordVal.length >= 8) score += 1;
      if (/[0-9]/.test(passwordVal)) score += 1;
      if (/[A-Z]/.test(passwordVal)) score += 1;
      if (/[^A-Za-z0-9]/.test(passwordVal)) score += 1;

      let text = 'Weak';
      let color = 'bg-rose-500';
      if (score === 2) {
        text = 'Fair';
        color = 'bg-amber-400';
      } else if (score === 3) {
        text = 'Good';
        color = 'bg-teal-500';
      } else if (score === 4) {
        text = 'Strong';
        color = 'bg-emerald-500';
      }

      setPwdStrength({ score, text, color });
    }
  }, [passwordVal, isEditMode]);

  // Load user data on edit
  useEffect(() => {
    if (isEditMode) {
      const loadUser = async () => {
        try {
          setLoading(true);
          const data = await userService.getUser(id);
          const user = data.user;
          reset({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            department: user.department || '',
            role: user.role,
            status: user.status
          });
          if (user.avatar) {
            setAvatarBase64(user.avatar);
          }
          setUserMeta({
            createdAt: new Date(user.createdAt).toLocaleString(),
            lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never logged in'
          });
        } catch (error) {
          toast.error('Failed to load user information.');
          navigate('/admin/users');
        } finally {
          setLoading(false);
        }
      };
      loadUser();
    }
  }, [id, isEditMode, reset]);

  // Avatar Upload Base64 Handler
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      const payload = { ...data, avatar: avatarBase64 };

      if (isEditMode) {
        await userService.updateUser(id, payload);
        toast.success('User updated successfully.');
      } else {
        await userService.createUser(payload);
        toast.success('User created successfully.');
      }
      navigate('/admin/users');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving user profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 text-sm font-semibold">Loading profile information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEditMode ? 'Edit User Profile' : 'Add New User'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {isEditMode ? 'Modify account status, details, and permissions.' : 'Register a new user account.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
            <div className="relative group shrink-0">
              {avatarBase64 ? (
                <img
                  src={avatarBase64}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-md bg-slate-150"
                />
              ) : (
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-250 text-slate-400 text-xs text-center font-medium">
                  No Photo
                </div>
              )}
              <label
                htmlFor="avatar-file"
                className="absolute inset-0 bg-slate-900/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-xs"
              >
                <Upload size={16} className="mr-1" /> Change
              </label>
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-extrabold text-slate-700 text-sm">Profile Avatar</h3>
              <p className="text-slate-405 text-xs mt-1 leading-relaxed">
                Accepts JPG, PNG, or GIF. Max file size is 2MB. Drag/click to select.
              </p>
              {avatarBase64 && (
                <button
                  type="button"
                  onClick={() => setAvatarBase64('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold mt-2 underline"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'border-rose-500' : ''}`}
                placeholder="John Doe"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.name.message}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'border-rose-500' : ''}`}
                placeholder="john.doe@ripomaglobal.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="+1 (555) 000-0000"
                {...register('phone')}
              />
            </div>

            {/* Department */}
            <div>
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-input"
                placeholder="Logistics, Finance, IT..."
                {...register('department')}
              />
            </div>

            {/* Role select */}
            <div>
              <label className="form-label">User Role</label>
              <select
                className={`form-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2520stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8 ${
                  errors.role ? 'border-rose-500' : ''
                }`}
                {...register('role')}
              >
                <option value="viewer">Viewer</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.role.message}</p>
              )}
            </div>

            {/* Status select */}
            <div>
              <label className="form-label">Account Status</label>
              <select
                className="form-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2520stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                {...register('status')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Password - Add mode only */}
            {!isEditMode && (
              <div className="md:col-span-2 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <Key size={14} className="text-slate-450" />
                  <span>Security Password</span>
                </div>
                <div>
                  <input
                    type="password"
                    className={`form-input bg-white ${errors.password ? 'border-rose-500' : ''}`}
                    placeholder="Create user login password..."
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.password.message}</p>
                  )}
                </div>

                {/* Password strength visual indicator */}
                {passwordVal.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Password strength:</span>
                      <span className="font-bold text-slate-700">{pwdStrength.text}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-full rounded-full transition-colors duration-300 ${
                            i < pwdStrength.score ? pwdStrength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata Display - Edit mode only */}
          {isEditMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium leading-none">
              <div className="space-y-1.5">
                <span className="uppercase text-slate-400 font-semibold tracking-wider">Account Created</span>
                <p className="text-slate-700 font-bold">{userMeta.createdAt}</p>
              </div>
              <div className="space-y-1.5">
                <span className="uppercase text-slate-400 font-semibold tracking-wider">Last Login Session</span>
                <p className="text-slate-700 font-bold">{userMeta.lastLogin}</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="btn-secondary px-5 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-6 py-2.5"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isEditMode ? 'Update User' : 'Register User'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
