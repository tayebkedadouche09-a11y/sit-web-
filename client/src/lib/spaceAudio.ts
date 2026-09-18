import { useSyncExternalStore } from "react";

type AudioState = {
  enabled: boolean;
  pianoVolume: number;
  fxVolume: number;
  masterVolume: number;
};

const TRACK_URL =
  "https://archive.org/download/100ClassicalMusicMasterpieces/1801%20Beethoven-%20%27Moonlight%27%20Sonata%2C%201st%20movement.mp3";

const listeners = new Set<() => void>();

let audioState: AudioState = {
  enabled: false,
  pianoVolume: 0.14,
  fxVolume: 0.22,
  masterVolume: 0.8,
};

let audio: HTMLAudioElement | null = null;
let fxContext: AudioContext | null = null;
let fxMaster: GainNode | null = null;
let fxSource: AudioBufferSourceNode | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio(TRACK_URL);
    audio.loop = true;
    audio.preload = "auto";
  }

  if (!fxContext) {
    fxContext = new AudioContext();
    fxMaster = fxContext.createGain();
    fxMaster.connect(fxContext.destination);

    const buffer = fxContext.createBuffer(1, fxContext.sampleRate * 2, fxContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const fade = Math.min(1, i / 5000, (data.length - i) / 5000);
      data[i] = (Math.random() * 2 - 1) * fade;
    }

    fxSource = fxContext.createBufferSource();
    fxSource.buffer = buffer;
    fxSource.loop = true;

    const low = fxContext.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 280;

    const high = fxContext.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 42;

    fxSource.connect(high);
    high.connect(low);
    low.connect(fxMaster);
    fxSource.start();
  }
}

function applyVolumes() {
  if (audio) {
    audio.volume = Math.max(0, Math.min(1, audioState.pianoVolume * audioState.masterVolume));
  }
  if (fxMaster) {
    fxMaster.gain.value = Math.max(0, Math.min(1, audioState.fxVolume * audioState.masterVolume * 0.55));
  }
}

async function start() {
  ensureAudio();

  if (fxContext?.state === "suspended") {
    await fxContext.resume();
  }

  applyVolumes();
  await audio?.play();
  audioState = { ...audioState, enabled: true };
  emit();
}

function stop() {
  audio?.pause();
  audioState = { ...audioState, enabled: false };
  emit();
}

export function getAudioSnapshot() {
  return audioState;
}

export function subscribeAudio(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSpaceAudio() {
  return useSyncExternalStore(subscribeAudio, getAudioSnapshot, getAudioSnapshot);
}

export const spaceAudio = {
  async toggle() {
    if (audioState.enabled) {
      stop();
    } else {
      try {
        await start();
      } catch (error) {
        console.warn("[SpaceAudio] playback blocked", error);
      }
    }
  },
  setPianoVolume(value: number) {
    audioState = { ...audioState, pianoVolume: value };
    applyVolumes();
    emit();
  },
  setFxVolume(value: number) {
    audioState = { ...audioState, fxVolume: value };
    applyVolumes();
    emit();
  },
  setMasterVolume(value: number) {
    audioState = { ...audioState, masterVolume: value };
    applyVolumes();
    emit();
  },
};
