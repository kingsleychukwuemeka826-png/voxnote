import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Pause, Play, Sparkles, X, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../types';
import { startGeminiLiveTranscription } from '../lib/geminiLiveTranscription';

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
  isOpen,
  onClose,
  onSaveNote,
  initialTranscript = '',
  initialTitle = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 30, 60, 40, 80, 50, 30, 70, 45, 20]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveControllerRef = useRef<Awaited<ReturnType<typeof startGeminiLiveTranscription>> | null>(null);
  const transcriptRef = useRef('');
  const isRecordingActiveRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      void stopRecordingProcess();
      return;
    }

    setSeconds(0);
    setTranscript(initialTranscript || '');
    transcriptRef.current = initialTranscript || '';
    setErrorMsg(null);
    setIsPaused(false);
    isPausedRef.current = false;
    void startRecordingProcess();

    return () => {
      void stopRecordingProcess();
    };
  }, [isOpen]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds(value => value + 1), 1000);
  };

  const startRecordingProcess = async () => {
    await stopRecordingProcess();

    setIsRecording(true);
    setIsPaused(false);
    setErrorMsg(null);
    isRecordingActiveRef.current = true;
    isPausedRef.current = false;
    startTimer();

    try {
      const controller = await startGeminiLiveTranscription({
        onText: (text) => {
          if (!text) return;
          const cleaned = text.trim();
          if (!cleaned) return;

          const existing = transcriptRef.current.trim();
          const next = `${existing}${existing ? ' ' : ''}${cleaned}`.trim();
          transcriptRef.current = next;
          setTranscript(next);
        },
        onLevel: (levels) => {
          if (!isPausedRef.current) setAudioLevels(levels);
        },
        onError: (message) => {
          console.error('Gemini Live transcription:', message);
          setErrorMsg(message);
        },
      });

      if (!isRecordingActiveRef.current) {
        await controller.stop();
        return;
      }

      liveControllerRef.current = controller;
    } catch (error: any) {
      console.error('Unable to start live transcription:', error);
      setIsRecording(false);
      isRecordingActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      setErrorMsg(error?.message || 'Live transcription could not start. Please check your internet connection and microphone permission.');
    }
  };

  const stopRecordingProcess = async () => {
    isRecordingActiveRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const controller = liveControllerRef.current;
    liveControllerRef.current = null;
    if (controller) {
      try {
        await controller.stop();
      } catch (_) {}
    }
  };

  const togglePause = () => {
    const controller = liveControllerRef.current;
    if (!controller) return;

    if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      controller.resume();
      startTimer();
    } else {
      setIsPaused(true);
      isPausedRef.current = true;
      controller.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (totalSecs: number) =>
    `${Math.floor(totalSecs / 60).toString().padStart(2, '0')}:${(totalSecs % 60).toString().padStart(2, '0')}`;

  const handleFinishAndSynthesize = async () => {
    isRecordingActiveRef.current = false;
    isPausedRef.current = false;
    setIsProcessingAI(true);
    setErrorMsg(null);

    let audioDataUrl: string | undefined;
    const controller = liveControllerRef.current;
    liveControllerRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (controller) {
      try {
        const audioBlob = await controller.stop();
        if (audioBlob && audioBlob.size <= 2_000_000) {
          audioDataUrl = await blobToDataUrl(audioBlob);
        }
      } catch (error: any) {
        console.warn('Could not save recorded audio:', error);
        setErrorMsg(error?.message || 'The recording could not be processed.');
      }
    }

    const finalTranscript = transcriptRef.current.trim() || transcript.trim() || initialTranscript || '';

    if (!finalTranscript) {
      setIsProcessingAI(false);
      setErrorMsg((current) => current || 'No transcript was produced. Please try again.');
      return;
    }

    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, titleHint: initialTitle }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.details ? `${data.error}: ${data.details}` : (data?.error || 'AI note generation failed.'));

      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: data.title || initialTitle || 'Voice Note',
        summary: data.summary || 'Summary of recorded voice note.',
        content: data.formattedContent || `## Notes\n\n${finalTranscript}`,
        type: 'voice',
        tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['Meeting', 'Voice Note'],
        keyTakeaways: data.keyTakeaways || [finalTranscript.slice(0, 100)],
        actionItems: (data.actionItems || []).map((item: string, idx: number) => ({
          id: `act-${Date.now()}-${idx}`,
          text: item,
          completed: false,
        })),
        sentiment: data.sentiment || 'Informational',
        createdAt: new Date().toISOString(),
        durationSeconds: seconds || 30,
        audioUrl: audioDataUrl,
        isPinned: false,
      };

      onSaveNote(newNote);
      setIsProcessingAI(false);
      onClose();
    } catch (error: any) {
      console.error('Failed to summarize note with AI:', error);
      const fallbackNote: Note = {
        id: `note-${Date.now()}`,
        title: initialTitle || finalTranscript.slice(0, 30) || 'Voice Note',
        summary: finalTranscript,
        content: `## Transcribed Audio\n\n${finalTranscript}`,
        type: 'voice',
        tags: ['Voice Note', 'Meeting'],
        keyTakeaways: [finalTranscript],
        actionItems: [{ id: `act-${Date.now()}`, text: 'Review transcription', completed: false }],
        createdAt: new Date().toISOString(),
        durationSeconds: seconds || 15,
        audioUrl: audioDataUrl,
      };
      onSaveNote(fallbackNote);
      setIsProcessingAI(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl overflow-hidden relative text-slate-900"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-amber-400 opacity-75' : 'bg-red-400 opacity-75'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {isPaused ? 'Paused' : isProcessingAI ? 'AI Synthesizing...' : 'Live Voice Recording'}
              </span>
            </div>

            <button
              onClick={() => { void stopRecordingProcess(); onClose(); }}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center">
              {!isPaused && !isProcessingAI && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.05, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute w-36 h-36 bg-indigo-100 rounded-full pointer-events-none"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className="absolute w-28 h-28 bg-indigo-50 rounded-full pointer-events-none"
                  />
                </>
              )}
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isProcessingAI ? 'bg-indigo-600 animate-pulse ring-4 ring-indigo-200' : isPaused ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-indigo-600 ring-4 ring-indigo-100'}`}>
                {isProcessingAI ? <Sparkles className="w-10 h-10 text-white animate-spin" /> : <Mic className="w-10 h-10 text-white" />}
              </div>
            </div>

            <div className="mt-5 text-3xl font-mono font-bold text-slate-900 tracking-wider">{formatTime(seconds)}</div>

            <div className="flex items-center justify-center gap-1.5 h-12 mt-4 px-4 w-full max-w-xs">
              {audioLevels.map((level, idx) => (
                <motion.div
                  key={idx}
                  animate={{ height: isPaused || isProcessingAI ? '8px' : `${level}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-2 bg-indigo-600 rounded-full"
                />
              ))}
            </div>
          </div>

          <div className="mt-2 mb-6">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span className="flex items-center gap-1 font-bold"><Volume2 className="w-3.5 h-3.5 text-indigo-600" /> Live Speech Transcription</span>
              <span className="text-[11px] text-slate-400">Gemini Live + server fallback</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[90px] max-h-[140px] overflow-y-auto text-slate-800 text-xs leading-relaxed">
              {transcript ? <p>{transcript}</p> : <p className="text-slate-400 italic text-center py-4">Speak clearly into your microphone... Transcript will appear here live.</p>}
            </div>

            {errorMsg && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={togglePause}
              disabled={isProcessingAI || !liveControllerRef.current}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              type="button"
              onClick={handleFinishAndSynthesize}
              disabled={isProcessingAI}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isProcessingAI ? <><Sparkles className="w-4 h-4 animate-spin" />Generating Note...</> : <><Square className="w-4 h-4 fill-current" />Done & AI Summarize</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};