import { GoogleGenAI, Modality } from '@google/genai';

const MODEL = 'gemini-3.1-flash-live-preview';
const TARGET_SAMPLE_RATE = 16000;

type LiveTranscriptionOptions = {
  onText: (text: string) => void;
  onLevel?: (levels: number[]) => void;
  onError?: (message: string) => void;
};

type LiveTranscriptionController = {
  pause: () => void;
  resume: () => void;
  stop: () => Promise<Blob | null>;
};

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  let offset = 0;

  for (let i = 0; i < outputLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = offset; j < nextOffset && j < input.length; j += 1) {
      sum += input[j];
      count += 1;
    }
    output[i] = count ? sum / count : 0;
    offset = nextOffset;
  }
  return output;
}

function int16ToBase64(input: Int16Array): string {
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function createWavBlob(chunks: Int16Array[]): Blob | null {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalSamples) return null;

  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      view.setInt16(offset, chunk[i], true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function getLiveToken(): Promise<string> {
  const response = await fetch('/api/live-token', { method: 'POST' });
  const rawBody = await response.text();

  let data: any = null;
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch (_) {
      throw new Error(`Live transcription server returned an invalid response (HTTP ${response.status}).`);
    }
  }

  if (!response.ok || !data?.token) {
    throw new Error(data?.error || `Live transcription server returned HTTP ${response.status}.`);
  }

  return data.token;
}

export async function startGeminiLiveTranscription(
  options: LiveTranscriptionOptions,
): Promise<LiveTranscriptionController> {
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let session: any = null;
  let stopped = false;
  let paused = false;
  const pcmChunks: Int16Array[] = [];

  try {
    const token = await getLiveToken();
    // Ephemeral Live tokens are scoped to the Live API version. Use the same
    // explicit v1beta version on the browser connection as the provisioning
    // endpoint instead of relying on the SDK default.
    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: 'v1beta' },
    });

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    audioContext = new AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();

    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);

    const config: any = {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: {},
      systemInstruction: 'You are Voxnote transcription service. Listen to the user and do not speak. Your only useful output is the input audio transcription. Preserve the speaker wording accurately.',
    };

    session = await ai.live.connect({
      model: MODEL,
      config,
      callbacks: {
        onopen: () => {},
        onmessage: (message: any) => {
          const text = message?.serverContent?.inputTranscription?.text;
          if (text) options.onText(text);
        },
        onerror: (event: any) => {
          console.error('Gemini Live error:', event);
          options.onError?.(event?.message || 'Gemini Live transcription encountered an error.');
        },
        onclose: (event: any) => {
          if (!stopped) options.onError?.(event?.reason || 'Gemini Live connection closed.');
        },
      },
    });

    processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      if (stopped || paused || !session) return;

      const input = event.inputBuffer.getChannelData(0);
      const sampled = downsample(input, audioContext!.sampleRate, TARGET_SAMPLE_RATE);
      const pcm = floatTo16BitPCM(sampled);
      pcmChunks.push(pcm);

      try {
        session.sendRealtimeInput({
          audio: {
            data: int16ToBase64(pcm),
            mimeType: `audio/pcm;rate=${TARGET_SAMPLE_RATE}`,
          },
        });
      } catch (error) {
        console.error('Failed to send Gemini Live audio:', error);
      }
    };

    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    const levelData = new Uint8Array(analyser.frequencyBinCount);
    const updateLevels = () => {
      if (stopped) return;
      analyser?.getByteFrequencyData(levelData);
      if (!paused && options.onLevel) {
        options.onLevel(Array.from(levelData.slice(0, 10)).map(v => Math.max(12, Math.min(95, (v / 255) * 100))));
      }
      requestAnimationFrame(updateLevels);
    };
    updateLevels();

    return {
      pause: () => { paused = true; },
      resume: () => { paused = false; },
      stop: async () => {
        if (stopped) return createWavBlob(pcmChunks);
        stopped = true;
        try { session?.close?.(); } catch (_) {}
        try { processor?.disconnect(); } catch (_) {}
        try { source?.disconnect(); } catch (_) {}
        try { analyser?.disconnect(); } catch (_) {}
        try { await audioContext?.close(); } catch (_) {}
        stream?.getTracks().forEach(track => track.stop());
        return createWavBlob(pcmChunks);
      },
    };
  } catch (error: any) {
    stopped = true;
    try { processor?.disconnect(); } catch (_) {}
    try { source?.disconnect(); } catch (_) {}
    try { await audioContext?.close(); } catch (_) {}
    stream?.getTracks().forEach(track => track.stop());
    const message = error?.message || 'Unable to start Gemini Live transcription.';
    options.onError?.(message);
    throw error;
  }
}
