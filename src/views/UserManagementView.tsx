import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Users,
  UserPlus,
  Shield,
  Anchor,
  Warehouse,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  UserCheck,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit User Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('PORT_RELEASE');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Direct Credential Display Modal State (for admin to give to user directly)
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    username: string;
    password?: string;
    role: UserRole;
    isNew: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getUsers(currentUser);
      setUsers(data || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const pendingCount = users.filter((u) => u?.status === 'PENDING_APPROVAL').length;
  const activeCount = users.filter((u) => u?.status === 'ACTIVE').length;
  const inactiveCount = users.filter((u) => u?.status === 'INACTIVE').length;

  const filteredUsers = users.filter((u) => {
    if (!u) return false;
    if (statusFilter === 'PENDING' && u.status !== 'PENDING_APPROVAL') return false;
    if (statusFilter === 'ACTIVE' && u.status !== 'ACTIVE') return false;
    if (statusFilter === 'INACTIVE' && u.status !== 'INACTIVE') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchEmail;
    }
    return true;
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pwd);
    setShowPasswordText(true);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormUsername('');
    setFormName('');
    setFormEmail('');
    setFormPassword('E27@' + Math.floor(1000 + Math.random() * 9000));
    setShowPasswordText(true);
    setFormRole('PORT_RELEASE');
    setFormStatus('ACTIVE'); // Active by default so they can log in direct
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setEditingUserId(u.id);
    setFormUsername(u.username || '');
    setFormName(u.name || '');
    setFormEmail(u.email || '');
    setFormPassword(''); // leave blank if unchanged
    setShowPasswordText(false);
    setFormRole(u.role || 'PORT_RELEASE');
    setFormStatus(u.status || 'ACTIVE');
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanName = formName.trim();
    const cleanPassword = formPassword.trim();

    if (!cleanUsername || !cleanName) {
      showError('Please fill in username and full name.');
      return;
    }

    if (!isEditing && !cleanPassword) {
      showError('Password is required when creating a new user.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingUserId) {
        await ApiService.updateUser(
          editingUserId,
          {
            name: cleanName,
            email: formEmail.trim().toLowerCase() || `${cleanUsername}@e27.co.tz`,
            role: formRole,
            status: formStatus,
            ...(cleanPassword ? { password: cleanPassword } : {}),
          },
          currentUser
        );
        showSuccess(`User account @${cleanUsername} updated.`);

        if (cleanPassword) {
          setCreatedCredentials({
            name: cleanName,
            username: cleanUsername,
            password: cleanPassword,
            role: formRole,
            isNew: false,
          });
        }
      } else {
        await ApiService.createUser(
          {
            username: cleanUsername,
            name: cleanName,
            email: formEmail.trim().toLowerCase() || `${cleanUsername}@e27.co.tz`,
            password: cleanPassword,
            role: formRole,
            status: 'ACTIVE', // Direct active status
          },
          currentUser
        );
        showSuccess(`User @${cleanUsername} registered and active for direct login.`);

        // Open credentials popup
        setCreatedCredentials({
          name: cleanName,
          username: cleanUsername,
          password: cleanPassword,
          role: formRole,
          isNew: true,
        });
      }

      setShowModal(false);
      await loadUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (u: User) => {
    try {
      await ApiService.approveUser(u.id, currentUser);
      showSuccess(`Approved and activated user @${u.username} (${u.name || u.username}).`);
      await loadUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to approve user.');
    }
  };

  const handleToggleStatus = async (u: User) => {
    if (u.id === currentUser?.id) {
      showError('You cannot deactivate your own active session account.');
      return;
    }

    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ApiService.updateUser(u.id, { status: newStatus }, currentUser);
      showSuccess(`User @${u.username} status set to ${newStatus}.`);
      await loadUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to update user status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      showError('You cannot delete your own account while logged in.');
      setUserToDelete(null);
      return;
    }
    if (userToDelete.username === 'admin') {
      showError('Cannot delete the primary Administrator account.');
      setUserToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await ApiService.deleteUser(userToDelete.id, currentUser);
      showSuccess(`User @${userToDelete.username} (${userToDelete.name || userToDelete.username}) has been removed.`);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyCredentialsText = () => {
    if (!createdCredentials) return;
    const text = `E27 VTMS LOGIN CREDENTIALS
----------------------------------------
Full Name: ${createdCredentials.name}
Role: ${getRoleTitle(createdCredentials.role)}
Username: ${createdCredentials.username}
Password: ${createdCredentials.password || '(Current Password)'}
Status: ACTIVE (Direct Login Enabled)
----------------------------------------
You can log in directly at the E27 VTMS login page.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showSuccess('Credentials copied to clipboard! You can now send them to the user.');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const getRoleTitle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'System Administrator';
      case 'PORT_RELEASE':
        return 'Port Release Officer';
      case 'GALCO_RECEIVING':
        return 'E27 Yard Receiver';
      default:
        return 'System User';
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <Shield className="w-3 h-3 text-blue-600" /> Admin
          </span>
        );
      case 'PORT_RELEASE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <Anchor className="w-3 h-3 text-amber-600" /> Port Release Officer
          </span>
        );
      case 'GALCO_RECEIVING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <Warehouse className="w-3 h-3 text-emerald-600" /> E27 Yard Receiver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-900 border border-slate-200">
            User
          </span>
        );
    }
  };

  const getStatusBadge = (status?: User['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active (Direct Login)
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending Admin Approval
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Inactive
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl border border-blue-200">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                User &amp; Role Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Register users of any role, assign direct login credentials, approve operator accounts, and manage station access.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register &amp; Create User</span>
          </button>
        </div>
      </div>

      {/* Pending Approval Banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">
                {pendingCount} User Registration{pendingCount > 1 ? 's' : ''} Awaiting Admin Approval
              </div>
              <div className="text-xs text-amber-700">
                Self-registered operators waiting for activation. Click &quot;Approve &amp; Activate&quot; to authorize their logins.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            Review Pending Users ({pendingCount})
          </button>
        </div>
      )}

      {/* Status Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'INACTIVE'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by name, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">User Account</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Direct Login Status</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                    Loading registered user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                    No users matching selected filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const displayName = u.name || u.username || 'User';
                  const initials = displayName.trim().slice(0, 2).toUpperCase() || 'US';
                  return (
                    <tr key={`usr-row-${u.id || ''}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{displayName}</span>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              Username: <strong className="text-slate-800">@{u.username || 'unknown'}</strong>
                              {u.email && <span> • {u.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-4 px-4">{getStatusBadge(u.status)}</td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApprove(u)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                              title="Approve and activate this user"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Approve &amp; Activate</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold"
                            title="Edit User or Reset Password"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.status !== 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                u.status === 'ACTIVE'
                                  ? 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                          {u.username !== 'admin' && u.id !== currentUser?.id && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* User Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  {isEditing ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEditing ? 'Edit User / Reset Password' : 'Register & Create User Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isEditing
                      ? 'Update details or assign a new password'
                      : 'User will be active immediately for direct login'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Juma Kassim"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  disabled={isEditing}
                  placeholder="e.g. juma_port"
                  className="w-full p-2.5 border border-slate-300 rounded-xl disabled:bg-slate-100 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Used as login identifier.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. juma@e27.co.tz"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {isEditing ? 'New Password (leave empty to keep current)' : 'Password *'}
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={isEditing ? '••••••••' : 'Enter login password'}
                    className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!isEditing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Operational Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMIN">ADMIN — System Administrator (Full System Access)</option>
                  <option value="PORT_RELEASE">PORT_RELEASE — Port Release Officer (Dar es Salaam Port)</option>
                  <option value="GALCO_RECEIVING">GALCO_RECEIVING — E27 Yard Receiver (E27 Yard Station)</option>
                </select>
              </div>

              {isEditing && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Login Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  >
                    <option value="ACTIVE">ACTIVE (Allowed to Log In Immediately)</option>
                    <option value="PENDING_APPROVAL">PENDING_APPROVAL (Awaiting Admin Approval)</option>
                    <option value="INACTIVE">INACTIVE (Deactivated / Suspended)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    'Saving...'
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register &amp; Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Login Credentials Popup (to share with user) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {createdCredentials.isNew ? 'User Registered & Active!' : 'Credentials Updated!'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct login enabled. Give these credentials to the user.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credential Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-sans">Full Name:</span>
                <span className="font-bold text-slate-900">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-sans">Assigned Role:</span>
                <span className="font-bold text-blue-700">{getRoleTitle(createdCredentials.role)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-sans">Username:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {createdCredentials.username}
                </span>
              </div>
              {createdCredentials.password && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-sans">Password:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {createdCredentials.password}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-sans">Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                  ACTIVE (Direct Login Enabled)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              The user can now enter this <strong>Username</strong> and <strong>Password</strong> on the login page to access the system immediately.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={copyCredentialsText}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete User Account?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>
                <strong>Name:</strong> {userToDelete.name || userToDelete.username}
              </div>
              <div>
                <strong>Username:</strong> @{userToDelete.username}
              </div>
              <div>
                <strong>Role:</strong> {getRoleTitle(userToDelete.role)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 font-semibold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
