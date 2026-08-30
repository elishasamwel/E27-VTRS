import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Shield,
  Anchor,
  Warehouse,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, switchDemoRole } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      showSuccess('Successfully signed in with Google.');
    } catch (err: any) {
      showError(err.message || 'Google sign in was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showError('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
      showSuccess('Welcome back! Successfully authenticated.');
    } catch (err: any) {
      showError(err.message || 'Invalid username/email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: 'ADMIN' | 'PORT_RELEASE' | 'GALCO_RECEIVING') => {
    const acc = DEMO_ACCOUNTS[role];
    setIdentifier(acc.email);
    setPassword(acc.pass);
    switchDemoRole(role);
    showSuccess(`Logged in as ${acc.name}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background Subtle Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 text-white font-black text-2xl shadow-xl ring-4 ring-blue-500/20 mb-4 tracking-wider">
            G
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            GALCO <span className="text-blue-400">ICDV</span> <span className="text-blue-400">VTMS</span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-medium">
            Vehicle Transfer Management System
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white">Sign in to your account</h2>
            <p className="text-xs text-slate-300">
              Access your designated role dashboard and operational queue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username/Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@galco.co.tz or username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-900/60 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
            <div className="flex items-center justify-between text-xs text-slate-300">
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
                onClick={() => showError('Please contact your System Administrator to reset your password.')}
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
                  <span>LOGIN TO SYSTEM</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

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
              <span>Sign in with Google (Firebase)</span>
            </button>
          </form>

          {/* Quick Demo Logins for Instant Role Evaluation */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Instant Demo Role Switcher</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-bold text-white block">Admin Login</span>
                    <span className="text-[10px] text-slate-400">admin@galco.co.tz • Full Access</span>
                  </div>
                </div>
                <span className="text-[11px] text-blue-400 group-hover:translate-x-0.5 transition-transform">
                  Enter ➔
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('PORT_RELEASE')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-white block">Port Release Officer</span>
                    <span className="text-[10px] text-slate-400">port@galco.co.tz • Release AT PORT vehicles</span>
                  </div>
                </div>
                <span className="text-[11px] text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  Enter ➔
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('GALCO_RECEIVING')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold text-white block">GALCO Yard Receiver</span>
                    <span className="text-[10px] text-slate-400">yard@galco.co.tz • Receive ON TRANSIT vehicles</span>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  Enter ➔
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
