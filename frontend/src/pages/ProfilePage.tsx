import React, { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [qualifications, setQualifications] = useState(user?.qualifications || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';

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
        qualifications: isFaculty ? qualifications : undefined,
      });

      // Update Zustand store
      updateUser({
        name: data.user.name,
        avatar: data.user.avatar,
        bio: data.user.bio,
        department: data.user.department,
        qualifications: data.user.qualifications,
      });

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
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
    </div>
  );
};
