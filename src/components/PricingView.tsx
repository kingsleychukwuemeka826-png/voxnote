import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  Check,
  Crown,
  FileText,
  ArrowRight,
  X,
  Lock,
  CheckCircle2,
  Clock,
  Mic,
  Bot,
  ShieldCheck,
  Zap,
  AudioLines,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, AuthUser, Note } from '../types';
import { createCheckoutSession, createPortalSession } from '../lib/billingService';
import { isFirebaseConfigured } from '../lib/firebase';

interface PricingViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClose?: () => void;
  isModal?: boolean;
  user?: AuthUser | null;
  isPro?: boolean;
  notes?: Note[];
}

const FREE_MONTHLY_MINUTES = 300;
const PRO_MONTHLY_MINUTES = 1500;
const PRO_MONTHLY_PRICE = 11000;
const PRO_ANNUAL_PRICE = 95000;
const PRO_ANNUAL_MONTHLY_EQUIVALENT = Math.round(PRO_ANNUAL_PRICE / 12);

function getMinutesUsedThisMonth(notes: Note[]): number {
  const now = new Date();
  const totalSeconds = notes
    .filter((n) => {
      if (n.type !== 'voice' || !n.durationSeconds) return false;
      const created = new Date(n.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    })
    .reduce((sum, n) => sum + (n.durationSeconds || 0), 0);
  return Math.round(totalSeconds / 60);
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

export const PricingView: React.FC<PricingViewProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  isModal = false,
  user,
  isPro: isProOverride,
  notes = [],
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [paymentReturnPending, setPaymentReturnPending] = useState(false);

  const isPro = isProOverride ?? (settings.isProPlan ?? false);
  const billingIsLive = isFirebaseConfigured;
  const minutesUsed = getMinutesUsedThisMonth(notes);
  const monthlyCap = isPro ? PRO_MONTHLY_MINUTES : FREE_MONTHLY_MINUTES;
  const usagePercent = Math.min(100, Math.round((minutesUsed / monthlyCap) * 100));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'success') return;
    window.history.replaceState({}, document.title, window.location.pathname);
    setPaymentReturnPending(true);
    setBillingError('');
  }, []);

  useEffect(() => {
    if (!paymentReturnPending) return;

    if (isPro) {
      setPaymentReturnPending(false);
      setUpgradeSuccess(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setPaymentReturnPending(false);
      setBillingError('Payment returned successfully, but Pro activation is still being confirmed. Please wait a moment and refresh if needed.');
    }, 20000);

    return () => window.clearTimeout(timer);
  }, [paymentReturnPending, isPro]);

  const handleUpgrade = async () => {
    setBillingError('');

    if (!user) {
      setBillingError('Please sign in first — go back and log in, then try again.');
      return;
    }

    setIsUpgrading(true);

    // In a live Firebase deployment, a failed Paystack request must NOT
    // silently fall through to the local/demo Pro activation path.
    if (billingIsLive) {
      const result = await createCheckoutSession(user.id, user.email, billingCycle);

      if (result.configured && result.url) {
        window.location.href = result.url;
        return;
      }

      setIsUpgrading(false);
      setBillingError(result.error || 'Unable to start the Paystack checkout. Please try again.');
      return;
    }

    // Local development fallback only.
    setTimeout(() => {
      setIsUpgrading(false);
      setUpgradeSuccess(true);
      onUpdateSettings({ ...settings, isProPlan: true, autoJoinMeetings: false });
      setTimeout(() => onClose?.(), 1800);
    }, 900);
  };

  const handleManageBilling = async () => {
    if (!user) {
      setBillingError('Please sign in to manage your subscription.');
      return;
    }

    setBillingError('');
    setIsUpgrading(true);

    if (!billingIsLive) {
      setIsUpgrading(false);
      setBillingError('Billing management is available after connecting Paystack.');
      return;
    }

    const result = await createPortalSession(user.id);
    setIsUpgrading(false);

    if (result.configured && result.url) {
      window.location.href = result.url;
      return;
    }

    setBillingError(
      result.error ||
        'No Paystack subscription could be found for this account. Complete a Pro subscription first, then try Manage Billing again.'
    );
  };

  const proFeatures = [
    { title: `${PRO_MONTHLY_MINUTES.toLocaleString()} Transcription Minutes / mo`, desc: 'Up to 1,500 minutes each month, including multi-hour voice recordings.', icon: Mic },
    { title: 'Meeting Mode', desc: 'Capture desktop meeting audio and microphone input for structured meeting notes.', icon: AudioLines },
    { title: 'Advanced AI Personas', desc: 'Tailor summaries for students, executives, creatives, developers, and more.', icon: Bot },
    { title: 'Smart AI Summaries & Action Items', desc: 'Turn conversations into structured summaries and actionable next steps.', icon: BrainCircuit },
    { title: 'Advanced Exports', desc: 'Export your notes in useful formats such as PDF and Markdown.', icon: FileText },
  ];

  return (
    <div className={`w-full max-w-4xl mx-auto ${isModal ? 'p-2 sm:p-4' : 'pb-24 pt-2'}`}>
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-indigo-200/40 via-purple-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-purple-200/30 via-indigo-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        {isModal && onClose && <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition z-10 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>}

        <AnimatePresence>
          {(upgradeSuccess || paymentReturnPending) && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4 border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">{paymentReturnPending && !upgradeSuccess ? <Clock className="w-9 h-9 animate-pulse" /> : <CheckCircle2 className="w-10 h-10" />}</div>
                <div className="space-y-1.5"><h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{paymentReturnPending && !upgradeSuccess ? 'Confirming your Pro plan…' : 'Welcome to Pro!'}</h3><p className="text-xs sm:text-sm font-medium text-slate-600">{paymentReturnPending && !upgradeSuccess ? 'Your payment was received. Voxnote is waiting for Paystack to confirm your subscription.' : `Your Pro features are now active, including ${PRO_MONTHLY_MINUTES.toLocaleString()} monthly transcription minutes.`}</p></div>
                {!paymentReturnPending && <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">PRO ACTIVE</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center space-y-3 max-w-xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold tracking-wide border border-indigo-100"><Crown className="w-3.5 h-3.5" /><span>VOXNOTE PRO</span></div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Upgrade to Pro</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">Unlock {PRO_MONTHLY_MINUTES.toLocaleString()} transcription minutes, Meeting Mode, advanced AI tools, and professional exports.</p>
          <div className="pt-2 flex items-center justify-center"><div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-inner"><button type="button" onClick={() => setBillingCycle('monthly')} className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${billingCycle === 'monthly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Monthly Billing</button><button type="button" onClick={() => setBillingCycle('annual')} className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${billingCycle === 'annual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><span>Annual Billing</span><span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white">Save 28%</span></button></div></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 relative z-10">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between space-y-6"><div className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-900">Free Tier</h3><p className="text-xs text-slate-500 font-medium mt-0.5">Basic AI Note-Taking</p></div><span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">Starter</span></div><div className="flex items-baseline gap-1"><span className="text-3xl font-extrabold text-slate-900">₦0</span><span className="text-xs font-semibold text-slate-500">/ forever</span></div><div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-2 shadow-2xs"><div className="flex items-center justify-between text-xs font-semibold"><span className="text-slate-600 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-indigo-500" /> Current Usage</span><span className="text-slate-900 font-bold">{minutesUsed} / {FREE_MONTHLY_MINUTES} mins</span></div><div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full transition-all ${!isPro && usagePercent >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, Math.round((minutesUsed / FREE_MONTHLY_MINUTES) * 100))}%` }} /></div><p className="text-[10px] text-slate-400 font-medium">{FREE_MONTHLY_MINUTES} minutes reset monthly</p></div><ul className="space-y-2.5 text-xs text-slate-600 pt-2"><li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /><span>{FREE_MONTHLY_MINUTES} free transcription minutes / mo</span></li><li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /><span>Manual voice recording & text notes</span></li><li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /><span>Standard AI summary synthesis</span></li><li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300 shrink-0" /><span>Meeting Mode</span></li><li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300 shrink-0" /><span>Advanced AI Personas</span></li><li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300 shrink-0" /><span>Advanced exports</span></li></ul></div><button onClick={isPro ? handleManageBilling : undefined} disabled={!isPro || isUpgrading} className={`w-full py-3 px-4 rounded-2xl text-xs font-bold text-center ${isPro ? 'bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>{isPro ? 'Manage Billing' : 'Current Plan'}</button></div>

          <div className="relative bg-gradient-to-b from-indigo-50/90 via-white to-purple-50/50 border-2 border-indigo-600 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl shadow-indigo-100/50"><div className="absolute -top-3.5 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1"><Crown className="w-3 h-3 text-amber-300" /> Most Popular</div><div className="space-y-4"><div><h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">Pro Plan <BrainCircuit className="w-4 h-4 text-indigo-600" /></h3><p className="text-xs text-indigo-700 font-semibold mt-0.5">For Power Users & Professionals</p></div><div><div className="flex items-baseline gap-1.5"><span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">{formatNaira(billingCycle === 'annual' ? PRO_ANNUAL_MONTHLY_EQUIVALENT : PRO_MONTHLY_PRICE)}</span><span className="text-xs sm:text-sm font-bold text-slate-500">/ month</span></div>{billingCycle === 'annual' ? <p className="text-xs font-bold text-indigo-700 mt-1">Billed annually as {formatNaira(PRO_ANNUAL_PRICE)}/yr — save {formatNaira(PRO_MONTHLY_PRICE * 12 - PRO_ANNUAL_PRICE)}</p> : <p className="text-xs font-medium text-slate-500 mt-1">Billed monthly. Switch to annual to save 28%.</p>}</div>{isPro && <div className="bg-white/80 border border-indigo-100 rounded-2xl p-3.5 space-y-2 shadow-2xs"><div className="flex items-center justify-between text-xs font-semibold"><span className="text-indigo-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-indigo-600" /> Current Usage</span><span className="text-slate-900 font-bold">{minutesUsed} / {PRO_MONTHLY_MINUTES.toLocaleString()} mins</span></div><div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full transition-all ${usagePercent >= 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${usagePercent}%` }} /></div><p className="text-[10px] text-indigo-400 font-medium">Resets monthly on your billing date</p></div>}<div className="space-y-3 pt-2"><p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900">EVERYTHING IN PRO INCLUDES:</p><div className="space-y-3">{proFeatures.map((item) => { const IconComp = item.icon; return <div key={item.title} className="flex items-start gap-3"><div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0 mt-0.5"><IconComp className="w-3.5 h-3.5" /></div><div><p className="text-xs font-bold text-slate-900 leading-snug">{item.title}</p><p className="text-[11px] text-slate-500 font-medium leading-tight">{item.desc}</p></div></div>; })}</div></div></div><div className="space-y-3 pt-2">{isPro ? <button type="button" onClick={handleManageBilling} disabled={isUpgrading} className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs text-center flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-70"><CheckCircle2 className="w-4 h-4" /> {isUpgrading ? 'Opening billing portal…' : 'Manage Pro Subscription'}</button> : <button type="button" onClick={handleUpgrade} disabled={isUpgrading || paymentReturnPending} className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-300/60 hover:shadow-indigo-400/80 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70"><span>{isUpgrading ? (billingIsLive ? 'Redirecting to secure checkout…' : 'Activating Pro…') : 'Get Pro'}</span>{!isUpgrading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />}</button>}{billingError && <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-center">{billingError}</p>}<div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium pt-1"><Lock className="w-3.5 h-3.5 text-slate-400" /><span>{billingIsLive ? 'Secure checkout powered by Paystack. Cancel anytime.' : 'Secure checkout. Cancel anytime.'}</span></div></div></div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center"><div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600"><ShieldCheck className="w-4 h-4 text-indigo-600" /><span>Secure payments</span></div><div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600"><Zap className="w-4 h-4 text-indigo-600" /><span>Automatic Pro activation</span></div><div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600"><CheckCircle2 className="w-4 h-4 text-indigo-600" /><span>Cancel anytime</span></div></div>
      </div>
    </div>
  );
};
