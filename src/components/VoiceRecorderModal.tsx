import React, { useState, useEffect, useRef } from 'react';
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

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Web Speech API & Mic Stream when opened
  useEffect(() => {
    if (isOpen) {
      setSeconds(0);
      setTranscript(initialTranscript || '');
      setErrorMsg(null);
      startRecordingProcess();
    } else {
      stopRecordingProcess();
    }

    return () => {
      stopRecordingProcess();
    };
  }, [isOpen]);

  const startRecordingProcess = async () => {
    setIsRecording(true);
    setIsPaused(false);

    // Timer
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // 1. Try Browser Web Speech API for real-time live text
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setTranscript(currentTranscript);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition warning:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition initialization error:', err);
      }
    }

    // 2. Try Web Audio API for real sound level visualizer
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVisualizer = () => {
            if (analyserRef.current && !isPaused) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const levels = Array.from(dataArray.slice(0, 10)).map(
                (v) => Math.max(12, Math.min(95, (v / 255) * 100))
              );
              setAudioLevels(levels);
            }
            animationFrameRef.current = requestAnimationFrame(updateVisualizer);
          };

          updateVisualizer();
        }
      }
    } catch (err) {
      console.warn('Microphone stream error, falling back to simulated audio waves:', err);
      // Fallback simulated waves
      const simInterval = setInterval(() => {
        setAudioLevels(
          Array.from({ length: 10 }, () => Math.floor(Math.random() * 70) + 15)
        );
      }, 150);
      (window as any)._simInterval = simInterval;
    }
  };

  const stopRecordingProcess = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if ((window as any)._simInterval) clearInterval((window as any)._simInterval);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    } else {
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishAndSynthesize = async () => {
    stopRecordingProcess();
    setIsProcessingAI(true);
    setErrorMsg(null);

    const finalTranscript = transcript.trim() || initialTranscript || 'Voice recording without spoken text.';

    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalTranscript,
          titleHint: initialTitle,
        }),
      });

      const data = await res.json();

      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: data.title || initialTitle || 'Voice Note',
        summary: data.summary || 'Summary of recorded voice note.',
        content: data.formattedContent || `## Notes\n\n${finalTranscript}`,
        type: 'voice',
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['Meeting', 'Voice Note'],
        keyTakeaways: data.keyTakeaways || [finalTranscript.slice(0, 100)],
        actionItems: (data.actionItems || []).map((item: string, idx: number) => ({
          id: `act-${Date.now()}-${idx}`,
          text: item,
          completed: false,
        })),
        sentiment: data.sentiment || 'Informational',
        createdAt: new Date().toISOString(),
        durationSeconds: seconds || 30,
        isPinned: false,
      };

      onSaveNote(newNote);
      setIsProcessingAI(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to summarize note with AI:', err);
      // Fallback local note creation
      const fallbackNote: Note = {
        id: `note-${Date.now()}`,
        title: initialTitle || (transcript ? transcript.slice(0, 30) : 'Voice Note'),
        summary: transcript || 'Recorded audio snippet.',
        content: `## Transcribed Audio\n\n${finalTranscript}`,
        type: 'voice',
        tags: ['Voice Note', 'Meeting'],
        keyTakeaways: [finalTranscript || 'Recorded audio snippet'],
        actionItems: [{ id: `act-${Date.now()}`, text: 'Review transcription', completed: false }],
        createdAt: new Date().toISOString(),
        durationSeconds: seconds || 15,
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-amber-400 opacity-75' : 'bg-red-400 opacity-75'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {isPaused ? 'Paused' : isProcessingAI ? 'AI Synthesizing...' : 'Live Voice Recording'}
              </span>
            </div>

            <button
              onClick={() => {
                stopRecordingProcess();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Central Animated Mic Pulse */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center">
              {!isPaused && !isProcessingAI && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.05, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute w-36 h-36 bg-indigo-100 rounded-full pointer-events-none"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute w-28 h-28 bg-indigo-50 rounded-full pointer-events-none"
                  />
                </>
              )}

              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                  isProcessingAI
                    ? 'bg-indigo-600 animate-pulse ring-4 ring-indigo-200 shadow-indigo-200'
                    : isPaused
                    ? 'bg-amber-500 ring-4 ring-amber-100'
                    : 'bg-indigo-600 ring-4 ring-indigo-100 shadow-indigo-200'
                }`}
              >
                {isProcessingAI ? (
                  <Sparkles className="w-10 h-10 text-white animate-spin" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            {/* Timer */}
            <div className="mt-5 text-3xl font-mono font-bold text-slate-900 tracking-wider">
              {formatTime(seconds)}
            </div>

            {/* Audio Waveform Bars */}
            <div className="flex items-center justify-center gap-1.5 h-12 mt-4 px-4 w-full max-w-xs">
              {audioLevels.map((lvl, idx) => (
                <motion.div
                  key={idx}
                  animate={{ height: isPaused || isProcessingAI ? '8px' : `${lvl}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-2 bg-indigo-600 rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Live Transcript Preview */}
          <div className="mt-2 mb-6">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span className="flex items-center gap-1 font-bold">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> Live Speech Transcription
              </span>
              <span className="text-[11px] text-slate-400">Auto-detecting...</span>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[90px] max-h-[140px] overflow-y-auto text-slate-800 text-xs leading-relaxed scrollbar-thin">
              {transcript ? (
                <p className="text-slate-800 font-normal">{transcript}</p>
              ) : (
                <p className="text-slate-400 italic text-center py-4">
                  Speak clearly into your microphone... Transcript will appear here live.
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={togglePause}
              disabled={isProcessingAI}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isPaused ? <Play className="w-4 h-4 fill-current text-slate-700" /> : <Pause className="w-4 h-4 text-slate-700" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              type="button"
              onClick={handleFinishAndSynthesize}
              disabled={isProcessingAI}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {isProcessingAI ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Generating Note...
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  Done & AI Summarize
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
