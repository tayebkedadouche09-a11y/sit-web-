import { useMemo } from "react";
import { useSkyMode, type SkyPeriod, type WeatherKind } from "@/contexts/SkyModeContext";
import WeatherEffects from "@/components/WeatherEffects";
import LandscapeLayer from "@/components/LandscapeLayer";

/** Deterministic star field — nature-like, not random each render */
function useStars(count: number) {
  return useMemo(() => {
    const stars: Array<{ left: number; top: number; size: number; opacity: number; delay: number }> = [];
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      stars.push({
        left: rnd() * 100,
        top: rnd() * 70,
        size: 0.6 + rnd() * 2.2,
        opacity: 0.25 + rnd() * 0.75,
        delay: rnd() * 4,
      });
    }
    return stars;
  }, [count]);
}

type CloudSpec = {
  top: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
  layer: "far" | "mid" | "near";
  morph: number;
};

/** Layered clouds: far = slow, near = faster — wind shear feel */
function useClouds(period: SkyPeriod, weather: WeatherKind): CloudSpec[] {
  return useMemo(() => {
    let seed = 99;
    const rnd = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    let density =
      period === "day" || period === "golden"
        ? 9
        : period === "sunrise" || period === "sunset"
          ? 7
          : period === "dawn" || period === "dusk"
            ? 5
            : 3;
    if (weather === "clear") density = Math.max(2, Math.floor(density * 0.4));
    if (weather === "partly") density = Math.max(4, Math.floor(density * 0.75));
    if (weather === "overcast" || weather === "rain") density = density + 5;
    if (weather === "fog") density = Math.max(3, Math.floor(density * 0.6));
    if (weather === "drizzle") density = density + 2;

    const clouds: CloudSpec[] = [];
    for (let i = 0; i < density; i++) {
      const layerRoll = rnd();
      const layer: CloudSpec["layer"] = layerRoll < 0.35 ? "far" : layerRoll < 0.7 ? "mid" : "near";
      const baseDuration = layer === "far" ? 90 : layer === "mid" ? 55 : 32;
      clouds.push({
        top: 6 + rnd() * 42,
        scale: (layer === "far" ? 0.55 : layer === "mid" ? 0.85 : 1.15) * (0.75 + rnd() * 0.55),
        opacity:
          (layer === "far" ? 0.28 : layer === "mid" ? 0.42 : 0.55) *
          (period === "night" ? 0.35 : period === "dusk" ? 0.55 : 1),
        duration: baseDuration + rnd() * 25,
        delay: -rnd() * baseDuration,
        layer,
        morph: 8 + rnd() * 14,
      });
    }
    return clouds;
  }, [period, weather]);
}

function CloudShape({
  top,
  scale,
  opacity,
  duration,
  delay,
  layer,
  morph,
}: CloudSpec) {
  return (
    <div
      className={`sky-cloud sky-cloud--${layer}`}
      style={
        {
          top: `${top}%`,
          opacity,
          "--cloud-scale": scale,
          "--cloud-duration": `${duration}s`,
          "--cloud-delay": `${delay}s`,
          "--cloud-morph": `${morph}s`,
        } as Record<string, string | number>
      }
    >
      <span className="sky-cloud-puff sky-cloud-puff--a" />
      <span className="sky-cloud-puff sky-cloud-puff--b" />
      <span className="sky-cloud-puff sky-cloud-puff--c" />
      <span className="sky-cloud-puff sky-cloud-puff--d" />
      <span className="sky-cloud-puff sky-cloud-puff--e" />
    </div>
  );
}

export default function SkyCanvas() {
  const { period, sunElevation, moonVisible, starsVisible, label, weather } = useSkyMode();
  const stars = useStars(48);
  const clouds = useClouds(period, weather);

  const sunBottom = 8 + Math.max(0, sunElevation) * 62;
  const sunLeft = 18 + (sunElevation > 0 ? (1 - Math.abs(sunElevation - 0.5) * 0.3) * 50 : 20);
  const moonBottom = period === "dawn" ? 55 : 42;
  const moonLeft = period === "dawn" ? 72 : 78;

  const showSun = period !== "night";
  const sunSoft =
    period === "dawn" || period === "sunrise" || period === "golden" || period === "sunset";

  return (
    <div className="sky-canvas" aria-hidden="true" data-period={period}>
      <div className="sky-gradient" />
      <div className="sky-haze" />
      <div className="sky-horizon" />

      {starsVisible && (
        <div className="sky-stars">
          {stars.map((s, i) => (
            <span
              key={i}
              className="sky-star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Far clouds behind sun/moon path */}
      <div className="sky-cloud-layer sky-cloud-layer--far">
        {clouds
          .filter((c) => c.layer === "far")
          .map((c, i) => (
            <CloudShape key={`f-${i}`} {...c} />
          ))}
      </div>

      {moonVisible && (
        <div className="sky-moon" style={{ left: `${moonLeft}%`, bottom: `${moonBottom}%` }}>
          <div className="sky-moon-disc" />
          <div className="sky-moon-glow" />
        </div>
      )}

      {showSun && (
        <div
          className={`sky-sun ${sunSoft ? "sky-sun--soft" : "sky-sun--clear"}`}
          style={{ left: `${Math.min(88, Math.max(8, sunLeft))}%`, bottom: `${sunBottom}%` }}
        >
          <div className="sky-sun-core" />
          <div className="sky-sun-halo" />
          <div className="sky-sun-rays" />
        </div>
      )}

      <div className="sky-cloud-layer sky-cloud-layer--mid">
        {clouds
          .filter((c) => c.layer === "mid")
          .map((c, i) => (
            <CloudShape key={`m-${i}`} {...c} />
          ))}
      </div>

      <div className="sky-cloud-layer sky-cloud-layer--near">
        {clouds
          .filter((c) => c.layer === "near")
          .map((c, i) => (
            <CloudShape key={`n-${i}`} {...c} />
          ))}
      </div>

      <LandscapeLayer />
      <WeatherEffects />
      <div className="sky-vignette" />
      <span className="sr-only">Sky mode: {label}, weather: {weather}</span>
    </div>
  );
}
