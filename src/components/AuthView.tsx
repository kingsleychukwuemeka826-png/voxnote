import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthUser } from '../types';
import { signUpWithEmail, logInWithEmail, logInWithGoogle, friendlyAuthError } from '../lib/authService';
import { isFirebaseConfigured } from '../lib/firebase';
import { Logo } from './Logo';

interface AuthViewProps {
  initialMode: 'signup' | 'login';
  onAuthenticated: (user: AuthUser) => void;
  onBack: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode, onAuthenticated, onBack }) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  const validate = () => {
    if (isSignup && name.trim().length < 2) return 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const user = isSignup
        ? await signUpWithEmail(name.trim(), email.trim(), password)
        : await logInWithEmail(email.trim(), password);
      onAuthenticated(user);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const user = await logInWithGoogle();
      onAuthenticated(user);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-96 bg-gradient-to-b from-indigo-100/60 via-indigo-50/30 to-transparent pointer-events-none" />

      <div className="pt-6 px-6 flex items-center z-10">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-8 z-10">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Logo className="w-9 h-9" rounded="rounded-xl" />
          <span className="text-base font-bold text-slate-900 tracking-tight">Voxnote</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1.5 mb-7">
          {isSignup
            ? 'Start turning your voice into organized notes.'
            : 'Log in to pick up right where you left off.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AnimatePresence mode="wait">
            {isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Full name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Okafor"
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{isSignup ? 'Create Account' : 'Log In'}</span>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!isFirebaseConfigured || isSubmitting}
          title={isFirebaseConfigured ? undefined : 'Add your Firebase keys to .env.local to enable this'}
          className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {!isFirebaseConfigured && (
          <p className="text-center text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 leading-relaxed">
            Running in local demo mode — accounts stay on this device. Add your Firebase keys to{' '}
            <code className="font-mono">.env.local</code> to enable real accounts, Google sign-in, and cloud sync.
          </p>
        )}

        <p className="text-center text-xs text-slate-500 mt-6">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }}
            className="font-bold text-indigo-600 hover:text-indigo-700"
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>

        <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
          By continuing, you agree to Voxnote's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
