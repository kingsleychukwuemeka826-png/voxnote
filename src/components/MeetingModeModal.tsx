import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, CircleStop, MonitorUp, Pause, Play, ShieldCheck, X } from 'lucide-react';
import { Note } from '../types';

interface MeetingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: Note) => void;
}

type State = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'done' | 'error';
const MAX_SECONDS = 20 * 60;

function wavFromBlob(blob: Blob): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported by this browser.');
      const context = new AudioContextClass();
      try {
        const sourceBuffer = await context.decodeAudioData(await blob.arrayBuffer());
        const sampleRate = 12000;
        const frameCount = Math.max(1, Math.ceil(sourceBuffer.duration * sampleRate));
        const offline = new OfflineAudioContext(1, frameCount, sampleRate);
        const source = offline.createBufferSource();
        source.buffer = sourceBuffer;
        source.connect(offline.destination);
        source.start(0);
        const rendered = await offline.startRendering();
        const samples = rendered.getChannelData(0);
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
        text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
        for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * (samples[i] < 0 ? 0x8000 : 0x7fff), true);
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Could not prepare meeting audio.'));
        reader.readAsDataURL(new Blob([buffer], { type: 'audio/wav' }));
      } finally { await context.close().catch(() => undefined); }
    } catch (error) { reject(error); }
  });
}

export const MeetingModeModal: React.FC<MeetingModeModalProps> = ({ isOpen, onClose, onSaveNote }) => {
  const [state, setState] = useState<State>('idle');
  const [title, setTitle] = useState('Meeting Notes');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Browser tab audio + microphone');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const displayRef = useRef<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);

  const cleanup = () => {
    displayRef.current?.getTracks().forEach(t => t.stop());
    micRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close().catch(() => undefined);
    displayRef.current = null; micRef.current = null; audioContextRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => {
      const paused = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      const seconds = Math.floor((Date.now() - startedAtRef.current - pausedTotalRef.current - paused) / 1000);
      setElapsed(Math.max(0, seconds));
      if (seconds >= MAX_SECONDS) stopRecording();
    }, 500);
    return () => window.clearInterval(timer);
  }, [state]);

  const startRecording = async () => {
    setError(''); setState('requesting');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Desktop audio capture is not supported by this browser. Please use Chrome or Edge.');
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayRef.current = display;
      if (!display.getAudioTracks().length) throw new Error('No meeting audio was shared. In Chrome, select your meeting tab and enable Share audio.');
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported by this browser.');
      const context = new AudioContextClass();
      audioContextRef.current = context;
      const destination = context.createMediaStreamDestination();
      context.createMediaStreamSource(display).connect(destination);
      context.createMediaStreamSource(mic).connect(destination);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(destination.stream, { mimeType });
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onerror = () => { setError('The browser stopped the meeting capture unexpectedly.'); setState('error'); cleanup(); };
      display.getVideoTracks()[0]?.addEventListener('ended', stopRecording);
      recorder.start(1000); startedAtRef.current = Date.now(); pausedAtRef.current = 0; pausedTotalRef.current = 0; setElapsed(0); setStatus('Meeting tab audio + microphone'); setState('recording');
    } catch (e: any) { cleanup(); setError(e?.message || 'Capture permission was cancelled.'); setState('error'); }
  };

  const pauseRecording = () => { if (recorderRef.current?.state === 'recording') { recorderRef.current.pause(); pausedAtRef.current = Date.now(); setState('paused'); } };
  const resumeRecording = () => { if (recorderRef.current?.state === 'paused') { if (pausedAtRef.current) pausedTotalRef.current += Date.now() - pausedAtRef.current; pausedAtRef.current = 0; recorderRef.current.resume(); setState('recording'); } };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || (recorder.state !== 'recording' && recorder.state !== 'paused')) return;
    recorder.onstop = processRecording; recorder.stop(); cleanup(); setState('processing');
  };

  const processRecording = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (!blob.size) throw new Error('No meeting audio was captured.');
      setStatus('Preparing meeting audio…');
      const audioBase64 = await wavFromBlob(blob);
      const response = await fetch('/api/generate-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioBase64, titleHint: title.trim() || 'Meeting Notes', categoryHint: 'Meeting' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || 'Meeting processing failed.'));
      onSaveNote({
        id: `meeting-${Date.now()}`,
        title: data.title || title || 'Meeting Notes',
        summary: data.summary || 'Meeting recording processed by Voxnote.',
        content: data.formattedContent || '',
        type: 'voice',
        tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Meeting'],
        keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
        actionItems: Array.isArray(data.actionItems) ? data.actionItems.map((item: string, i: number) => ({ id: `meeting-action-${Date.now()}-${i}`, text: item, completed: false })) : [],
        sentiment: data.sentiment,
        createdAt: new Date().toISOString(),
        durationSeconds: elapsed,
      });
      setState('done');
    } catch (e: any) { setError(e?.message || 'Meeting processing failed.'); setState('error'); }
  };

  if (!isOpen) return null;
  const time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  return <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-xl bg-white rounded-[30px] border border-slate-200 shadow-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><AudioLines className="w-5 h-5" /></div><div><h2 className="font-extrabold text-slate-900">Meeting Mode</h2><p className="text-xs text-slate-400 mt-1">Capture meeting tab audio and your microphone</p></div></div><button onClick={onClose} disabled={state === 'recording' || state === 'paused' || state === 'processing'} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center disabled:opacity-30"><X className="w-4 h-4" /></button></div>
      <div className="p-6 space-y-5">
        {state === 'idle' && <><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3"><ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" /><div><p className="text-sm font-bold text-indigo-950">Pro Meeting Mode</p><p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">Choose your Google Meet, Zoom, Teams or browser tab and enable Share audio. Voxnote will combine that audio with your microphone and turn it into structured notes.</p></div></div><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Meeting title" /><button onClick={startRecording} className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-indigo-500"><MonitorUp className="w-4 h-4" />Start Meeting Capture</button></>}
        {(state === 'requesting' || state === 'recording' || state === 'paused') && <div className="text-center space-y-6 py-5"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-extrabold"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />{state === 'requesting' ? 'Waiting for permission' : state === 'paused' ? 'Meeting paused' : 'Meeting recording'}</div><div><div className="text-5xl font-black text-slate-900 tabular-nums">{time}</div><p className="text-xs text-slate-400 mt-2">{status}</p></div>{state !== 'requesting' && <div className="flex justify-center gap-3"><button onClick={state === 'paused' ? resumeRecording : pauseRecording} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">{state === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}</button><button onClick={stopRecording} className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center"><CircleStop className="w-5 h-5" /></button></div>}</div>}
        {state === 'processing' && <div className="py-10 text-center"><AudioLines className="w-10 h-10 mx-auto text-indigo-600 animate-pulse" /><h3 className="mt-4 font-extrabold text-slate-900">Turning your meeting into notes…</h3><p className="text-xs text-slate-400 mt-2">This can take a little while for longer recordings.</p></div>}
        {state === 'done' && <div className="py-8 text-center"><div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Play className="w-5 h-5" /></div><h3 className="mt-4 font-extrabold text-slate-900">Meeting note created</h3><p className="text-xs text-slate-400 mt-2">Your meeting has been saved to All Notes.</p><button onClick={onClose} className="mt-6 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-extrabold">Done</button></div>}
        {state === 'error' && <div className="space-y-4"><div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">{error}</div><button onClick={() => { setError(''); setState('idle'); }} className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold">Try again</button></div>}
      </div>
    </div>
  </div>;
};