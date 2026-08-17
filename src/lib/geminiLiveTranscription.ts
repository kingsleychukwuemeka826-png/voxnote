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

  const startRecognition = () => {
    if (!Ctor || stopped || paused || recognition) return;

    const instance = new Ctor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.maxAlternatives = 1;

    instance.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i]?.[0]?.transcript || '';
        if (event.results[i]?.isFinal) finalText += text;
        else interim += text;
      }
      const cleanFinal = finalText.trim();
      if (cleanFinal) {
        finalTranscript = `${finalTranscript}${finalTranscript ? ' ' : ''}${cleanFinal}`.trim();
        options.onText(cleanFinal);
      }
      if (interim) options.onText(interim.trim());
    };

    instance.onerror = (event: any) => {
      const code = event?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        options.onError?.('Microphone/speech recognition permission was denied. Please allow microphone access and try again.');
      } else if (code && !['no-speech', 'aborted', 'audio-capture'].includes(code)) {
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
    try {
      instance.start();
    } catch {
      recognition = null;
      if (!stopped && !paused) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          startRecognition();
        }, 500);
      }
    }
  };

  if (!Ctor) {
    options.onError?.('Live speech transcription is not supported in this browser. Please use the latest Chrome or Edge.');
  }

  if (typeof window.MediaRecorder !== 'undefined') {
    try {
      const preferredType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.start(1000);
    } catch (error) {
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
  } catch {
    // Visualizer is optional.
  }

  startRecognition();

  return {
    pause() {
      if (stopped) return;
      paused = true;
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      if (recognition) {
        try { recognition.stop(); } catch { /* ignore */ }
        recognition = null;
      }
      if (recorder?.state === 'recording') {
        try { recorder.pause(); } catch { /* ignore */ }
      }
    },
    resume() {
      if (stopped) return;
      paused = false;
      if (recorder?.state === 'paused') {
        try { recorder.resume(); } catch { /* ignore */ }
      }
      startRecognition();
    },
    async stop() {
      if (stopped) return chunks.length ? new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }) : null;
      stopped = true;
      paused = false;
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      cleanupRecognition();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      analyser = null;
      if (audioContext && audioContext.state !== 'closed') {
        try { await audioContext.close(); } catch { /* ignore */ }
      }
      stream.getTracks().forEach(track => track.stop());

      const blob = await new Promise<Blob | null>(resolve => {
        if (!recorder || recorder.state === 'inactive') {
          resolve(chunks.length ? new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }) : null);
          return;
        }
        recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }) : null);
        try { recorder.stop(); } catch { resolve(null); }
      });
      return blob;
    }
  };
}
