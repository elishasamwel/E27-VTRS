import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ApiService } from '../services/api';
import { UserRole } from '../types';
import {
  Shield,
  Anchor,
  Warehouse,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginPendingMessage, setLoginPendingMessage] = useState<string | null>(null);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('PORT_RELEASE');
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoginPendingMessage(null);
    try {
      await loginWithGoogle();
      showSuccess('Successfully signed in with Google.');
    } catch (err: any) {
      showError(err.message || 'Google sign in was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginPendingMessage(null);

    if (!username.trim() || !password.trim()) {
      showError('Please enter both your Username and Password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
      showSuccess('Welcome back! Successfully logged in.');
    } catch (err: any) {
      const errMsg = err.message || 'Invalid username or password.';
      if (errMsg.toLowerCase().includes('pending') || errMsg.toLowerCase().includes('approval')) {
        setLoginPendingMessage(errMsg);
      } else {
        showError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccessMessage(null);

    if (!regName.trim() || !regUsername.trim() || !regPassword.trim()) {
      showError('Full name, username, and password are required.');
      return;
    }

    if (regPassword.length < 4) {
      showError('Password must be at least 4 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ApiService.register({
        name: regName.trim(),
        username: regUsername.trim().toLowerCase(),
        email: regEmail.trim().toLowerCase() || `${regUsername.trim().toLowerCase()}@e27.co.tz`,
        password: regPassword,
        role: regRole,
      });

      setRegSuccessMessage(result.message || 'Registration submitted! Awaiting Administrator approval.');
      showSuccess('Account registered! The Admin will approve your account.');
      // Clear form
      setRegName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err: any) {
      showError(err.message || 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background Subtle Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 text-white font-black text-2xl shadow-xl ring-4 ring-blue-500/20 mb-3 tracking-wider">
            E27
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            E27 <span className="text-blue-400">VTMS</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">
            Vehicle Transfer Management System • ICDV
          </p>
        </div>

        {/* Main Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
        >
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-2xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setRegSuccessMessage(null);
                setLoginPendingMessage(null);
              }}
              className={`py-2 px-3 rounded-xl transition-all ${
                mode === 'LOGIN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setRegSuccessMessage(null);
                setLoginPendingMessage(null);
              }}
              className={`py-2 px-3 rounded-xl transition-all ${
                mode === 'REGISTER'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Pending Approval Notice on Login */}
          {mode === 'LOGIN' && loginPendingMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Account Pending Approval</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                {loginPendingMessage}
              </p>
            </div>
          )}

          {/* Registration Success Message */}
          {mode === 'REGISTER' && regSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Registration Submitted!</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                {regSuccessMessage}
              </p>
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="mt-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username Only */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => showError('Please contact your System Administrator to reset your credentials.')}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>LOGIN TO VTMS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Role Fill Access */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Quick Role Logins:
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('admin');
                      setPassword('admin123');
                    }}
                    className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 font-semibold text-center transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-blue-400" />
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('port_officer');
                      setPassword('port123');
                    }}
                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-center transition-colors"
                  >
                    <Anchor className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                    Port Officer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('galco_receiver');
                      setPassword('yard123');
                    }}
                    className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-center transition-colors"
                  >
                    <Warehouse className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                    Yard Receiver
                  </button>
                </div>
              </div>

              {/* Google Authentication via Firebase */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900/80 px-2 text-slate-400 font-medium">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                <span>New operator? </span>
                <button
                  type="button"
                  onClick={() => setMode('REGISTER')}
                  className="text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                >
                  Register an account
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTRATION FORM (Role selection + Admin approval) */}
          {mode === 'REGISTER' && !regSuccessMessage && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div className="pb-1">
                <h2 className="text-sm font-bold text-white">Create New Account</h2>
                <p className="text-[11px] text-slate-300">
                  Select your role. An Admin will review and approve your account before activation.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Baraka Juma"
                  className="w-full px-3 py-2 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Username Only */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Username *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. baraka_juma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. baraka@e27.co.tz"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Choose Your Role *
                </label>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      regRole === 'PORT_RELEASE'
                        ? 'bg-amber-500/20 border-amber-400/80 text-white'
                        : 'bg-slate-900/60 border-white/15 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="PORT_RELEASE"
                      checked={regRole === 'PORT_RELEASE'}
                      onChange={() => setRegRole('PORT_RELEASE')}
                      className="text-amber-500 focus:ring-amber-400"
                    />
                    <Anchor className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Port Release Officer</div>
                      <div className="text-[10px] text-slate-400">Dar es Salaam Port (TPA) • Release AT PORT vehicles</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      regRole === 'GALCO_RECEIVING'
                        ? 'bg-emerald-500/20 border-emerald-400/80 text-white'
                        : 'bg-slate-900/60 border-white/15 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="GALCO_RECEIVING"
                      checked={regRole === 'GALCO_RECEIVING'}
                      onChange={() => setRegRole('GALCO_RECEIVING')}
                      className="text-emerald-500 focus:ring-emerald-400"
                    />
                    <Warehouse className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">E27 Yard Receiver</div>
                      <div className="text-[10px] text-slate-400">E27 Yard (ICDV) • Receive ON TRANSIT vehicles</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      regRole === 'ADMIN'
                        ? 'bg-blue-500/20 border-blue-400/80 text-white'
                        : 'bg-slate-900/60 border-white/15 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={regRole === 'ADMIN'}
                      onChange={() => setRegRole('ADMIN')}
                      className="text-blue-500 focus:ring-blue-400"
                    />
                    <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">System Administrator</div>
                      <div className="text-[10px] text-slate-400">Full system access, user approvals & manifests</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Submitting Registration...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>REGISTER ACCOUNT (PENDING APPROVAL)</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
