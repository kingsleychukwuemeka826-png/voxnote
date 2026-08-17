import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, CircleStop, MonitorUp, Pause, Play, ShieldCheck, Smartphone, X } from 'lucide-react';
import { Note } from '../types';

interface MeetingModeModalProps { isOpen: boolean; onClose: () => void; onSaveNote: (note: Note) => void; }
type State = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'done' | 'error';
const MAX_SECONDS = 20 * 60;

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export const MeetingModeModal: React.FC<MeetingModeModalProps> = ({ isOpen, onClose, onSaveNote }) => {
  const [state, setState] = useState<State>('idle');
  const [title, setTitle] = useState('Meeting Notes');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState('Meeting tab audio + microphone');
  const [isMobile, setIsMobile] = useState(false);

  const displayRef = useRef<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const mixedStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const stoppingRef = useRef(false);

  const cleanup = () => {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
    displayRef.current?.getTracks().forEach(track => track.stop());
    micRef.current?.getTracks().forEach(track => track.stop());
    mixedStreamRef.current?.getTracks().forEach(track => track.stop());
    displayRef.current = null;
    micRef.current = null;
    mixedStreamRef.current = null;
    try { audioContextRef.current?.close(); } catch { /* ignore */ }
    audioContextRef.current = null;
    destinationRef.current = null;
  };

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => () => cleanup(), []);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => {
      const paused = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      const seconds = Math.floor((Date.now() - startedAtRef.current - pausedTotalRef.current - paused) / 1000);
      setElapsed(Math.max(0, seconds));
      if (seconds >= MAX_SECONDS) void stopMeeting();
    }, 500);
    return () => window.clearInterval(timer);
  }, [state]);

  const waitForRecorderStop = () => new Promise<Blob>((resolve, reject) => {
    const recorder = recorderRef.current;
    if (!recorder) return reject(new Error('Meeting recorder is not available.'));
    const handleStop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      recorder.removeEventListener('stop', handleStop);
      recorder.removeEventListener('error', handleError);
      resolve(blob);
    };
    const handleError = () => {
      recorder.removeEventListener('stop', handleStop);
      recorder.removeEventListener('error', handleError);
      reject(new Error('The meeting audio recorder stopped unexpectedly.'));
    };
    recorder.addEventListener('stop', handleStop);
    recorder.addEventListener('error', handleError);
    try { recorder.stop(); } catch (e) { reject(e); }
  });

  const startMeeting = async () => {
    setError('');
    setTranscript('');
    setState('requesting');
    stoppingRef.current = false;
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone recording is not supported in this browser. Please use the latest Chrome, Edge, or Safari.');
      if (!window.MediaRecorder) throw new Error('Audio recording is not supported in this browser. Please update your browser and try again.');

      const useMobileCapture = isMobile || !navigator.mediaDevices?.getDisplayMedia;
      let mic: MediaStream;
      let recordingStream: MediaStream;

      if (useMobileCapture) {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        recordingStream = mic;
        micRef.current = mic;
        setSource('Phone microphone captured');
      } else {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const meetingAudio = display.getAudioTracks()[0];
        if (!meetingAudio) {
          display.getTracks().forEach(track => track.stop());
          throw new Error('No meeting audio was shared. In Chrome, select your meeting tab and enable Share audio.');
        }

        mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        displayRef.current = display;
        micRef.current = mic;

        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        audioContextRef.current = audioContext;
        destinationRef.current = destination;
        audioContext.createMediaStreamSource(new MediaStream([meetingAudio])).connect(destination);
        audioContext.createMediaStreamSource(mic).connect(destination);
        recordingStream = destination.stream;
        mixedStreamRef.current = recordingStream;

        display.getVideoTracks()[0]?.addEventListener('ended', () => { if (!stoppingRef.current) void stopMeeting(); });
        setSource('Meeting tab audio + microphone captured');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');
      const recorder = new MediaRecorder(recordingStream, { mimeType, audioBitsPerSecond: 64000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.start(1000);

      startedAtRef.current = Date.now();
      pausedAtRef.current = 0;
      pausedTotalRef.current = 0;
      setElapsed(0);
      setState('recording');
    } catch (e: any) {
      cleanup();
      setError(e?.name === 'NotAllowedError' ? 'Microphone permission was denied. Please allow microphone access and try again.' : (e?.message || 'Could not start meeting capture.'));
      setState('error');
    }
  };

  const pauseMeeting = () => {
    if (state !== 'recording') return;
    try { recorderRef.current?.pause(); } catch { /* ignore */ }
    pausedAtRef.current = Date.now();
    setState('paused');
  };

  const resumeMeeting = () => {
    if (state !== 'paused') return;
    if (pausedAtRef.current) pausedTotalRef.current += Date.now() - pausedAtRef.current;
    pausedAtRef.current = 0;
    try { recorderRef.current?.resume(); } catch { /* ignore */ }
    setState('recording');
  };

  const stopMeeting = async () => {
    if (!['recording', 'paused'].includes(state) || stoppingRef.current) return;
    stoppingRef.current = true;
    setState('processing');
    if (pausedAtRef.current) pausedTotalRef.current += Date.now() - pausedAtRef.current;
    pausedAtRef.current = 0;

    try {
      const audioBlob = await waitForRecorderStop();
      const mimeType = audioBlob.type || recorderRef.current?.mimeType || 'audio/webm';
      cleanup();

      if (!audioBlob.size) throw new Error('No meeting audio was captured. Please check your microphone permission and try again.');
      const audioDataUrl = await blobToDataUrl(audioBlob);
      const transcriptionResponse = await fetch('/api/transcribe-meeting-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: audioDataUrl, mimeType }),
      });
      const transcriptionData = await transcriptionResponse.json();
      if (!transcriptionResponse.ok) throw new Error(transcriptionData.details ? `${transcriptionData.error}: ${transcriptionData.details}` : (transcriptionData.error || 'Meeting transcription failed.'));
      const text = String(transcriptionData.transcript || '').trim();
      if (!text) throw new Error('No speech was detected in the recording. Make sure you were speaking near the phone microphone and try again.');
      setTranscript(text);

      const noteResponse = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, titleHint: title.trim() || 'Meeting Notes', categoryHint: 'Meeting' }),
      });
      const data = await noteResponse.json();
      if (!noteResponse.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || 'Meeting summary failed.'));

      onSaveNote({
        id: `meeting-${Date.now()}`,
        title: data.title || title || 'Meeting Notes',
        summary: data.summary || 'Meeting recording processed by Voxnote.',
        content: data.formattedContent || text,
        type: 'voice',
        tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Meeting'],
        keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
        actionItems: Array.isArray(data.actionItems) ? data.actionItems.map((item: string, i: number) => ({ id: `meeting-action-${Date.now()}-${i}`, text: item, completed: false })) : [],
        sentiment: data.sentiment,
        createdAt: new Date().toISOString(),
        durationSeconds: Math.max(1, elapsed),
      });
      setState('done');
    } catch (e: any) {
      cleanup();
      setError(e?.message || 'Meeting processing failed.');
      setState('error');
    } finally {
      stoppingRef.current = false;
    }
  };

  if (!isOpen) return null;
  const time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  return <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-xl bg-white rounded-[30px] border border-slate-200 shadow-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">{isMobile ? <Smartphone className="w-5 h-5" /> : <AudioLines className="w-5 h-5" />}</div><div><h2 className="font-extrabold text-slate-900">Meeting Mode</h2><p className="text-xs text-slate-400 mt-1">{isMobile ? 'Pro mobile meeting recording' : 'Pro desktop meeting transcription'}</p></div></div><button onClick={onClose} disabled={state === 'recording' || state === 'paused' || state === 'processing'} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center disabled:opacity-30"><X className="w-4 h-4" /></button></div>
      <div className="p-6 space-y-5">
        {state === 'idle' && <><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3"><ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" /><div><p className="text-sm font-bold text-indigo-950">{isMobile ? 'Record your meeting from your phone' : 'Capture a meeting from your desktop'}</p><p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">{isMobile ? 'Voxnote will record the microphone audio around your phone, then upload it securely for AI transcription and structured meeting notes. For direct Google Meet, Zoom, or Teams tab audio capture, use desktop Meeting Mode.' : 'Select your Google Meet, Zoom, Teams or browser tab, enable Share audio, and allow microphone access. Voxnote records both meeting audio and your microphone, then transcribes the recording with AI.'}</p></div></div><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Meeting title" /><button onClick={startMeeting} className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-indigo-500">{isMobile ? <Smartphone className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}{isMobile ? 'Start Mobile Meeting' : 'Start Meeting Capture'}</button></>}
        {(state === 'requesting' || state === 'recording' || state === 'paused') && <div className="space-y-5"><div className="text-center"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-extrabold"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />{state === 'requesting' ? 'Waiting for permission' : state === 'paused' ? 'Meeting paused' : 'Meeting recording'}</div><div className="text-5xl font-black text-slate-900 tabular-nums mt-5">{time}</div><p className="text-xs text-slate-400 mt-2">{source}</p></div><div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs leading-relaxed text-slate-600">{isMobile ? 'Keep Voxnote open and place the phone where it can clearly hear the meeting. The recording will be transcribed after you stop.' : 'Audio is being captured. The transcript will appear after you stop the meeting.'}</div>{state !== 'requesting' && <div className="flex justify-center gap-3"><button onClick={state === 'paused' ? resumeMeeting : pauseMeeting} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">{state === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}</button><button onClick={() => void stopMeeting()} className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center"><CircleStop className="w-5 h-5" /></button></div>}</div>}
        {state === 'processing' && <div className="py-10 text-center"><AudioLines className="w-10 h-10 mx-auto text-indigo-600 animate-pulse" /><h3 className="mt-4 font-extrabold text-slate-900">Transcribing your meeting…</h3><p className="text-xs text-slate-400 mt-2">Voxnote is converting the captured audio into a transcript and structured notes.</p></div>}
        {state === 'done' && <div className="py-8 text-center"><h3 className="font-extrabold text-slate-900">Meeting note created</h3><p className="text-xs text-slate-400 mt-2">Your meeting has been transcribed and saved to All Notes.</p><button onClick={onClose} className="mt-6 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-extrabold">Done</button></div>}
        {state === 'error' && <div className="space-y-4"><div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">{error}</div><button onClick={() => { setError(''); setState('idle'); }} className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold">Try again</button></div>}
      </div>
    </div>
  </div>;
};