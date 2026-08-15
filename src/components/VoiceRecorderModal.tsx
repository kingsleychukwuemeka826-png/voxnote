import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Pause, Play, Sparkles, X, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../types';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (newNote: Note) => void;
  initialTranscript?: string;
  initialTitle?: string;
}

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen, onClose, onSaveNote, initialTranscript = '', initialTitle = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 30, 60, 40, 80, 50, 30, 70, 45, 20]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionStartingRef = useRef(false);
  const speechSessionRef = useRef(0);
  const transcriptRef = useRef('');
  const isRecordingActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const isAndroidRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingProcess();
      return;
    }
    isAndroidRef.current = /Android/i.test(navigator.userAgent);
    setSeconds(0);
    setTranscript(initialTranscript || '');
    transcriptRef.current = initialTranscript || '';
    setErrorMsg(null);
    setIsPaused(false);
    isPausedRef.current = false;
    startRecordingProcess();
    return () => stopRecordingProcess();
  }, [isOpen]);

  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  };

  const stopSpeechRecognition = () => {
    speechSessionRef.current += 1;
    if (recognitionRestartTimerRef.current) {
      clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    recognitionStartingRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
      } catch (_) {}
    }
  };

  const startSpeechRecognition = (retry = 0) => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setErrorMsg('Live speech transcription is not supported by this browser. Please use the latest Chrome.');
      return;
    }
    if (!isRecordingActiveRef.current || isPausedRef.current || recognitionStartingRef.current || recognitionRef.current) return;

    const sessionId = speechSessionRef.current;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognitionStartingRef.current = false;
      setErrorMsg(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += `${text.trim()} `;
        else interim += text;
      }
      if (finalText.trim()) {
        const existing = transcriptRef.current.trim();
        transcriptRef.current = `${existing}${existing ? ' ' : ''}${finalText.trim()}`.trim();
      }
      const display = `${transcriptRef.current}${interim ? `${transcriptRef.current ? ' ' : ''}${interim}` : ''}`.trim();
      if (display) setTranscript(display);
    };

    recognition.onerror = (event: any) => {
      const error = event?.error || 'unknown';
      console.warn('Speech recognition error:', error);
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setErrorMsg('Chrome blocked speech recognition. Allow microphone access for Voxnote and reload the page.');
        isRecordingActiveRef.current = false;
        setIsRecording(false);
      } else if (error === 'network') {
        setErrorMsg('Chrome could not reach its speech recognition service. Check your internet connection.');
      }
    };

    recognition.onend = () => {
      recognitionStartingRef.current = false;
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (isRecordingActiveRef.current && !isPausedRef.current && sessionId === speechSessionRef.current) {
        recognitionRestartTimerRef.current = setTimeout(() => {
          recognitionRestartTimerRef.current = null;
          startSpeechRecognition();
        }, 400);
      }
    };

    recognitionRef.current = recognition;
    recognitionStartingRef.current = true;
    try {
      recognition.start();
    } catch (error) {
      recognitionStartingRef.current = false;
      recognitionRef.current = null;
      if (retry < 5 && isRecordingActiveRef.current && !isPausedRef.current) {
        recognitionRestartTimerRef.current = setTimeout(() => {
          recognitionRestartTimerRef.current = null;
          startSpeechRecognition(retry + 1);
        }, 500 + retry * 250);
      }
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds(value => value + 1), 1000);
  };

  const startRecordingProcess = async () => {
    stopSpeechRecognition();
    setIsRecording(true);
    setIsPaused(false);
    isRecordingActiveRef.current = true;
    isPausedRef.current = false;
    speechSessionRef.current += 1;
    startTimer();

    // Android Chrome can fail to deliver SpeechRecognition results when another
    // API already owns the microphone. Start speech recognition first and, on
    // Android, deliberately do not create a second MediaRecorder/AudioContext.
    // The browser speech service remains the single owner of the microphone.
    if (isAndroidRef.current) {
      startSpeechRecognition();
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isRecordingActiveRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        mediaStreamRef.current = stream;

        if (typeof window.MediaRecorder !== 'undefined') {
          try {
            const type = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t));
            const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
            audioChunksRef.current = [];
            recorder.ondataavailable = (event: BlobEvent) => { if (event.data?.size) audioChunksRef.current.push(event.data); };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
          } catch (error) {
            console.warn('MediaRecorder unavailable:', error);
          }
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const context = new AudioCtx();
          audioContextRef.current = context;
          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;
          const data = new Uint8Array(analyser.frequencyBinCount);
          const update = () => {
            if (analyserRef.current && !isPausedRef.current) {
              analyserRef.current.getByteFrequencyData(data);
              setAudioLevels(Array.from(data.slice(0, 10)).map(v => Math.max(12, Math.min(95, (v / 255) * 100))));
            }
            animationFrameRef.current = requestAnimationFrame(update);
          };
          update();
        }
      }
    } catch (error) {
      console.warn('Microphone stream error:', error);
      setErrorMsg('Microphone access is unavailable. Check Chrome microphone permissions.');
    }

    if (isRecordingActiveRef.current && !isPausedRef.current) startSpeechRecognition();
  };

  const stopMediaRecorderAndGetBlob = (): Promise<Blob | null> => new Promise(resolve => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resolve(audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type: recorder?.mimeType || 'audio/webm' }) : null);
      return;
    }
    recorder.onstop = () => resolve(audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' }) : null);
    try { recorder.stop(); } catch (_) { resolve(null); }
  });

  const stopRecordingProcess = () => {
    isRecordingActiveRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    stopSpeechRecognition();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { try { mediaRecorderRef.current.stop(); } catch (_) {} }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      isRecordingActiveRef.current = true;
      speechSessionRef.current += 1;
      startTimer();
      startSpeechRecognition();
      if (mediaRecorderRef.current?.state === 'paused') { try { mediaRecorderRef.current.resume(); } catch (_) {} }
    } else {
      setIsPaused(true);
      isPausedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeechRecognition();
      if (mediaRecorderRef.current?.state === 'recording') { try { mediaRecorderRef.current.pause(); } catch (_) {} }
    }
  };

  const formatTime = (totalSecs: number) => `${Math.floor(totalSecs / 60).toString().padStart(2, '0')}:${(totalSecs % 60).toString().padStart(2, '0')}`;

  const handleFinishAndSynthesize = async () => {
    isRecordingActiveRef.current = false;
    isPausedRef.current = false;
    setIsProcessingAI(true);
    setErrorMsg(null);
    const audioBlob = await stopMediaRecorderAndGetBlob();
    stopRecordingProcess();
    let audioDataUrl: string | undefined;
    if (audioBlob?.size) {
      try { audioDataUrl = await blobToDataUrl(audioBlob); } catch (_) {}
    }
    const finalTranscript = transcriptRef.current.trim() || transcript.trim() || initialTranscript || 'Voice recording without spoken text.';
    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, titleHint: initialTitle })
      });
      const data = await res.json();
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: data.title || initialTitle || 'Voice Note',
        summary: data.summary || 'Summary of recorded voice note.',
        content: data.formattedContent || `## Notes\n\n${finalTranscript}`,
        type: 'voice',
        tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Meeting', 'Voice Note'],
        keyTakeaways: data.keyTakeaways || [finalTranscript.slice(0, 100)],
        actionItems: (data.actionItems || []).map((item: string, idx: number) => ({ id: `act-${Date.now()}-${idx}`, text: item, completed: false })),
        sentiment: data.sentiment || 'Informational',
        createdAt: new Date().toISOString(), durationSeconds: seconds || 30,
        audioUrl: audioDataUrl, isPinned: false
      };
      onSaveNote(newNote); setIsProcessingAI(false); onClose();
    } catch (error) {
      console.error('Failed to summarize note with AI:', error);
      const fallbackNote: Note = {
        id: `note-${Date.now()}`, title: initialTitle || (finalTranscript ? finalTranscript.slice(0, 30) : 'Voice Note'),
        summary: finalTranscript || 'Recorded audio snippet.', content: `## Transcribed Audio\n\n${finalTranscript}`,
        type: 'voice', tags: ['Voice Note', 'Meeting'], keyTakeaways: [finalTranscript || 'Recorded audio snippet'],
        actionItems: [{ id: `act-${Date.now()}`, text: 'Review transcription', completed: false }],
        createdAt: new Date().toISOString(), durationSeconds: seconds || 15, audioUrl: audioDataUrl
      };
      onSaveNote(fallbackNote); setIsProcessingAI(false); onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl overflow-hidden relative text-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2"><span className="relative flex h-3 w-3"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-amber-400 opacity-75' : 'bg-red-400 opacity-75'}`}></span><span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`}></span></span><span className="text-xs font-bold uppercase tracking-wider text-slate-600">{isPaused ? 'Paused' : isProcessingAI ? 'AI Synthesizing...' : 'Live Voice Recording'}</span></div>
            <button onClick={() => { stopRecordingProcess(); onClose(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center"><div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isProcessingAI ? 'bg-indigo-600 animate-pulse ring-4 ring-indigo-200' : isPaused ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-indigo-600 ring-4 ring-indigo-100'}`}>{isProcessingAI ? <Sparkles className="w-10 h-10 text-white animate-spin" /> : <Mic className="w-10 h-10 text-white" />}</div></div>
            <div className="mt-5 text-3xl font-mono font-bold text-slate-900 tracking-wider">{formatTime(seconds)}</div>
            <div className="flex items-center justify-center gap-1.5 h-12 mt-4 px-4 w-full max-w-xs">{audioLevels.map((lvl, idx) => <motion.div key={idx} animate={{ height: isPaused || isProcessingAI ? '8px' : `${lvl}%` }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="w-2 bg-indigo-600 rounded-full" />)}</div>
          </div>
          <div className="mt-2 mb-6">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium"><span className="flex items-center gap-1 font-bold"><Volume2 className="w-3.5 h-3.5 text-indigo-600" /> Live Speech Transcription</span><span className="text-[11px] text-slate-400">Auto-detecting...</span></div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[90px] max-h-[140px] overflow-y-auto text-slate-800 text-xs leading-relaxed">{transcript ? <p>{transcript}</p> : <p className="text-slate-400 italic text-center py-4">Speak clearly into your microphone... Transcript will appear here live.</p>}</div>
            {errorMsg && <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={togglePause} disabled={isProcessingAI} className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50">{isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}{isPaused ? 'Resume' : 'Pause'}</button>
            <button type="button" onClick={handleFinishAndSynthesize} disabled={isProcessingAI} className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50">{isProcessingAI ? <><Sparkles className="w-4 h-4 animate-spin" />Generating Note...</> : <><Square className="w-4 h-4 fill-current" />Done & AI Summarize</>}</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};