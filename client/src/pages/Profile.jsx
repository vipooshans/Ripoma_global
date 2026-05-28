import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/user.service';
import authService from '../services/auth.service';
import {
  User,
  Key,
  Shield,
  Upload,
  Calendar,
  Layers,
  Phone,
  Mail,
  History,
  Lock
} from 'lucide-react';

// Profile validation schema (Name, Phone, Department are editable)
const profileSchema = z.object({
  name: z.string().min(1, 'Full name is required').trim(),
  phone: z.string().optional(),
  department: z.string().optional()
});

// Password validation schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

// Helper to push actions to activity logs
export const logActivity = (actionText) => {
  try {
    const logs = JSON.parse(localStorage.getItem('ripoma_activity_logs') || '[]');
    const newLog = {
      id: Math.random().toString(36).substring(7),
      action: actionText,
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...logs].slice(0, 10); // Keep last 10
    localStorage.setItem('ripoma_activity_logs', JSON.stringify(updated));
    window.dispatchEvent(new Event('activity-updated'));
  } catch (e) {
    console.error(e);
  }
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const [avatarBase64, setAvatarBase64] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [activities, setActivities] = useState([]);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors }
  } = useForm({
    resolver: zodResolver(profileSchema)
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm({
    resolver: zodResolver(passwordSchema)
  });

  // Load user default values and activity logs
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name,
        phone: user.phone || '',
        department: user.department || ''
      });
      if (user.avatar) {
        setAvatarBase64(user.avatar);
      }
    }

    loadActivityLogs();

    const handleActivityChange = () => {
      loadActivityLogs();
    };

    window.addEventListener('activity-updated', handleActivityChange);
    return () => {
      window.removeEventListener('activity-updated', handleActivityChange);
    };
  }, [user, resetProfile]);

  const loadActivityLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('ripoma_activity_logs') || '[]');
      if (logs.length === 0) {
        // Seed default mock activities
        const mockLogs = [
          { id: '1', action: 'User profile loaded', timestamp: new Date(Date.now() - 50000).toISOString() },
          { id: '2', action: 'Login authentication token issued', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', action: 'Synchronized permissions manifest', timestamp: new Date(Date.now() - 14400000).toISOString() }
        ];
        localStorage.setItem('ripoma_activity_logs', JSON.stringify(mockLogs));
        setActivities(mockLogs);
      } else {
        setActivities(logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Profile image upload to base64
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

  // Submit Profile Changes
  const onProfileSubmit = async (data) => {
    try {
      setProfileSubmitting(true);
      const payload = {
        name: data.name,
        phone: data.phone,
        department: data.department,
        avatar: avatarBase64
      };

      const res = await userService.updateUser(user.id, payload);
      setUser(res.user); // update global context user
      logActivity('Updated profile information and avatar photo');
      toast.success('Profile details updated successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Submit Password Change
  const onPasswordSubmit = async (data) => {
    try {
      setPasswordSubmitting(true);
      await authService.changePassword(data.currentPassword, data.newPassword);
      logActivity('Successfully changed account password');
      toast.success('Your password has been changed successfully.');
      resetPassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Incorrect current password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage your personal information, update security credentials, and view login activity history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar + Profile details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
            {/* Avatar Upload */}
            <div className="relative group shrink-0 mb-4 cursor-pointer">
              {avatarBase64 ? (
                <img
                  src={avatarBase64}
                  alt={user?.name}
                  className="w-28 h-28 rounded-full object-cover border-2 border-slate-200 shadow-md bg-slate-100"
                />
              ) : (
                <div className="flex items-center justify-center w-28 h-28 rounded-full bg-teal-50 text-teal-600 border border-teal-150 font-extrabold text-3xl uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <label
                htmlFor="profile-avatar"
                className="absolute inset-0 bg-slate-900/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-xs"
              >
                <Upload size={16} className="mr-1.5" /> Upload Photo
              </label>
              <input
                id="profile-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <h3 className="font-extrabold text-slate-800 text-base text-center leading-none">
              {user?.name}
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider mt-2.5 border border-slate-200">
              {user?.role}
            </span>

            {/* Read-only system values */}
            <div className="w-full mt-6 space-y-4 pt-6 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Mail size={13} />
                  <span>Email</span>
                </span>
                <span className="font-bold text-slate-700 truncate max-w-[170px]">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Layers size={13} />
                  <span>Department</span>
                </span>
                <span className="font-bold text-slate-700">{user?.department || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Shield size={13} />
                  <span>Authority</span>
                </span>
                <span className="font-bold text-slate-700 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile info + Change Password + Activity Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <User size={16} className="text-teal-650" />
                <span>Personal Information</span>
              </h3>
            </div>
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className={`form-input ${profileErrors.name ? 'border-rose-500' : ''}`}
                    {...registerProfile('name')}
                  />
                  {profileErrors.name && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">{profileErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    {...registerProfile('phone')}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    {...registerProfile('department')}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="btn-primary py-2 px-4 text-xs shadow-teal-500/10"
                >
                  {profileSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Lock size={16} className="text-teal-650" />
                <span>Change Password</span>
              </h3>
            </div>
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Current password */}
                <div>
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className={`form-input ${passwordErrors.currentPassword ? 'border-rose-500' : ''}`}
                    placeholder="••••••••"
                    {...registerPassword('currentPassword')}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New password */}
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className={`form-input ${passwordErrors.newPassword ? 'border-rose-500' : ''}`}
                    placeholder="••••••••"
                    {...registerPassword('newPassword')}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">{passwordErrors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className={`form-input ${passwordErrors.confirmPassword ? 'border-rose-500' : ''}`}
                    placeholder="••••••••"
                    {...registerPassword('confirmPassword')}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-rose-500 text-xs mt-1 font-semibold">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="btn-primary py-2 px-4 text-xs shadow-teal-500/10"
                >
                  {passwordSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Activity Logs Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <History size={16} className="text-teal-650" />
                <span>Security Activity Log</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                Last 10 Actions
              </span>
            </div>

            <div className="p-6">
              <div className="relative border-l border-slate-150 pl-4 space-y-5">
                {activities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white group-hover:bg-teal-500 transition-colors" />
                    <div>
                      <p className="text-xs font-bold text-slate-700 leading-tight">
                        {act.action}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {new Date(act.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
