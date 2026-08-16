import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, Mic2, Sparkles, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';
import { signUpWithEmail, logInWithEmail, logInWithGoogle, friendlyAuthError } from '../lib/authService';
import { isFirebaseConfigured } from '../lib/firebase';
import { Logo } from './Logo';

interface AuthViewProps { initialMode: 'signup' | 'login'; onAuthenticated: (user: AuthUser) => void; onBack: () => void; }

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
    if (validationError) { setError(validationError); return; }
    setError(''); setIsSubmitting(true);
    try {
      const user = isSignup ? await signUpWithEmail(name.trim(), email.trim(), password) : await logInWithEmail(email.trim(), password);
      onAuthenticated(user);
    } catch (err) { setError(friendlyAuthError(err)); } finally { setIsSubmitting(false); }
  };

  const handleGoogleSignIn = async () => {
    setError(''); setIsSubmitting(true);
    try { const user = await logInWithGoogle(); onAuthenticated(user); }
    catch (err) { setError(friendlyAuthError(err)); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.20),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(129,140,248,0.16),transparent_30%)]" />
      <div className="absolute -top-32 -left-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />

      <button onClick={onBack} className="absolute top-5 left-5 z-20 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center" aria-label="Back">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_460px] gap-8 items-center">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="hidden lg:block px-4 xl:px-10">
          <div className="flex items-center gap-3 mb-10"><Logo className="w-11 h-11" rounded="rounded-2xl" /><div><p className="font-extrabold text-xl tracking-tight">Voxnote</p><p className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-bold">Your second brain</p></div></div>
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200"><Sparkles className="w-3.5 h-3.5" /> AI-powered note taking</div>
            <h1 className="mt-5 text-5xl xl:text-6xl font-black tracking-tight leading-[0.98]">Think less about taking notes.<span className="block text-indigo-300">Think more about what matters.</span></h1>
            <p className="mt-5 text-sm xl:text-base leading-relaxed text-slate-400 max-w-md">Capture your voice, meetings and ideas. Voxnote turns them into organized, searchable notes with AI.</p>
            <div className="mt-8 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-300"><Mic2 className="w-3.5 h-3.5 text-indigo-300" /> Voice capture</span><span className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-300"><Sparkles className="w-3.5 h-3.5 text-violet-300" /> AI summaries</span><span className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-300"><ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Secure account</span></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, delay: 0.08 }} className="w-full">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.07] backdrop-blur-2xl shadow-2xl shadow-black/30 p-5 sm:p-7">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-6"><Logo className="w-9 h-9" rounded="rounded-xl" /><span className="font-extrabold">Voxnote</span></div>
            <div className="flex p-1 rounded-2xl bg-black/20 border border-white/5 mb-7">
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${!isSignup ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Log in</button>
              <button type="button" onClick={() => { setMode('signup'); setError(''); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${isSignup ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/30' : 'text-slate-400 hover:text-white'}`}>Create account</button>
            </div>
            <AnimatePresence mode="wait"><motion.div key={mode} initial={{ opacity: 0, x: isSignup ? 12 : -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isSignup ? -12 : 12 }} transition={{ duration: 0.18 }}>
              <h2 className="text-2xl font-black tracking-tight">{isSignup ? 'Create your Voxnote account' : 'Welcome back'}</h2>
              <p className="text-xs text-slate-400 mt-1.5 mb-6">{isSignup ? 'Your ideas deserve a place that keeps up.' : 'Your notes are waiting for you.'}</p>
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isSignup && <div><label className="text-[11px] font-bold text-slate-300 mb-1.5 block">Full name</label><div className="relative"><UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400/40" /></div></div>}
                <div><label className="text-[11px] font-bold text-slate-300 mb-1.5 block">Email address</label><div className="relative"><Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400/40" /></div></div>
                <div><label className="text-[11px] font-bold text-slate-300 mb-1.5 block">Password</label><div className="relative"><Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400/40" /><button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                {error && <p className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-xl px-3 py-2.5">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-950/30 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignup ? 'Create my account' : 'Log in to Voxnote'}</button>
              </form>
              <div className="flex items-center gap-3 my-5"><div className="h-px flex-1 bg-white/10" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">or</span><div className="h-px flex-1 bg-white/10" /></div>
              <button type="button" onClick={handleGoogleSignIn} disabled={!isFirebaseConfigured || isSubmitting} className="w-full py-3.5 rounded-2xl bg-white text-slate-900 border border-white text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"><svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" /></svg>Continue with Google</button>
              {!isFirebaseConfigured && <p className="text-center text-[10px] text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 mt-3">Local demo mode — connect Firebase to enable real accounts.</p>}
              <p className="text-center text-xs text-slate-500 mt-6">{isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}<button type="button" onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }} className="font-bold text-indigo-300 hover:text-indigo-200">{isSignup ? 'Log in' : 'Create one'}</button></p>
              <p className="text-center text-[9px] text-slate-600 mt-4">By continuing, you agree to Voxnote's Terms and Privacy Policy.</p>
            </motion.div></AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
