import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles, FileText, Search, ArrowRight, CheckCircle2, Play, Zap } from 'lucide-react';
import { Logo } from './Logo';

interface OnboardingViewProps { onComplete: () => void; onGetStarted: () => void; onLogin: () => void; }

const slides = [
  { id: 'capture', eyebrow: 'CAPTURE WITHOUT INTERRUPTIONS', title: 'Your thoughts, captured at the speed you think.', description: 'Record a voice note, meeting or idea and let Voxnote turn it into something you can actually use.', accent: 'indigo' },
  { id: 'organize', eyebrow: 'AI THAT DOES THE BUSYWORK', title: 'Messy recordings become clear notes.', description: 'Voxnote creates summaries, key takeaways, tags and action items automatically.', accent: 'violet' },
  { id: 'find', eyebrow: 'YOUR NOTES, ALWAYS WITH YOU', title: 'Ask your notes anything.', description: 'Search across your ideas and let AI surface the information you need in seconds.', accent: 'sky' },
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onGetStarted, onLogin }) => {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => setCurrent(prev => prev < slides.length - 1 ? prev + 1 : 0), 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const next = () => { setAutoPlay(false); if (current < slides.length - 1) setCurrent(current + 1); else onGetStarted(); };
  const isLast = current === slides.length - 1;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_5%,rgba(99,102,241,0.22),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(139,92,246,0.13),transparent_30%)]" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-indigo-500/10 blur-3xl" />

      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 py-5">
        <div className="flex items-center gap-2.5"><Logo className="w-9 h-9" rounded="rounded-xl" /><span className="font-extrabold tracking-tight">Voxnote</span></div>
        <div className="flex items-center gap-2"><span className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">AI note taking</span><button onClick={onLogin} className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition">Log in</button></div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-8 py-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] gap-8 lg:gap-14 items-center">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .35 }} className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-[9px] font-extrabold tracking-[0.18em] text-indigo-200"><span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />{slides[current].eyebrow}</div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.98] max-w-xl">{slides[current].title}</h1>
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-slate-400 max-w-md">{slides[current].description}</p>
              <div className="mt-7 flex items-center gap-3"><button onClick={next} className="group inline-flex items-center gap-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3.5 text-sm font-extrabold shadow-xl shadow-indigo-950/40 transition active:scale-[0.98]">{isLast ? 'Get started' : 'See how it works'}<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" /></button><button onClick={onComplete} className="text-xs font-bold text-slate-500 hover:text-slate-300 px-2 py-2 transition">Skip intro</button></div>
            </motion.div>
          </AnimatePresence>

          <div className="order-1 lg:order-2 h-[330px] sm:h-[390px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={current} initial={{ opacity: 0, scale: .92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.03, y: -10 }} transition={{ duration: .45 }} className="relative w-full max-w-[430px] h-[300px] sm:h-[350px]">
                <div className="absolute inset-0 rounded-[38px] border border-white/10 bg-white/[0.035] backdrop-blur-sm shadow-2xl" />
                <div className="absolute -inset-5 rounded-[50px] bg-indigo-500/10 blur-3xl" />
                {current === 0 && <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between"><div className="flex justify-between items-center"><div className="inline-flex items-center gap-2 rounded-full bg-indigo-500 text-white px-3 py-1.5 text-[10px] font-bold shadow-lg shadow-indigo-950/30"><Mic className="w-3.5 h-3.5" />Recording</div><span className="text-[10px] text-slate-500 font-mono">00:18</span></div><div className="flex items-center justify-center gap-1.5 h-20">{[25,45,70,100,55,85,35,70,95,50,80,40,65,100,45,75,30].map((h,i)=><motion.span key={i} animate={{ height: [`${h*.55}%`,`${h}%`,`${h*.65}%`] }} transition={{ duration: .8 + i*.02, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} className="w-2 rounded-full bg-gradient-to-t from-indigo-500 to-violet-300" />)}</div><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center gap-2 text-xs font-bold"><div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center"><Zap className="w-3.5 h-3.5" /></div>Live voice capture</div><p className="text-[10px] text-slate-500 mt-2">Your words stay focused on the moment. Voxnote handles the organization afterward.</p></div></div>}
                {current === 1 && <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-center gap-3"><div className="rounded-2xl bg-white text-slate-900 p-4 shadow-xl"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-extrabold"><Sparkles className="w-4 h-4 text-indigo-600" />AI summary</div><span className="text-[9px] font-bold text-emerald-600">READY</span></div><div className="mt-3 space-y-2"><div className="h-2 rounded-full bg-slate-100 w-full" /><div className="h-2 rounded-full bg-slate-100 w-11/12" /><div className="h-2 rounded-full bg-slate-100 w-8/12" /></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><FileText className="w-4 h-4 text-violet-300" /><p className="text-xs font-bold mt-2">Key takeaways</p><p className="text-[9px] text-slate-500 mt-1">The important ideas, distilled.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><CheckCircle2 className="w-4 h-4 text-emerald-300" /><p className="text-xs font-bold mt-2">Action items</p><p className="text-[9px] text-slate-500 mt-1">Tasks pulled from your words.</p></div></div></div>}
                {current === 2 && <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-center"><div className="rounded-[24px] bg-white text-slate-900 p-4 shadow-2xl"><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Search className="w-4 h-4" /></div><div><p className="text-xs font-extrabold">Ask your notes</p><p className="text-[9px] text-slate-400">Search your knowledge</p></div></div><div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-500">What did I decide about the project timeline?</div><div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3"><div className="flex items-center gap-2 text-[10px] font-bold text-indigo-700"><Sparkles className="w-3 h-3" />Voxnote found the answer</div><p className="text-[10px] text-slate-600 mt-2 leading-relaxed">The project timeline was moved to Thursday after the latest planning discussion.</p></div></div></div>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="relative z-20 px-5 sm:px-8 lg:px-12 pb-6 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">{slides.map((slide, index) => <button key={slide.id} onClick={() => { setAutoPlay(false); setCurrent(index); }} className={`h-1.5 rounded-full transition-all ${index === current ? 'w-10 bg-indigo-400' : 'w-2 bg-white/15 hover:bg-white/25'}`} aria-label={`Slide ${index + 1}`} />)}</div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600"><Play className="w-3 h-3" /> Auto intro</div>
      </footer>
    </div>
  );
};
