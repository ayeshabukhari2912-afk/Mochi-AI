import type { PersonalityArchetype } from '../types.ts';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startVoiceCapture(
  onTranscript: (text: string) => void,
  onError: (message: string) => void,
  onEnd: () => void,
): () => void {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onError('Voice recognition is not supported in this browser.');
    onEnd();
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const result = event.results?.[0]?.[0]?.transcript?.trim();
    if (result) {
      onTranscript(result);
    }
  };

  recognition.onerror = (ev) => {
    onError(ev.error === 'not-allowed' ? 'Microphone access was denied.' : `Voice error: ${ev.error}`);
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
  } catch {
    onError('Could not start microphone capture.');
    onEnd();
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      // ignore
    }
  };
}

export function speakCompanionText(
  text: string,
  archetype: PersonalityArchetype,
  enabled: boolean,
  onSpeakingChange: (speaking: boolean) => void,
) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onSpeakingChange(true);
    const fallbackMs = Math.min(2400, Math.max(850, text.length * 32));
    window.setTimeout(() => onSpeakingChange(false), fallbackMs);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*[^*]+\*/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const pitchMap: Record<PersonalityArchetype, number> = {
      playful: 1.24,
      calm: 1.02,
      tsundere: 1.18,
      scholarly: 0.98,
      energetic: 1.3,
    };
    const rateMap: Record<PersonalityArchetype, number> = {
      playful: 1.08,
      calm: 0.94,
      tsundere: 1.05,
      scholarly: 1.0,
      energetic: 1.15,
    };

    utterance.pitch = pitchMap[archetype];
    utterance.rate = rateMap[archetype];
    utterance.volume = 0.85;

    utterance.onstart = () => onSpeakingChange(true);
    utterance.onend = () => onSpeakingChange(false);
    utterance.onerror = () => onSpeakingChange(false);

    window.speechSynthesis.speak(utterance);
  } catch {
    onSpeakingChange(false);
  }
}

export function stopCompanionSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
