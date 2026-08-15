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

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Speech recognition is intentionally kept independent from Gemini and
  // MediaRecorder. Chrome can end a SpeechRecognition session by itself,
  // so we recreate it after a short delay instead of calling start() on the
  // same instance immediately from onend.
  const isRecordingActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSessionRef = useRef(0);
  const transcriptRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      setSeconds(0);
      setTranscript(initialTranscript || '');
      transcriptRef.current = initialTranscript || '';
      setErrorMsg(null);
      startRecordingProcess();
    } else {
      stopRecordingProcess();
    }

    return () => {
      stopRecordingProcess();
    };
  }, [isOpen]);

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
      } catch (e) {
        // Recognition may already be stopped.
      }
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || !isRecordingActiveRef.current || isPausedRef.current) {
      return;
    }

    if (recognitionStartingRef.current || recognitionRef.current) {
      return;
    }

    const sessionId = speechSessionRef.current;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let interimTranscript = '';

    recognition.onstart = () => {
      recognitionStartingRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let nextInterim = '';
      let nextFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (!text) continue;

        if (event.results[i].isFinal) {
          nextFinal += text.trim() + ' ';
        } else {
          nextInterim += text;
        }
      }

      if (nextFinal.trim()) {
        const existing = transcriptRef.current.trim();
        transcriptRef.current = `${existing}${existing ? ' ' : ''}${nextFinal.trim()}`.trim();
      }

      interimTranscript = nextInterim;
      const displayText = `${transcriptRef.current}${interimTranscript ? `${transcriptRef.current ? ' ' : ''}${interimTranscript}` : ''}`.trim();

      if (displayText) {
        setTranscript(displayText);
      }
    };

    recognition.onerror = (event: any) => {
      const error = event?.error || 'unknown';
      console.warn('Speech recognition warning:', error);

      // These are normal lifecycle errors and onend will restart the session.
      if (error === 'no-speech' || error === 'aborted' || error === 'audio-capture') {
        return;
      }

      // Permission errors need user action; repeatedly restarting only makes
      // the browser less predictable and can create a restart loop.
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setErrorMsg('Microphone access was denied. Please allow microphone access and try again.');
        isRecordingActiveRef.current = false;
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      recognitionStartingRef.current = false;

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      // Chrome may end recognition even while the user is still recording.
      // Recreate the recognition object after a small delay. A fresh object is
      // more reliable than calling start() immediately on the ended object.
      if (
        isRecordingActiveRef.current &&
        !isPausedRef.current &&
        sessionId === speechSessionRef.current
      ) {
        if (recognitionRestartTimerRef.current) {
          clearTimeout(recognitionRestartTimerRef.current);
        }

        recognitionRestartTimerRef.current = setTimeout(() => {
          recognitionRestartTimerRef.current = null;
          startSpeechRecognition();
        }, 250);
      }
    };

    recognitionRef.current = recognition;
    recognitionStartingRef.current = true;

    try {
      recognition.start();
    } catch (error) {
      recognitionStartingRef.current = false;
      recognitionRef.current = null;
      console.warn('Speech recognition start failed:', error);

      if (isRecordingActiveRef.current && !isPausedRef.current && sessionId === speechSessionRef.current) {
        recognitionRestartTimerRef.current = setTimeout(() => {
          recognitionRestartTimerRef.current = null;
          startSpeechRecognition();
        }, 500);
      }
    }
  };

  const startRecordingProcess = async () => {
    stopSpeechRecognition();
    setIsRecording(true);
    setIsPaused(false);
    isRecordingActiveRef.current = true;
    isPausedRef.current = false;
    speechSessionRef.current += 1;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // Get the microphone first. The live transcript is browser-native and
    // does not depend on Gemini being available.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isRecordingActiveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        // Record the audio independently so playback is still available.
        if (typeof window.MediaRecorder !== 'undefined') {
          try {
            const preferredType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) =>
              MediaRecorder.isTypeSupported(t)
            );
            const recorder = new MediaRecorder(
              stream,
              preferredType ? { mimeType: preferredType } : undefined
            );
            audioChunksRef.current = [];
            recorder.ondataavailable = (e: BlobEvent) => {
              if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
          } catch (err) {
            console.warn('MediaRecorder unavailable, note will save without audio:', err);
          }
        }

        // Web Audio is only used for the visualizer.
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
            if (analyserRef.current && !isPausedRef.current) {
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
      setErrorMsg('Microphone access is unavailable. Live transcription may not work until microphone access is enabled.');

      const simInterval = setInterval(() => {
        setAudioLevels(
          Array.from({ length: 10 }, () => Math.floor(Math.random() * 70) + 15)
        );
      }, 150);
      (window as any)._simInterval = simInterval;
    }

    // Start recognition after microphone initialization. This keeps the
    // browser speech service separate from the MediaRecorder lifecycle.
    if (isRecordingActiveRef.current && !isPausedRef.current) {
      startSpeechRecognition();
    }
  };

  const stopMediaRecorderAndGetBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(
          audioChunksRef.current.length
            ? new Blob(audioChunksRef.current, { type: recorder?.mimeType || 'audio/webm' })
            : null
        );
        return;
      }

      recorder.onstop = () => {
        const blob = audioChunksRef.current.length
          ? new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          : null;
        resolve(blob);
      };

      try {
        recorder.stop();
      } catch (e) {
        resolve(null);
      }
    });
  };

  const stopRecordingProcess = () => {
    isRecordingActiveRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);

    stopSpeechRecognition();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if ((window as any)._simInterval) {
      clearInterval((window as any)._simInterval);
      (window as any)._simInterval = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      isRecordingActiveRef.current = true;

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

      // Start a fresh speech session rather than trying to reuse an ended
      // recognition object.
      speechSessionRef.current += 1;
      startSpeechRecognition();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        try {
          mediaRecorderRef.current.resume();
        } catch (e) {}
      }
    } else {
      setIsPaused(true);
      isPausedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeechRecognition();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.pause();
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
    isRecordingActiveRef.current = false;
    isPausedRef.current = false;
    setIsProcessingAI(true);
    setErrorMsg(null);

    // Capture the final recorded audio BEFORE tearing down the stream/tracks.
    const audioBlob = await stopMediaRecorderAndGetBlob();
    stopRecordingProcess();

    let audioDataUrl: string | undefined;
    if (audioBlob && audioBlob.size > 0) {
      try {
        audioDataUrl = await blobToDataUrl(audioBlob);
      } catch (e) {
        console.warn('Failed to encode recorded audio, saving note without playback audio:', e);
      }
    }

    const finalTranscript = transcriptRef.current.trim() || transcript.trim() || initialTranscript || 'Voice recording without spoken text.';

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
        audioUrl: audioDataUrl,
        isPinned: false,
      };

      onSaveNote(newNote);
      setIsProcessingAI(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to summarize note with AI:', err);
      const fallbackNote: Note = {
        id: `note-${Date.now()}`,
        title: initialTitle || (finalTranscript ? finalTranscript.slice(0, 30) : 'Voice Note'),
        summary: finalTranscript || 'Recorded audio snippet.',
        content: `## Transcribed Audio\n\n${finalTranscript}`,
        type: 'voice',
        tags: ['Voice Note', 'Meeting'],
        keyTakeaways: [finalTranscript || 'Recorded audio snippet'],
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

            <div className="mt-5 text-3xl font-mono font-bold text-slate-900 tracking-wider">
              {formatTime(seconds)}
            </div>

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