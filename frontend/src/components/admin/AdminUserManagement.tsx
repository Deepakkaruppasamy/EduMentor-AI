import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { ExcelImportWizard } from './ExcelImportWizard';
import { Loader } from '../common/Loader';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  department: string;
  semester?: number;
  phone?: string;
  courseName?: string;
  isActive: boolean;
  isFirstLogin: boolean;
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  
  // Generated credentials state (for manual creation or resets)
  const [genCredentials, setGenCredentials] = useState<{
    name: string;
    email: string;
    role: string;
    password: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    department: '',
    semester: '',
    phone: '',
    courseName: '',
    isActive: true,
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: 10,
          search,
          role: roleFilter,
          department: deptFilter
        }
      });
      if (response.data.success) {
        setUsers(response.data.users);
        setTotal(response.data.total);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load user directories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, deptFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/users', formData);
      if (response.data.success) {
        toast.success('User registered successfully.');
        setGenCredentials({
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
          password: response.data.generatedPassword,
        });
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register account.');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const response = await api.put(`/admin/users/${selectedUser._id}`, formData);
      if (response.data.success) {
        toast.success('User updated successfully.');
        setShowEditModal(false);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update account.');
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const response = await api.put(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      if (response.data.success) {
        toast.success(`Account has been ${!user.isActive ? 'enabled' : 'disabled'}.`);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    if (!window.confirm(`Are you sure you want to reset password for ${user.name}?`)) return;
    try {
      const response = await api.post(`/admin/users/${user._id}/reset-password`);
      if (response.data.success) {
        toast.success('Password successfully reset.');
        setGenCredentials({
          name: user.name,
          email: user.email,
          role: user.role,
          password: response.data.generatedPassword,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete user ${user.name}? This action is irreversible.`)) return;
    try {
      const response = await api.delete(`/admin/users/${user._id}`);
      if (response.data.success) {
        toast.success('User removed from directory.');
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const exportAllUsers = async () => {
    try {
      const response = await api.get('/admin/users', { params: { limit: 1000 } });
      if (response.data.success) {
        const list = response.data.users.map((u: any) => ({
          Name: u.name,
          Email: u.email,
          Role: u.role,
          Department: u.department,
          Semester: u.semester || '',
          Phone: u.phone || '',
          Course: u.courseName || '',
          Status: u.isActive ? 'Active' : 'Disabled'
        }));
        
        // Excel download
        const worksheet = XLSX.utils.json_to_sheet(list);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
        XLSX.writeFile(workbook, 'university_portal_users.xlsx');
        toast.success('User registry exported successfully!');
      }
    } catch (e) {
      toast.error('Failed to export user registry.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'student',
      department: '',
      semester: '',
      phone: '',
      courseName: '',
      isActive: true,
    });
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      semester: user.semester ? user.semester.toString() : '',
      phone: user.phone || '',
      courseName: user.courseName || '',
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadCredsPDF = () => {
    if (!genCredentials) return;
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('EduMentor AI - Account Credentials', 14, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Please deliver these credentials to the user securely. Password must be changed on first login.', 14, 28);
      doc.line(14, 32, 196, 32);

      doc.setFont('helvetica', 'bold');
      doc.text('Name:', 14, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(genCredentials.name, 45, 45);

      doc.setFont('helvetica', 'bold');
      doc.text('Email Address:', 14, 53);
      doc.setFont('helvetica', 'normal');
      doc.text(genCredentials.email, 45, 53);

      doc.setFont('helvetica', 'bold');
      doc.text('User Role:', 14, 61);
      doc.setFont('helvetica', 'normal');
      doc.text(genCredentials.role.toUpperCase(), 45, 61);

      doc.setFont('helvetica', 'bold');
      doc.text('Generated Password:', 14, 69);
      doc.setFont('courier', 'bold');
      doc.text(genCredentials.password, 45, 69);
      doc.setFont('helvetica', 'normal');

      doc.line(14, 76, 196, 76);
      doc.save(`${genCredentials.name.replace(/\s+/g, '_')}_credentials.pdf`);
      toast.success('Credentials PDF downloaded.');
    } catch (e) {
      toast.error('Failed to download credentials.');
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>👥</span> User Accounts Directory
          </h2>
          <p className="text-xs text-white/40">Add, edit, pre-approve, or disable student and faculty credentials</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportAllUsers} 
            className="px-4 py-2 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
          >
            📥 Export Registry
          </button>
          <button 
            onClick={() => setShowImportWizard(true)} 
            className="px-4 py-2 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
          >
            🧙‍♂️ Bulk Import
          </button>
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }} 
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
          >
            <span>➕</span> Add User Manually
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="md:col-span-2 relative">
          <input 
            type="text" 
            placeholder="Search by name, email, or course..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input-field pl-9 pr-4 py-2" 
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        </div>
        <div>
          <select 
            value={roleFilter} 
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }} 
            className="input-field py-2 bg-[#111318]"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Super Admin</option>
          </select>
        </div>
        <div>
          <select 
            value={deptFilter} 
            onChange={e => { setDeptFilter(e.target.value); setPage(1); }} 
            className="input-field py-2 bg-[#111318]"
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electrical Engineering">Electrical Engineering</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Administration">Administration</option>
          </select>
        </div>
      </form>

      {/* Directory Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <Loader message="Loading accounts directory..." />
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-sm text-white/30">
            No accounts found matching search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white/[0.03] text-white/50 border-b border-white/5 font-semibold">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Course / Sem</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-white/80">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-white/[0.01]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ background: user.role === 'admin' ? '#f6ad55' : user.role === 'faculty' ? '#9f7aea' : '#4f63ff' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-white/70">{user.email}</td>
                    <td className="p-4 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : user.role === 'faculty' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15' : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'}`}>
                        {user.role === 'admin' ? 'Super Admin' : user.role}
                      </span>
                    </td>
                    <td className="p-4 text-white/60">{user.department || '-'}</td>
                    <td className="p-4 font-mono text-white/60">
                      {user.role === 'student' ? `${user.courseName || '-'} (Sem ${user.semester || '-'})` : (user.courseName || '-')}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${user.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/15' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/15'}`}
                      >
                        {user.isActive ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(user)} 
                          className="p-1 text-white/40 hover:text-white/80 transition-colors"
                          title="Edit User"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleResetPassword(user)} 
                          className="p-1 text-white/40 hover:text-white/80 transition-colors"
                          title="Reset Password"
                        >
                          🔑
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)} 
                          className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                          title="Delete User"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-white/40 pt-2">
          <span>Showing page {page} of {totalPages} ({total} entries)</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(p - 1, 1))} 
              disabled={page === 1}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals & Wizards */}
      <AnimatePresence>
        {/* ADD USER MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 relative border border-white/10"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute right-4 top-4 text-white/40 hover:text-white/80">✕</button>
              <h3 className="text-lg font-bold text-white mb-4">Add User Manually</h3>
              <form onSubmit={handleCreateUser} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Email Address</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="johndoe@university.edu" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1">Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field bg-[#111318]">
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1">Department</label>
                    <input type="text" required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-field" placeholder="Computer Science" />
                  </div>
                </div>
                {formData.role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1">Course Code</label>
                      <input type="text" value={formData.courseName} onChange={e => setFormData({ ...formData, courseName: e.target.value })} className="input-field font-mono" placeholder="CS101" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1">Semester</label>
                      <input type="number" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} className="input-field" placeholder="1" min="1" max="8" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Phone Number (Optional)</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" placeholder="+1234567890" />
                </div>
                
                <p className="text-[10px] text-white/40 italic">
                  Note: A strong random temporary password will be automatically generated.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-5">Cancel</button>
                  <button type="submit" className="btn-primary px-6">Create Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 relative border border-white/10"
            >
              <button onClick={() => setShowEditModal(false)} className="absolute right-4 top-4 text-white/40 hover:text-white/80">✕</button>
              <h3 className="text-lg font-bold text-white mb-4">Edit User Details</h3>
              <form onSubmit={handleEditUser} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Email Address</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1">Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field bg-[#111318]">
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1">Department</label>
                    <input type="text" required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-field" />
                  </div>
                </div>
                {formData.role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1">Course Code</label>
                      <input type="text" value={formData.courseName} onChange={e => setFormData({ ...formData, courseName: e.target.value })} className="input-field font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1">Semester</label>
                      <input type="number" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} className="input-field" min="1" max="8" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Phone Number (Optional)</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-active" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-offset-0" />
                  <label htmlFor="edit-active" className="text-xs font-medium text-white/70">Account Enabled</label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary px-5">Cancel</button>
                  <button type="submit" className="btn-primary px-6">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* BULK IMPORT WIZARD */}
        {showImportWizard && (
          <ExcelImportWizard 
            onImportComplete={fetchUsers} 
            onClose={() => setShowImportWizard(false)} 
          />
        )}

        {/* GENERATED CREDENTIALS MODAL */}
        {genCredentials && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-md p-6 relative border border-white/15 text-center space-y-5"
            >
              <div className="h-12 w-12 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-full flex items-center justify-center mx-auto text-xl">
                🔐
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Generated Account Credentials</h3>
                <p className="text-xs text-white/40 mt-1">Copy or download these details now. The password is hashed and cannot be retrieved later.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 text-left text-xs font-mono">
                <div>
                  <span className="text-white/40 block">NAME:</span>
                  <span className="text-white font-semibold">{genCredentials.name}</span>
                </div>
                <div>
                  <span className="text-white/40 block">EMAIL:</span>
                  <span className="text-white">{genCredentials.email}</span>
                </div>
                <div>
                  <span className="text-white/40 block">ROLE:</span>
                  <span className="text-white capitalize">{genCredentials.role}</span>
                </div>
                <div>
                  <span className="text-white/40 block">TEMPORARY PASSWORD:</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-emerald-400 font-bold bg-white/5 px-2 py-1 rounded text-sm break-all">{genCredentials.password}</span>
                    <button 
                      onClick={() => copyToClipboard(genCredentials.password)} 
                      className="text-[10px] bg-primary-600 hover:bg-primary-500 text-white font-bold px-2 py-1 rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={downloadCredsPDF} 
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  📕 Download PDF
                </button>
                <button 
                  onClick={() => setGenCredentials(null)} 
                  className="btn-primary py-2.5 text-xs"
                >
                  OK, Closed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
