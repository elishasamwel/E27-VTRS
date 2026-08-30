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
  KeyRound,
  Edit2,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('PORT_RELEASE');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getUsers(currentUser);
      setUsers(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormUsername('');
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('PORT_RELEASE');
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword(''); // leave blank if unchanged
    setFormRole(u.role);
    setFormIsActive(u.status === 'ACTIVE');
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formName.trim() || !formEmail.trim()) {
      showError('Please fill in all required fields.');
      return;
    }

    if (!isEditing && !formPassword.trim()) {
      showError('Password is required when creating a new user.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingUserId) {
        await ApiService.updateUser(
          editingUserId,
          {
            name: formName.trim(),
            email: formEmail.trim(),
            role: formRole,
            isActive: formIsActive,
            ...(formPassword.trim() ? { password: formPassword.trim() } : {}),
          },
          currentUser
        );
        showSuccess(`User account ${formUsername} updated.`);
      } else {
        await ApiService.createUser(
          {
            username: formUsername.trim().toLowerCase(),
            name: formName.trim(),
            email: formEmail.trim().toLowerCase(),
            password: formPassword.trim(),
            role: formRole,
          },
          currentUser
        );
        showSuccess(`User ${formUsername} created successfully.`);
      }

      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
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
      showSuccess(`User ${u.username} status set to ${newStatus}.`);
      loadUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to update user status.');
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
            <Anchor className="w-3 h-3 text-amber-600" /> Port Release User
          </span>
        );
      case 'GALCO_RECEIVING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <Warehouse className="w-3 h-3 text-emerald-600" /> GALCO Receiving User
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              User & Role Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Provision, manage roles, and control access permissions across Port and Yard stations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role Assignment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                    Loading user records...
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.id === currentUser?.id && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          @{u.username} • {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-4 px-4">
                    {u.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold"
                        title="Edit User Details / Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit User Profile & Role' : 'Create New User Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  disabled={isEditing}
                  placeholder="e.g. port_agent"
                  className="w-full p-2.5 border rounded-xl disabled:bg-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Juma Kassim"
                  className="w-full p-2.5 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. juma@galco.co.tz"
                  className="w-full p-2.5 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 border rounded-xl"
                  required={!isEditing}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border rounded-xl bg-white font-medium"
                >
                  <option value="ADMIN">ADMIN (Full Access & Manifest Upload)</option>
                  <option value="PORT_RELEASE">PORT RELEASE USER (Dar es Salaam Port)</option>
                  <option value="GALCO_RECEIVING">GALCO RECEIVING USER (GALCO Yard)</option>
                </select>
              </div>

              {isEditing && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Account is Active</span>
                  </label>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
