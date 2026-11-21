import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import { SpacixLogo } from './ProviderBrandIcon';

export type AuthViewMode = 'login' | 'register' | 'forgot' | 'reset';

export const AuthFormCard: React.FC<{
  initialMode?: AuthViewMode;
  onClose?: () => void;
  isModal?: boolean;
}> = ({ initialMode = 'login', onClose, isModal = false }) => {
  const {
    loginWithPassword,
    registerAccount,
    requestPasswordReset,
    confirmPasswordReset,
    navigate,
  } = useRuns();

  const [mode, setMode] = useState<AuthViewMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot / Reset Password state
  const [resetCode, setResetCode] = useState('');
  const [issuedCodeHint, setIssuedCodeHint] = useState<string | null>(null);
  const [emailDeliveredNotice, setEmailDeliveredNotice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (next: AuthViewMode) => {
    setError(null);
    setSuccessMsg(null);
    setMode(next);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginWithPassword({
      email: email.trim(),
      password,
      rememberMe,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Invalid email or password.');
      return;
    }
    if (onClose) onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await registerAccount({
      name: name.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      rememberMe,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Could not create account.');
      return;
    }
    if (onClose) onClose();
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIssuedCodeHint(null);
    setLoading(true);
    const res = await requestPasswordReset(email.trim());
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Could not send reset code.');
      return;
    }
    setEmailDeliveredNotice(Boolean(res.emailDelivered));
    if (res.resetCode) {
      setIssuedCodeHint(res.resetCode);
      setResetCode(res.resetCode);
    }
    setSuccessMsg(
      res.emailDelivered
        ? `A 6-digit password reset code has been sent to ${email.trim()}.`
        : `Verification code generated for ${email.trim()}. Enter the 6-digit code below to set your new password.`
    );
    setMode('reset');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    const res = await confirmPasswordReset({
      email: email.trim(),
      code: resetCode.trim(),
      newPassword: password,
      confirmPassword,
      rememberMe,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Invalid or expired reset code.');
      return;
    }
    if (onClose) onClose();
  };

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
      ? 1
      : password.length < 10
      ? 2
      : /[A-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password)
      ? 4
      : 3;

  return (
    <div className="w-full max-w-md bg-[#111114] border border-white/12 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <SpacixLogo size="md" />
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
            {mode === 'login' && 'Sign In to SPACIX'}
            {mode === 'register' && 'Create Studio Account'}
            {mode === 'forgot' && 'Forgot Password'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="text-xs text-zinc-400">
            {mode === 'login' &&
              'Access your studio generations, projects, and credit wallet.'}
            {mode === 'register' &&
              'Register your account to generate 4K cinema video, optical stills, and audio.'}
            {mode === 'forgot' &&
              'Enter your registered email address to receive a 6-digit password reset code.'}
            {mode === 'reset' &&
              'Enter your 6-digit verification code and choose a new password.'}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication dialog"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Switch Tabs (Sign In / Sign Up) */}
      {(mode === 'login' || mode === 'register') && (
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-950 border border-white/10">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              mode === 'login'
                ? 'bg-[#46ecd5] text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              mode === 'register'
                ? 'bg-[#46ecd5] text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-[#46ecd5]/10 border border-[#46ecd5]/30 text-xs text-[#46ecd5] space-y-1.5">
          <div>{successMsg}</div>
          {issuedCodeHint && !emailDeliveredNotice && (
            <div className="font-mono-tabular text-white bg-zinc-950/90 px-2.5 py-1.5 rounded border border-white/10">
              Verification Code: <strong className="text-[#46ecd5]">{issuedCodeHint}</strong>
            </div>
          )}
        </div>
      )}

      {/* 1. LOGIN FORM */}
      {mode === 'login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-[#46ecd5] hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-zinc-900 text-[#46ecd5] focus:ring-[#46ecd5]"
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In to SPACIX'}
          </button>

          <div className="pt-3 border-t border-white/10 text-center text-xs text-zinc-400">
            Don&apos;t have an account yet?{' '}
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="text-[#46ecd5] hover:underline font-semibold"
            >
              Create Account
            </button>
          </div>
        </form>
      )}

      {/* 2. REGISTER / SIGN UP FORM */}
      {mode === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name or studio alias"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  className="w-full pl-10 pr-9 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
                />
              </div>
            </div>
          </div>

          {password.length > 0 && (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((lvl) => (
                  <div
                    key={lvl}
                    className={`h-1 rounded-full ${
                      passwordStrength >= lvl ? 'bg-[#46ecd5]' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[11px] text-zinc-400">
                Password strength:{' '}
                {passwordStrength <= 1
                  ? 'Weak'
                  : passwordStrength === 2
                  ? 'Good'
                  : passwordStrength === 3
                  ? 'Strong'
                  : 'Very Strong'}
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-zinc-900 text-[#46ecd5]"
              />
              <span>Remember me on this device for 30 days</span>
            </label>

            <label className="flex items-start gap-2 text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-zinc-900 text-[#46ecd5]"
              />
              <span>
                I agree to the SPACIX{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    navigate('legal', { section: 'terms' });
                  }}
                  className="text-zinc-200 underline"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    navigate('legal', { section: 'privacy' });
                  }}
                  className="text-zinc-200 underline"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create SPACIX Account'}
          </button>

          <div className="pt-3 border-t border-white/10 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-[#46ecd5] hover:underline font-semibold"
            >
              Sign In
            </button>
          </div>
        </form>
      )}

      {/* 3. FORGOT PASSWORD FORM */}
      {mode === 'forgot' && (
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Account Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Generating Reset Code...' : 'Send Password Reset Code'}
          </button>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-[#46ecd5] hover:underline"
            >
              Already have a code?
            </button>
          </div>
        </form>
      )}

      {/* 4. RESET PASSWORD FORM */}
      {mode === 'reset' && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Account Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono-tabular tracking-widest bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 chars"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Reset Password & Sign In'}
          </button>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-zinc-300 hover:text-white"
            >
              ← Request another code
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-[#46ecd5] hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      )}

      {!isModal && (
        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#46ecd5]" />
          <span>PBKDF2-SHA256 encrypted credentials · Persistent MySQL session store</span>
        </div>
      )}
    </div>
  );
};

export const AuthPage: React.FC<{ initialMode?: AuthViewMode }> = ({ initialMode = 'login' }) => {
  const { models } = useRuns();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 py-10 quanta-dot-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(70,236,213,0.14),transparent_60%)] pointer-events-none" />
      <div className="max-w-[1160px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Cinema Brand Pitch */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#46ecd5]/10 border border-[#46ecd5]/30 text-xs font-mono-tabular text-[#46ecd5]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRODUCTION STUDIO AUTHENTICATION</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[0.95]">
            DIRECT, ARCHIVE & SCALE YOUR AI CINEMA PIPELINE
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-lg">
            Sign in or create your SPACIX Studio account to synthesize 4K video sequences, optical stills, and studio audio across {models.length} curated production models with atomic credit metering.
          </p>

          <div className="space-y-3 pt-2 text-xs sm:text-sm text-zinc-300">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-[#46ecd5]/15 border border-[#46ecd5]/40 flex items-center justify-center text-[#46ecd5] shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span>Private asset vault, project folders, and high-bitrate media downloads</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-[#46ecd5]/15 border border-[#46ecd5]/40 flex items-center justify-center text-[#46ecd5] shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span>Append-only credit ledger with automatic failed-run refunds</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-[#46ecd5]/15 border border-[#46ecd5]/40 flex items-center justify-center text-[#46ecd5] shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span>30-day persistent Remember Me sessions & encrypted password recovery</span>
            </div>
          </div>
        </div>

        {/* Right Auth Form Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <AuthFormCard initialMode={initialMode} />
        </div>
      </div>
    </div>
  );
};
