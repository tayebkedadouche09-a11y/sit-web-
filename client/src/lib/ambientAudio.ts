/**
 * Procedural ambient audio — no external files, no copyrighted tracks.
 * Soft piano-like notes + light wind/rain beds.
 * Requires a user gesture to start (browser autoplay policy).
 */

export type AmbientWeather = "clear" | "partly" | "overcast" | "fog" | "drizzle" | "rain";
export type AmbientBiome = "space" | "coast" | "mountains" | "desert" | "plains";
export type AmbientPeriod = "dawn" | "sunrise" | "day" | "golden" | "sunset" | "dusk" | "night";

type AmbientState = {
  weather: AmbientWeather;
  biome: AmbientBiome;
  period: AmbientPeriod;
};

/** Master volume cap — intentionally soft */
const MAX_MASTER = 0.2;

/** Calm pentatonic-ish phrase in A (Hz) — slow lounge piano feel */
const PIANO_PHRASE = [
  220.0, // A3
  246.94, // B3
  261.63, // C4
  329.63, // E4
  392.0, // G4
  329.63,
  261.63,
  246.94,
  220.0,
  196.0, // G3
  220.0,
  261.63,
];

function noiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = rate * seconds;
  const buf = ctx.createBuffer(1, len, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private pianoGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private padOsc: OscillatorNode[] = [];
  private pianoTimer: number | null = null;
  private phraseIndex = 0;
  private thunderTimer: number | null = null;
  private enabled = false;
  private muted = true;
  private state: AmbientState = { weather: "clear", biome: "space", period: "night" };

  get isMuted() {
    return this.muted;
  }

  get isEnabled() {
    return this.enabled;
  }

  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainGain.connect(this.master);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      this.windGain.connect(this.master);

      this.padGain = this.ctx.createGain();
      this.padGain.gain.value = 0;
      this.padGain.connect(this.master);

      this.pianoGain = this.ctx.createGain();
      this.pianoGain.gain.value = 0.55;
      this.pianoGain.connect(this.master);

      this.startNoiseLayers();
      this.startPad();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.enabled = true;
    this.muted = false;
    this.applyGains(true);
    this.schedulePiano();
    this.scheduleThunder();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!this.master || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(m ? 0 : MAX_MASTER, t + 0.5);
    if (m) {
      if (this.thunderTimer) {
        window.clearTimeout(this.thunderTimer);
        this.thunderTimer = null;
      }
      if (this.pianoTimer) {
        window.clearTimeout(this.pianoTimer);
        this.pianoTimer = null;
      }
    } else {
      this.schedulePiano();
      this.scheduleThunder();
    }
  }

  update(state: AmbientState) {
    this.state = state;
    this.applyGains(false);
    this.retunePad();
  }

  private startNoiseLayers() {
    if (!this.ctx || !this.rainGain || !this.windGain) return;
    const buf = noiseBuffer(this.ctx, 3);

    const rain = this.ctx.createBufferSource();
    rain.buffer = buf;
    rain.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.6;
    rain.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    rain.start();
    this.rainSource = rain;

    const wind = this.ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 380;
    wind.connect(windFilter);
    windFilter.connect(this.windGain);
    wind.start();
    this.windSource = wind;
  }

  /** Soft sustained pad under the piano */
  private startPad() {
    if (!this.ctx || !this.padGain) return;
    for (const f of this.padFrequencies()) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.1;
      osc.connect(g);
      g.connect(this.padGain);
      osc.start();
      this.padOsc.push(osc);
    }
  }

  private padFrequencies(): number[] {
    const { biome, period } = this.state;
    if (biome === "coast" || period === "sunrise") return [110, 164.81, 220];
    if (biome === "desert" || period === "sunset") return [98, 146.83, 196];
    if (biome === "mountains") return [82.41, 123.47, 164.81];
    if (biome === "plains" || period === "day") return [130.81, 196, 261.63];
    return [87.31, 130.81, 164.81];
  }

  private retunePad() {
    if (!this.ctx || this.padOsc.length === 0) return;
    const freqs = this.padFrequencies();
    const t = this.ctx.currentTime;
    this.padOsc.forEach((osc, i) => {
      const f = freqs[i % freqs.length];
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.linearRampToValueAtTime(f, t + 1.2);
    });
  }

  /** Piano-like plucked tone (partials + fast decay) */
  private playPianoNote(freq: number) {
    if (!this.ctx || !this.pianoGain || this.muted) return;
    const t = this.ctx.currentTime;
    const partials = [1, 2, 3, 4];
    const gains = [0.42, 0.18, 0.08, 0.04];

    partials.forEach((mult, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = freq * mult;

      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gains[i], t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 + i * 0.15);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(800, t + 1.5);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.pianoGain!);
      osc.start(t);
      osc.stop(t + 3);
    });
  }

  private schedulePiano() {
    if (this.pianoTimer) window.clearTimeout(this.pianoTimer);
    if (this.muted || !this.enabled) return;

    const freq = PIANO_PHRASE[this.phraseIndex % PIANO_PHRASE.length];
    this.playPianoNote(freq);
    this.phraseIndex += 1;

    // Slow, irregular spacing — feels human, not a metronome
    const delay = 1400 + Math.random() * 900;
    this.pianoTimer = window.setTimeout(() => this.schedulePiano(), delay);
  }

  private applyGains(immediate: boolean) {
    if (!this.ctx || !this.master || !this.rainGain || !this.windGain || !this.padGain) return;
    const t = this.ctx.currentTime;
    const ramp = immediate ? 0.08 : 1.6;
    const { weather, biome } = this.state;

    let rain = 0;
    let wind = 0.03;
    let pad = 0.07;

    if (weather === "rain") {
      rain = 0.35;
      wind = 0.08;
      pad = 0.04;
    } else if (weather === "drizzle") {
      rain = 0.18;
      wind = 0.06;
      pad = 0.05;
    } else if (weather === "fog") {
      rain = 0.03;
      wind = 0.07;
      pad = 0.08;
    } else if (weather === "overcast") {
      wind = 0.1;
      pad = 0.06;
    } else {
      wind = biome === "coast" ? 0.07 : biome === "desert" ? 0.08 : 0.04;
      pad = 0.08;
    }

    // Piano stays present; beds stay quieter under it
    if (this.pianoGain) {
      this.pianoGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.55, t + ramp);
    }

    if (this.muted) {
      this.master.gain.linearRampToValueAtTime(0, t + 0.35);
      return;
    }

    this.master.gain.linearRampToValueAtTime(MAX_MASTER, t + ramp);
    this.rainGain.gain.linearRampToValueAtTime(rain, t + ramp);
    this.windGain.gain.linearRampToValueAtTime(wind, t + ramp);
    this.padGain.gain.linearRampToValueAtTime(pad, t + ramp);
  }

  private scheduleThunder() {
    if (this.thunderTimer) window.clearTimeout(this.thunderTimer);
    if (this.muted || !this.enabled) return;
    const { weather } = this.state;
    if (weather !== "rain" && weather !== "overcast") return;

    const delay = 12000 + Math.random() * 20000;
    this.thunderTimer = window.setTimeout(() => {
      this.playThunder();
      this.scheduleThunder();
    }, delay);
  }

  private playThunder() {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 1.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 110;
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 2);
  }

  dispose() {
    if (this.thunderTimer) window.clearTimeout(this.thunderTimer);
    if (this.pianoTimer) window.clearTimeout(this.pianoTimer);
    try {
      this.rainSource?.stop();
      this.windSource?.stop();
      this.padOsc.forEach((o) => o.stop());
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}

export const ambientEngine = new AmbientEngine();
