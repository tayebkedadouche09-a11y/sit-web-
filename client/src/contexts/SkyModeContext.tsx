import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SkyPeriod = "dawn" | "sunrise" | "day" | "golden" | "sunset" | "dusk" | "night";
export type SkyPreference = "auto" | "day" | "night";
export type WeatherKind = "clear" | "partly" | "overcast" | "fog" | "drizzle" | "rain";
export type WeatherPreference = "auto" | WeatherKind;

type SkyContextValue = {
  period: SkyPeriod;
  preference: SkyPreference;
  setPreference: (p: SkyPreference) => void;
  hour: number;
  sunElevation: number;
  moonVisible: boolean;
  starsVisible: boolean;
  label: string;
  weather: WeatherKind;
  weatherPreference: WeatherPreference;
  setWeatherPreference: (w: WeatherPreference) => void;
  weatherLabel: string;
  /** 0–1 intensity for rain/fog rendering */
  weatherIntensity: number;
};

const SkyContext = createContext<SkyContextValue | null>(null);

const STORAGE_KEY = "numi-sky-preference";
const WEATHER_KEY = "numi-weather-preference";

function periodFromHour(h: number): SkyPeriod {
  if (h >= 5 && h < 6.5) return "dawn";
  if (h >= 6.5 && h < 8) return "sunrise";
  if (h >= 8 && h < 16) return "day";
  if (h >= 16 && h < 17.5) return "golden";
  if (h >= 17.5 && h < 19) return "sunset";
  if (h >= 19 && h < 20.5) return "dusk";
  return "night";
}

function sunElevationFromHour(h: number): number {
  const x = (h - 13) / 7;
  return Math.max(-0.35, Math.min(1, 1 - x * x));
}

function labelFor(period: SkyPeriod): string {
  const map: Record<SkyPeriod, string> = {
    dawn: "Dawn",
    sunrise: "Sunrise",
    day: "Daylight",
    golden: "Golden hour",
    sunset: "Sunset",
    dusk: "Dusk",
    night: "Night sky",
  };
  return map[period];
}

function weatherLabelFor(w: WeatherKind): string {
  const map: Record<WeatherKind, string> = {
    clear: "Clear",
    partly: "Partly cloudy",
    overcast: "Overcast",
    fog: "Fog",
    drizzle: "Drizzle",
    rain: "Rain",
  };
  return map[w];
}

function resolvePeriod(pref: SkyPreference, hour: number): SkyPeriod {
  if (pref === "day") return hour >= 16 && hour < 19 ? "golden" : "day";
  if (pref === "night") return "night";
  return periodFromHour(hour);
}

/** Gentle auto weather cycle — shifts every few minutes, biased by time of day */
function autoWeather(hour: number, tick: number): WeatherKind {
  const sequence: WeatherKind[] =
    hour >= 22 || hour < 5
      ? ["clear", "clear", "partly", "fog", "clear"]
      : hour >= 5 && hour < 9
        ? ["fog", "partly", "clear", "drizzle", "partly"]
        : hour >= 9 && hour < 17
          ? ["clear", "partly", "clear", "overcast", "drizzle", "partly"]
          : ["partly", "overcast", "drizzle", "rain", "clear"];
  return sequence[tick % sequence.length];
}

function intensityFor(w: WeatherKind): number {
  switch (w) {
    case "clear":
      return 0;
    case "partly":
      return 0.25;
    case "overcast":
      return 0.45;
    case "fog":
      return 0.55;
    case "drizzle":
      return 0.65;
    case "rain":
      return 1;
  }
}

export function SkyModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<SkyPreference>(() => {
    if (typeof window === "undefined") return "auto";
    const saved = localStorage.getItem(STORAGE_KEY) as SkyPreference | null;
    return saved === "day" || saved === "night" || saved === "auto" ? saved : "auto";
  });
  const [weatherPreference, setWeatherPreferenceState] = useState<WeatherPreference>(() => {
    if (typeof window === "undefined") return "auto";
    const saved = localStorage.getItem(WEATHER_KEY) as WeatherPreference | null;
    const ok: WeatherPreference[] = ["auto", "clear", "partly", "overcast", "fog", "drizzle", "rain"];
    return saved && ok.includes(saved) ? saved : "auto";
  });
  const [now, setNow] = useState(() => new Date());
  const [weatherTick, setWeatherTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Auto weather evolves every 4 minutes
  useEffect(() => {
    if (weatherPreference !== "auto") return;
    const id = window.setInterval(() => setWeatherTick((t) => t + 1), 240_000);
    return () => window.clearInterval(id);
  }, [weatherPreference]);

  const setPreference = (p: SkyPreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
  };

  const setWeatherPreference = (w: WeatherPreference) => {
    setWeatherPreferenceState(w);
    try {
      localStorage.setItem(WEATHER_KEY, w);
    } catch {
      /* ignore */
    }
  };

  const hour = now.getHours() + now.getMinutes() / 60;
  const period = resolvePeriod(preference, hour);
  const sunElevation = sunElevationFromHour(hour);
  const weather: WeatherKind =
    weatherPreference === "auto" ? autoWeather(hour, weatherTick) : weatherPreference;

  const hideCelestialForWeather = weather === "overcast" || weather === "rain" || weather === "fog";
  const moonVisible =
    (period === "night" || period === "dusk" || period === "dawn") && weather !== "rain" && weather !== "overcast";
  const starsVisible =
    (period === "night" || period === "dusk" || period === "dawn") &&
    weather === "clear";

  const value = useMemo(
    () => ({
      period,
      preference,
      setPreference,
      hour,
      sunElevation: hideCelestialForWeather ? sunElevation * 0.35 : sunElevation,
      moonVisible,
      starsVisible,
      label: labelFor(period),
      weather,
      weatherPreference,
      setWeatherPreference,
      weatherLabel: weatherLabelFor(weather),
      weatherIntensity: intensityFor(weather),
    }),
    [
      period,
      preference,
      hour,
      sunElevation,
      moonVisible,
      starsVisible,
      weather,
      weatherPreference,
      hideCelestialForWeather,
    ],
  );

  useEffect(() => {
    document.documentElement.dataset.sky = period;
    document.documentElement.dataset.skyPref = preference;
    document.documentElement.dataset.weather = weather;
  }, [period, preference, weather]);

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSkyMode() {
  const ctx = useContext(SkyContext);
  if (!ctx) throw new Error("useSkyMode must be used within SkyModeProvider");
  return ctx;
}
