import React, { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import api from '../services/api';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [qualifications, setQualifications] = useState(user?.qualifications || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'English');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';

  // Password strength checks for new password
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const isStrong = newPassword ? (hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar) : false;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Avatar file should be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const { data } = await api.post('/auth/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(data.imageUrl);
      toast.success('Avatar uploaded successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Avatar upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data } = await api.put('/auth/me', {
        name,
        avatar,
        bio,
        department,
        preferredLanguage,
        qualifications: isFaculty ? qualifications : undefined,
      });

      // Update Zustand store
      updateUser({
        name: data.user.name,
        avatar: data.user.avatar,
        bio: data.user.bio,
        department: data.user.department,
        qualifications: data.user.qualifications,
        preferredLanguage: data.user.preferredLanguage,
      });

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (!isStrong) {
      toast.error('New password does not meet strength requirements.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      toast.success(response.message || 'Password updated successfully!');
      // Clear password inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-white">👤 My Profile</h1>
        <p className="mt-1 text-sm text-white/40">Customize your display photo, contact details, and department bio</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Avatar & Quick Info */}
        <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="h-32 w-32 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div
                className="h-32 w-32 rounded-2xl flex items-center justify-center text-4xl font-bold text-white font-mono"
                style={{ background: 'linear-gradient(135deg, #4f63ff 0%, #9f7aea 100%)' }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Upload Overlay */}
            <label className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200">
              <span className="text-2xl">📸</span>
              <span className="text-[10px] text-white/80 font-bold mt-1 uppercase">Change Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {isUploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold text-white">{name || 'Unnamed User'}</h2>
            <p className="text-xs text-white/40 mt-0.5 capitalize">{user?.role} Profile</p>
            <p className="text-[10px] text-white/30 mt-1 font-mono">{user?.email}</p>
          </div>

          {department && (
            <div className="w-full pt-4 border-t border-white/5 text-left space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block">Department</span>
              <span className="text-xs text-white/70 font-medium">{department}</span>
            </div>
          )}
        </div>

        {/* Right Column: Profile Form Details */}
        <div className="glass-card p-6 md:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Profile Details</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Prof. Deepak Karuppasamy"
                  className="input-field text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="input-field text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Preferred Learning/Communication Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="input-field text-white cursor-pointer"
              >
                {['English', 'Tamil', 'Hindi', 'German', 'French'].map((lang) => (
                  <option key={lang} value={lang} className="bg-[#1a1d27]">
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {isFaculty && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Academic Qualifications</label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. Ph.D. in Machine Learning, M.Tech in CSE"
                  className="input-field text-white"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Bio / Professional Summary</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={isFaculty ? 'Describe your teaching methodology, research areas, and career focus...' : 'Tell the instructor and peers about your academic goals and interests...'}
                rows={5}
                className="input-field text-white resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary py-2.5 px-6 text-xs w-full sm:w-auto"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Profiles Details...
                  </span>
                ) : (
                  '💾 Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password Card Block */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-start-2 md:col-span-2 glass-card p-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">🔑 Change Password</h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                  >
                    {showPasswords ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Confirm New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field text-white"
                />
              </div>
            </div>

            {newPassword && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="col-span-full">
                  <p className="text-[11px] font-semibold text-white/70">New Password Requirements:</p>
                </div>
                <span className={`text-[10px] ${hasMinLength ? 'text-emerald-400' : 'text-white/30'}`}>
                  {hasMinLength ? '✓' : '○'} 8+ characters
                </span>
                <span className={`text-[10px] ${hasUppercase ? 'text-emerald-400' : 'text-white/30'}`}>
                  {hasUppercase ? '✓' : '○'} Uppercase
                </span>
                <span className={`text-[10px] ${hasLowercase ? 'text-emerald-400' : 'text-white/30'}`}>
                  {hasLowercase ? '✓' : '○'} Lowercase
                </span>
                <span className={`text-[10px] ${hasNumber ? 'text-emerald-400' : 'text-white/30'}`}>
                  {hasNumber ? '✓' : '○'} Number
                </span>
                <span className={`text-[10px] ${hasSpecialChar ? 'text-emerald-400' : 'text-white/30'}`}>
                  {hasSpecialChar ? '✓' : '○'} Special char
                </span>
                <span className={`text-[10px] ${newPassword === confirmNewPassword ? 'text-emerald-400' : 'text-white/30'}`}>
                  {newPassword === confirmNewPassword ? '✓' : '○'} Passwords match
                </span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword || (newPassword ? (!isStrong || newPassword !== confirmNewPassword) : true)}
                className="btn-primary py-2.5 px-6 text-xs w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating Password...
                  </span>
                ) : (
                  '🔒 Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
