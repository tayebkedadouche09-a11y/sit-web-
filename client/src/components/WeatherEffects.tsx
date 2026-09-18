import { useMemo } from "react";
import { useSkyMode } from "@/contexts/SkyModeContext";

function useRainDrops(count: number) {
  return useMemo(() => {
    const drops: Array<{ left: number; delay: number; duration: number; len: number; opacity: number }> = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      drops.push({
        left: rnd() * 100,
        delay: rnd() * 4,
        duration: 0.55 + rnd() * 0.7,
        len: 10 + rnd() * 18,
        opacity: 0.25 + rnd() * 0.55,
      });
    }
    return drops;
  }, [count]);
}

export default function WeatherEffects() {
  const { weather, weatherIntensity, period } = useSkyMode();
  const rainCount = weather === "rain" ? 64 : weather === "drizzle" ? 28 : 0;
  const drops = useRainDrops(Math.max(rainCount, 1));

  const showFog = weather === "fog" || weather === "drizzle" || weather === "rain";
  const showOvercastSheet = weather === "overcast" || weather === "rain";
  const showRain = weather === "rain" || weather === "drizzle";

  return (
    <div className="weather-fx" data-weather={weather} aria-hidden="true">
      {showOvercastSheet && <div className="weather-overcast" style={{ opacity: 0.35 + weatherIntensity * 0.35 }} />}

      {showFog && (
        <>
          <div className="weather-fog weather-fog--1" style={{ opacity: 0.2 + weatherIntensity * 0.45 }} />
          <div className="weather-fog weather-fog--2" style={{ opacity: 0.15 + weatherIntensity * 0.35 }} />
        </>
      )}

      {showRain && (
        <div className={`weather-rain ${weather === "drizzle" ? "weather-rain--soft" : "weather-rain--heavy"}`}>
          {drops.slice(0, rainCount).map((d, i) => (
            <span
              key={i}
              className="weather-drop"
              style={{
                left: `${d.left}%`,
                height: d.len,
                opacity: d.opacity * (weather === "drizzle" ? 0.7 : 1),
                animationDuration: `${d.duration}s`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Wet ground shimmer near horizon in rain */}
      {weather === "rain" && period !== "night" && <div className="weather-wet-ground" />}
    </div>
  );
}
