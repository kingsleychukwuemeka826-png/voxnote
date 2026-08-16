import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, CircleStop, MonitorUp, Pause, Play, ShieldCheck, X } from 'lucide-react';
import { Note } from '../types';

interface MeetingModeModalProps { isOpen: boolean; onClose: () => void; onSaveNote: (note: Note) => void; }
type State = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'done' | 'error';
type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; start: (audioTrack?: MediaStreamTrack) => void; stop: () => void; abort: () => void; onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null; };
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
declare global { interface Window { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor; } }

const MAX_SECONDS = 20 * 60;

export const MeetingModeModal: React.FC<MeetingModeModalProps> = ({ isOpen, onClose, onSaveNote }) => {
  const [state, setState] = useState<State>('idle');
  const [title, setTitle] = useState('Meeting Notes');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState('Meeting tab audio + microphone');
  const displayRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const shouldRestartRef = useRef(false);
  const transcriptRef = useRef('');

  const cleanup = () => {
    shouldRestartRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    displayRef.current?.getTracks().forEach(track => track.stop());
    displayRef.current = null;
    recognitionRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => {
      const paused = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      const seconds = Math.floor((Date.now() - startedAtRef.current - pausedTotalRef.current - paused) / 1000);
      setElapsed(Math.max(0, seconds));
      if (seconds >= MAX_SECONDS) stopMeeting();
    }, 500);
    return () => window.clearInterval(timer);
  }, [state]);

  const startRecognition = (track?: MediaStreamTrack) => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) throw new Error('Meeting transcription is not supported in this browser. Please use the latest Chrome or Edge.');
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = transcriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += `${text} `; else interimText += text;
      }
      transcriptRef.current = finalText.trim();
      setTranscript(transcriptRef.current);
      setInterim(interimText.trim());
    };
    recognition.onerror = (event) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        shouldRestartRef.current = false;
        setError('Microphone/speech recognition permission was denied.');
        setState('error');
      }
    };
    recognition.onend = () => {
      if (!shouldRestartRef.current) return;
      window.setTimeout(() => {
        try { track ? recognition.start(track) : recognition.start(); } catch { /* browser may already be restarting */ }
      }, 150);
    };
    recognitionRef.current = recognition;
    try {
      if (track) { recognition.start(track); setSource('Meeting tab audio transcription'); }
      else { recognition.start(); setSource('Microphone transcription'); }
    } catch {
      recognition.start();
      setSource('Microphone transcription');
    }
  };

  const startMeeting = async () => {
    setError(''); setTranscript(''); transcriptRef.current = ''; setInterim(''); setState('requesting');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Desktop meeting capture is not supported by this browser. Please use Chrome or Edge.');
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayRef.current = display;
      const audioTrack = display.getAudioTracks()[0];
      if (!audioTrack) throw new Error('No meeting audio was shared. In Chrome, select your meeting tab and enable Share audio.');
      display.getVideoTracks()[0]?.addEventListener('ended', stopMeeting);
      startedAtRef.current = Date.now(); pausedAtRef.current = 0; pausedTotalRef.current = 0; setElapsed(0);
      shouldRestartRef.current = true;
      try { startRecognition(audioTrack); } catch { startRecognition(); }
      setState('recording');
    } catch (e: any) { cleanup(); setError(e?.message || 'Capture permission was cancelled.'); setState('error'); }
  };

  const pauseMeeting = () => { if (state !== 'recording') return; shouldRestartRef.current = false; try { recognitionRef.current?.stop(); } catch { /* ignore */ } pausedAtRef.current = Date.now(); setState('paused'); };
  const resumeMeeting = () => { if (state !== 'paused') return; if (pausedAtRef.current) pausedTotalRef.current += Date.now() - pausedAtRef.current; pausedAtRef.current = 0; shouldRestartRef.current = true; try { recognitionRef.current?.start(displayRef.current?.getAudioTracks()[0]); } catch { try { recognitionRef.current?.start(); } catch { /* ignore */ } } setState('recording'); };

  const stopMeeting = async () => {
    if (!['recording', 'paused'].includes(state)) return;
    shouldRestartRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    displayRef.current?.getTracks().forEach(track => track.stop());
    displayRef.current = null;
    setState('processing');
    const text = transcriptRef.current.trim();
    if (!text) { setError('No speech was transcribed. Make sure the meeting tab is sharing audio and your browser supports speech recognition.'); setState('error'); return; }
    try {
      const response = await fetch('/api/generate-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: text, titleHint: title.trim() || 'Meeting Notes', categoryHint: 'Meeting' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || 'Meeting processing failed.'));
      onSaveNote({ id: `meeting-${Date.now()}`, title: data.title || title || 'Meeting Notes', summary: data.summary || 'Meeting recording processed by Voxnote.', content: data.formattedContent || text, type: 'voice', tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Meeting'], keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [], actionItems: Array.isArray(data.actionItems) ? data.actionItems.map((item: string, i: number) => ({ id: `meeting-action-${Date.now()}-${i}`, text: item, completed: false })) : [], sentiment: data.sentiment, createdAt: new Date().toISOString(), durationSeconds: elapsed });
      setState('done');
    } catch (e: any) { setError(e?.message || 'Meeting processing failed.'); setState('error'); }
  };

  if (!isOpen) return null;
  const time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  return <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-xl bg-white rounded-[30px] border border-slate-200 shadow-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><AudioLines className="w-5 h-5" /></div><div><h2 className="font-extrabold text-slate-900">Meeting Mode</h2><p className="text-xs text-slate-400 mt-1">Pro desktop meeting transcription</p></div></div><button onClick={onClose} disabled={state === 'recording' || state === 'paused' || state === 'processing'} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center disabled:opacity-30"><X className="w-4 h-4" /></button></div>
      <div className="p-6 space-y-5">
        {state === 'idle' && <><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3"><ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" /><div><p className="text-sm font-bold text-indigo-950">Capture a meeting from your desktop</p><p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">Select your Google Meet, Zoom, Teams or browser tab and enable Share audio. Voxnote will transcribe the meeting and turn it into structured notes.</p></div></div><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Meeting title" /><button onClick={startMeeting} className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-indigo-500"><MonitorUp className="w-4 h-4" />Start Meeting Capture</button></>}
        {(state === 'requesting' || state === 'recording' || state === 'paused') && <div className="space-y-5"><div className="text-center"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-extrabold"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />{state === 'requesting' ? 'Waiting for permission' : state === 'paused' ? 'Meeting paused' : 'Meeting recording'}</div><div className="text-5xl font-black text-slate-900 tabular-nums mt-5">{time}</div><p className="text-xs text-slate-400 mt-2">{source}</p></div><div className="max-h-44 overflow-y-auto rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs leading-relaxed text-slate-600">{transcript || 'Listening for the meeting…'}{interim && <span className="text-indigo-500"> {interim}</span>}</div>{state !== 'requesting' && <div className="flex justify-center gap-3"><button onClick={state === 'paused' ? resumeMeeting : pauseMeeting} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">{state === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}</button><button onClick={stopMeeting} className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center"><CircleStop className="w-5 h-5" /></button></div>}</div>}
        {state === 'processing' && <div className="py-10 text-center"><AudioLines className="w-10 h-10 mx-auto text-indigo-600 animate-pulse" /><h3 className="mt-4 font-extrabold text-slate-900">Turning your meeting into notes…</h3><p className="text-xs text-slate-400 mt-2">Voxnote is summarizing the transcript.</p></div>}
        {state === 'done' && <div className="py-8 text-center"><h3 className="font-extrabold text-slate-900">Meeting note created</h3><p className="text-xs text-slate-400 mt-2">Your meeting has been saved to All Notes.</p><button onClick={onClose} className="mt-6 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-extrabold">Done</button></div>}
        {state === 'error' && <div className="space-y-4"><div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">{error}</div><button onClick={() => { setError(''); setState('idle'); }} className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold">Try again</button></div>}
      </div>
    </div>
  </div>;
};