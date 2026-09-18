/**
 * Real ambient piano player for NUMI.
 *
 * The track is Beethoven's "Moonlight Sonata", first movement.
 * The composition is public domain; the particular recording/source should
 * still be reviewed against the hosting archive's terms before commercial use.
 *
 * Browsers require a user gesture before starting audio, so AmbientToggle
 * calls unlock() from its click handler.
 */

export type AmbientWeather = "clear" | "partly" | "overcast" | "fog" | "drizzle" | "rain";
export type AmbientBiome = "space" | "coast" | "mountains" | "desert" | "plains";
export type AmbientPeriod = "dawn" | "sunrise" | "day" | "golden" | "sunset" | "dusk" | "night";

type AmbientState = {
  weather: AmbientWeather;
  biome: AmbientBiome;
  period: AmbientPeriod;
};

const TRACK_URL =
  "https://archive.org/download/100ClassicalMusicMasterpieces/1801%20Beethoven-%20%27Moonlight%27%20Sonata%2C%201st%20movement.mp3";

const SOFT_VOLUME = 0.14;

export class AmbientEngine {
  private audio: HTMLAudioElement | null = null;
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
    if (!this.audio) {
      const audio = new Audio(TRACK_URL);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = SOFT_VOLUME;
      this.audio = audio;
    }

    this.muted = false;
    this.enabled = true;
    this.audio.volume = this.volumeForState();
    await this.audio.play();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.audio) return;

    if (muted) {
      this.audio.pause();
      return;
    }

    this.audio.volume = this.volumeForState();
    void this.audio.play().catch((error) => {
      console.warn("[AmbientAudio] Playback blocked until another user gesture", error);
    });
  }

  update(state: AmbientState) {
    this.state = state;
    if (this.audio && !this.muted) {
      this.audio.volume = this.volumeForState();
    }
  }

  private volumeForState() {
    if (this.state.weather === "rain") return 0.10;
    if (this.state.weather === "overcast" || this.state.weather === "fog") return 0.115;
    return SOFT_VOLUME;
  }

  dispose() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
    this.enabled = false;
    this.muted = true;
  }
}

export const ambientEngine = new AmbientEngine();
