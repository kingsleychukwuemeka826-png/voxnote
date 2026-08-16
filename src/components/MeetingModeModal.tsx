import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, CheckCircle2, CircleStop, MonitorUp, Mic, Pause, Play, ShieldCheck, X } from 'lucide-react';
import { Note } from '../types';

interface MeetingModeModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSaveNote: (note: Note) => void;
}

type CaptureState = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'done' | 'error';

const MAX_MINUTES = 20;

export const MeetingModeModal: React.FC<MeetingModeModalProps> = ({ isOpen = true, onClose, onSaveNote }) => {
  const [state, setState] = useState<CaptureState>('idle');
  const [title, setTitle] = useState('Meeting Notes');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [sourceLabel, setSourceLabel] = useState('Browser tab / screen audio');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state !== 'recording' && state !== 'paused' && state !== 'processing') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state, onClose]);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => {
      if (!startedAtRef.current) return;
      const paused = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      const seconds = Math.floor((Date.now() - startedAtRef.current - pausedTotalRef.current - paused) / 1000);
      setElapsed(Math.max(0, seconds));
      if (seconds >= MAX_MINUTES * 60) stopRecording();
    }, 500);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => () => cleanupStreams(), []);

  const cleanupStreams = () => {
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => undefined);
    displayStreamRef.current = null;
    micStreamRef.current = null;
    audioContextRef.current = null;
  };

  const closeModal = () => {
    if (state === 'recording' || state === 'paused') {
      mediaRecorderRef.current?.stop();
    }
    cleanupStreams();
    mediaRecorderRef.current = null;
    onClose();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  const startMeeting = async () => {
    setError('');
    setState('requesting');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Desktop tab/screen audio capture is not supported by this browser. Please use a recent Chrome or Edge browser.');
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayStreamRef.current = displayStream;

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported by this browser.');
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      if (displayStream.getAudioTracks().length) {
        audioContext.createMediaStreamSource(displayStream).connect(destination);
        setSourceLabel('Meeting audio + microphone');
      } else {
        setSourceLabel('Microphone only — no shared tab audio was provided');
      }
      audioContext.createMediaStreamSource(micStream).connect(destination);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(destination.stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('The browser stopped the meeting capture unexpectedly.');
        setState('error');
        cleanupStreams();
      };
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopRecording();
      });

      recorder.start(1000);
      startedAtRef.current = Date.now();
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setElapsed(0);
      setState('recording');
    } catch (err: any) {
      cleanupStreams();
      setError(err?.message || 'Capture permission was cancelled.');
      setState('error');
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    pausedAtRef.current = Date.now();
    setState('paused');
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    if (pausedAtRef.current) pausedTotalRef.current += Date.now() - pausedAtRef.current;
    pausedAtRef.current = null;
    recorder.resume();
    setState('recording');
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || (recorder.state !== 'recording' && recorder.state !== 'paused')) return;
    recorder.onstop = () => processRecording();
    recorder.stop();
    setState('processing');
    cleanupStreams();
  };

  const processRecording = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (!blob.size) {
      setError('No meeting audio was captured. Make sure you selected a tab/window with audio.');
      setState('error');
      return;
    }

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Could not read recording.'));
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, titleHint: title.trim() || 'Meeting Notes', categoryHint: 'Meeting' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process meeting audio.');

      const note: Note = {
        id: `meeting-${Date.now()}`,
        title: data.title || title || 'Meeting Notes',
        summary: data.summary || 'Meeting recording processed by Voxnote.',
        content: data.formattedContent || '',
        type: 'voice',
        tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Meeting'],
        keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
        actionItems: Array.isArray(data.actionItems) ? data.actionItems.map((item: string, index: number) => ({ id: `meeting-action-${Date.now()}-${index}`, text: item, completed: false })) : [],
        sentiment: data.sentiment,
        createdAt: new Date().toISOString(),
        durationSeconds: elapsed,
      };
      onSaveNote(note);
      setState('done');
    } catch (err: any) {
      setError(err?.message || 'Meeting processing failed.');
      setState('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget && state !== 'recording' && state !== 'paused' && state !== 'processing') closeModal(); }}>
      <div className="w-full max-w-xl bg-white rounded-[30px] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 sm:px-7 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><AudioLines className="w-5 h-5" /></div>
            <div className="min-w-0"><h2 className="font-extrabold text-slate-900 tracking-tight">Meeting Mode</h2><p className="text-xs text-slate-400 mt-0.5 truncate">Desktop tab, screen and microphone capture</p></div>
          </div>
          <button type="button" onClick={closeModal} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Close Meeting Mode"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {state === 'idle' && (
            <>
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3"><ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" /><div><p className="text-sm font-bold text-indigo-950">Capture a meeting from your desktop</p><p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">Choose your Google Meet, Zoom, Teams or browser tab and enable its audio in Chrome's sharing dialog. Voxnote will record the shared audio together with your microphone.</p></div></div>
              <label className="block"><span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Meeting title</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm font-semibold" placeholder="e.g. Product Strategy Meeting" /></label>
              <div className="flex items-center justify-between text-xs text-slate-400"><span>Maximum MVP capture: 20 minutes</span><span>Chrome / Edge recommended</span></div>
              <button type="button" onClick={startMeeting} className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm hover:bg-indigo-500 transition flex items-center justify-center gap-2"><MonitorUp className="w-4 h-4" /> Start Meeting Capture</button>
            </>
          )}

          {(state === 'requesting' || state === 'recording' || state === 'paused') && (
            <div className="text-center py-4 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-xs font-extrabold"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> {state === 'requesting' ? 'Waiting for capture permission' : state === 'paused' ? 'Meeting paused' : 'Meeting recording'}</div>
              <div><div className="text-5xl font-black tracking-tight text-slate-900 tabular-nums">{formatTime(elapsed)}</div><p className="text-xs text-slate-400 mt-2">{sourceLabel}</p></div>
              {state !== 'requesting' && <div className="flex items-center justify-center gap-3"><button type="button" onClick={state === 'paused' ? resumeRecording : pauseRecording} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-800 font-bold text-sm flex items-center gap-2 hover:bg-slate-200">{state === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} {state === 'paused' ? 'Resume' : 'Pause'}</button><button type="button" onClick={stopRecording} className="px-5 py-3 rounded-2xl bg-rose-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-rose-500"><CircleStop className="w-4 h-4" /> End Meeting</button></div>}
              <p className="text-[11px] text-slate-400">Keep the meeting tab/window active in Chrome. If you stop sharing, Voxnote will finish the recording.</p>
            </div>
          )}

          {state === 'processing' && <div className="py-10 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse"><Mic className="w-6 h-6" /></div><h3 className="font-extrabold text-slate-900 mt-4">Creating your meeting note…</h3><p className="text-xs text-slate-400 mt-1">Voxnote is analyzing the captured audio.</p></div>}
          {state === 'done' && <div className="py-8 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-7 h-7" /></div><h3 className="font-extrabold text-slate-900 mt-4">Meeting note saved</h3><p className="text-xs text-slate-400 mt-1">Your summary, takeaways and action items are now in Notes.</p><button type="button" onClick={onClose} className="mt-5 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm">Done</button></div>}
          {state === 'error' && <div className="space-y-4"><div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-800 leading-relaxed">{error}</div><div className="flex gap-3"><button type="button" onClick={() => { setError(''); setState('idle'); }} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-800 font-bold text-sm hover:bg-slate-200">Try again</button><button type="button" onClick={closeModal} className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800">Close</button></div></div>}
        </div>
      </div>
    </div>
  );
};