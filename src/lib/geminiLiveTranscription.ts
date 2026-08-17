type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type Options = {
  onText: (text: string) => void;
  onLevel?: (levels: number[]) => void;
  onError?: (message: string) => void;
};

type Controller = {
  pause: () => void;
  resume: () => void;
  stop: () => Promise<Blob | null>;
  enhanceTranscript: (fallbackTranscript: string) => Promise<string | null>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export async function startGeminiLiveTranscription(options: Options): Promise<Controller> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let stopped = false;
  let paused = false;
  let recognition: SpeechRecognitionLike | null = null;
  let recorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  let analyser: AnalyserNode | null = null;
  let audioContext: AudioContext | null = null;
  let animationFrame = 0;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let finalTranscript = '';
  let lastEmittedFinal = '';
  let lastEmittedAt = 0;

  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;

  const cleanupRecognition = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try { recognition.stop(); } catch { /* already stopped */ }
      recognition = null;
    }
  };

  const emitFinalText = (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    const now = Date.now();
    if (cleaned === lastEmittedFinal && now - lastEmittedAt < 5000) return;
    lastEmittedFinal = cleaned;
    lastEmittedAt = now;
    finalTranscript = `${finalTranscript}${finalTranscript ? ' ' : ''}${cleaned}`.trim();
    options.onText(cleaned);
  };

  const getRecordingBlob = () => chunks.length
    ? new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
    : null;

  const enhanceTranscript = async (fallbackTranscript: string): Promise<string | null> => {
    const blob = getRecordingBlob();
    if (!blob || blob.size === 0) return null;
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const response = await fetch('/api/transcribe-meeting-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: dataUrl, mimeType: blob.type || 'audio/webm', fallbackTranscript }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      const enhanced = typeof data.transcript === 'string' ? data.transcript.trim() : '';
      return enhanced || null;
    } catch (error) {
      console.warn('Enhanced audio transcription unavailable:', error);
      return null;
    }
  };

  const startRecognition = () => {
    if (!Ctor || stopped || paused || recognition) return;
    const instance = new Ctor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.maxAlternatives = 1;
    instance.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i]?.[0]?.transcript || '';
        if (event.results[i]?.isFinal) finalText += `${text} `;
      }
      if (finalText.trim()) emitFinalText(finalText);
    };
    instance.onerror = (event: any) => {
      const code = event?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        options.onError?.('Microphone/speech recognition permission was denied. Please allow microphone access and try again.');
      } else if (code && !['no-speech', 'aborted', 'audio-capture', 'network'].includes(code)) {
        options.onError?.(`Live transcription warning: ${code}`);
      }
    };
    instance.onend = () => {
      if (recognition === instance) recognition = null;
      if (!stopped && !paused && Ctor) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          startRecognition();
        }, 250);
      }
    };
    recognition = instance;
    try { instance.start(); } catch {
      recognition = null;
      if (!stopped && !paused) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          startRecognition();
        }, 500);
      }
    }
  };

  if (!Ctor) options.onError?.('Live speech transcription is not supported in this browser. Please use the latest Chrome or Edge.');

  if (typeof window.MediaRecorder !== 'undefined') {
    try {
      const preferredType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      recorder.start(1000);
    } catch {
      options.onError?.('Audio recording could not start. The transcript can still be saved.');
    }
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (stopped) return;
        if (analyser && !paused) {
          analyser.getByteFrequencyData(data);
          options.onLevel?.(Array.from(data.slice(0, 10)).map(v => Math.max(12, Math.min(95, (v / 255) * 100))));
        }
        animationFrame = requestAnimationFrame(update);
      };
      update();
    }
  } catch {}

  startRecognition();

  return {
    pause() {
      if (stopped) return;
      paused = true;
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
      if (recorder?.state === 'recording') { try { recorder.pause(); } catch {} }
    },
    resume() {
      if (stopped) return;
      paused = false;
      if (recorder?.state === 'paused') { try { recorder.resume(); } catch {} }
      startRecognition();
    },
    async stop() {
      if (stopped) return getRecordingBlob();
      stopped = true;
      paused = false;
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      cleanupRecognition();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      analyser = null;
      if (audioContext && audioContext.state !== 'closed') { try { await audioContext.close(); } catch {} }
      stream.getTracks().forEach(track => track.stop());
      return await new Promise<Blob | null>(resolve => {
        if (!recorder || recorder.state === 'inactive') { resolve(getRecordingBlob()); return; }
        recorder.onstop = () => resolve(getRecordingBlob());
        try { recorder.stop(); } catch { resolve(getRecordingBlob()); }
      });
    },
    enhanceTranscript,
  };
}
