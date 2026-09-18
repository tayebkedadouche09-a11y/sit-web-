import { useMemo } from "react";
import { useSkyMode, type SkyPeriod, type WeatherKind } from "@/contexts/SkyModeContext";
import WeatherEffects from "@/components/WeatherEffects";
import LandscapeLayer from "@/components/LandscapeLayer";

/** Deterministic layered star field: tiny stars + a few brighter stellar points. */
function useStars(count: number) {
  return useMemo(() => {
    const stars: Array<{
      left: number;
      top: number;
      size: number;
      opacity: number;
      delay: number;
      glow: number;
    }> = [];

    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      const bright = rnd() > 0.965;
      stars.push({
        left: rnd() * 100,
        top: 2 + rnd() * 70,
        size: bright ? 1.8 + rnd() * 1.8 : 0.45 + rnd() * 1.35,
        opacity: bright ? 0.62 + rnd() * 0.38 : 0.22 + rnd() * 0.65,
        delay: rnd() * 6,
        glow: bright ? 7 + rnd() * 8 : 2 + rnd() * 4,
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
            : 2;

    if (weather === "clear") density = Math.max(1, Math.floor(density * 0.35));
    if (weather === "partly") density = Math.max(3, Math.floor(density * 0.65));
    if (weather === "overcast" || weather === "rain") density += 5;
    if (weather === "fog") density = Math.max(3, Math.floor(density * 0.6));
    if (weather === "drizzle") density += 2;

    const clouds: CloudSpec[] = [];
    for (let i = 0; i < density; i++) {
      const layerRoll = rnd();
      const layer: CloudSpec["layer"] = layerRoll < 0.38 ? "far" : layerRoll < 0.73 ? "mid" : "near";
      const baseDuration = layer === "far" ? 100 : layer === "mid" ? 64 : 40;
      clouds.push({
        top: 6 + rnd() * 42,
        scale: (layer === "far" ? 0.55 : layer === "mid" ? 0.85 : 1.1) * (0.75 + rnd() * 0.55),
        opacity:
          (layer === "far" ? 0.22 : layer === "mid" ? 0.34 : 0.44) *
          (period === "night" ? 0.28 : period === "dusk" ? 0.5 : 1),
        duration: baseDuration + rnd() * 25,
        delay: -rnd() * baseDuration,
        layer,
        morph: 9 + rnd() * 13,
      });
    }
    return clouds;
  }, [period, weather]);
}

function CloudShape(props: CloudSpec) {
  return (
    <div
      className={`sky-cloud sky-cloud--${props.layer}`}
      style={
        {
          top: `${props.top}%`,
          opacity: props.opacity,
          "--cloud-scale": props.scale,
          "--cloud-duration": `${props.duration}s`,
          "--cloud-delay": `${props.delay}s`,
          "--cloud-morph": `${props.morph}s`,
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
  const stars = useStars(period === "night" ? 170 : starsVisible ? 95 : 26);
  const clouds = useClouds(period, weather);

  const sunBottom = 8 + Math.max(0, sunElevation) * 62;
  const sunLeft = 18 + (sunElevation > 0 ? (1 - Math.abs(sunElevation - 0.5) * 0.3) * 50 : 20);
  const moonBottom = period === "dawn" ? 56 : 46;
  const moonLeft = period === "dawn" ? 73 : 79;
  const showSun = period !== "night";
  const sunSoft = period === "dawn" || period === "sunrise" || period === "golden" || period === "sunset";

  const showGalaxy = period === "night" || period === "dusk" || period === "dawn";
  const showShootingStar = period === "night";

  return (
    <div className="sky-canvas" aria-hidden="true" data-period={period}>
      <div className="sky-gradient" />
      <div className="sky-nebula" />
      {showGalaxy ? <div className="sky-milky-way" /> : null}
      <div className="sky-haze" />
      <div className="sky-horizon" />

      {starsVisible || period === "night" ? (
        <div className="sky-stars">
          {stars.map((s, i) => (
            <span
              key={i}
              className={`sky-star ${s.size > 1.7 ? "sky-star--bright" : ""}`}
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animationDelay: `${s.delay}s`,
                boxShadow: `0 0 ${s.glow}px rgba(220, 235, 255, 0.72)`,
              }}
            />
          ))}
        </div>
      ) : null}

      {showShootingStar ? (
        <span className="sky-shooting-star sky-shooting-star--one" />
      ) : null}

      <div className="sky-cloud-layer sky-cloud-layer--far">
        {clouds.filter((c) => c.layer === "far").map((c, i) => (
          <CloudShape key={`f-${i}`} {...c} />
        ))}
      </div>

      {moonVisible ? (
        <div className="sky-moon" style={{ left: `${moonLeft}%`, bottom: `${moonBottom}%` }}>
          <div className="sky-moon-disc" />
          <div className="sky-moon-glow" />
        </div>
      ) : null}

      {showSun ? (
        <div
          className={`sky-sun ${sunSoft ? "sky-sun--soft" : "sky-sun--clear"}`}
          style={{ left: `${Math.min(88, Math.max(8, sunLeft))}%`, bottom: `${sunBottom}%` }}
        >
          <div className="sky-sun-core" />
          <div className="sky-sun-halo" />
          <div className="sky-sun-rays" />
        </div>
      ) : null}

      <div className="sky-cloud-layer sky-cloud-layer--mid">
        {clouds.filter((c) => c.layer === "mid").map((c, i) => (
          <CloudShape key={`m-${i}`} {...c} />
        ))}
      </div>

      <div className="sky-cloud-layer sky-cloud-layer--near">
        {clouds.filter((c) => c.layer === "near").map((c, i) => (
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
