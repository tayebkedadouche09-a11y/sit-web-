import { useMemo } from "react";
import { useSkyMode, type SkyPeriod, type WeatherKind } from "@/contexts/SkyModeContext";

export type LandscapeBiome = "space" | "coast" | "mountains" | "desert" | "plains";

/** Biome follows time-of-day mood — lightweight, no images */
function biomeFor(period: SkyPeriod, weather: WeatherKind): LandscapeBiome {
  if (period === "night" || period === "dusk") return weather === "clear" ? "space" : "mountains";
  if (period === "dawn" || period === "sunrise") return "coast";
  if (period === "golden" || period === "sunset") return "desert";
  if (weather === "rain" || weather === "overcast") return "mountains";
  if (weather === "fog") return "coast";
  return "plains";
}

export default function LandscapeLayer() {
  const { period, weather } = useSkyMode();
  const biome = useMemo(() => biomeFor(period, weather), [period, weather]);

  return (
    <div className="landscape" data-biome={biome} aria-hidden="true">
      {/* Shared ground plane */}
      <div className="landscape-ground" />

      {biome === "space" && (
        <svg className="landscape-svg landscape-svg--space" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="spaceRidge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(30,50,90,0.9)" />
              <stop offset="100%" stopColor="rgba(4,11,22,1)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#spaceRidge)"
            d="M0,200 L0,120 Q80,95 160,110 T320,90 T480,115 T640,85 T800,105 T960,80 T1120,100 L1200,90 L1200,200 Z"
          />
          <circle cx="980" cy="40" r="2" fill="rgba(255,255,255,0.5)" />
          <circle cx="200" cy="30" r="1.5" fill="rgba(200,220,255,0.4)" />
        </svg>
      )}

      {biome === "mountains" && (
        <svg className="landscape-svg" viewBox="0 0 1200 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mtFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(70,90,120,0.55)" />
              <stop offset="100%" stopColor="rgba(20,30,50,0.9)" />
            </linearGradient>
            <linearGradient id="mtNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(40,55,80,0.85)" />
              <stop offset="100%" stopColor="rgba(10,16,28,1)" />
            </linearGradient>
          </defs>
          {/* Far range */}
          <path
            fill="url(#mtFar)"
            d="M0,220 L0,140 L120,60 L220,130 L340,40 L480,125 L600,55 L720,120 L860,35 L980,110 L1100,50 L1200,130 L1200,220 Z"
          />
          {/* Near range */}
          <path
            fill="url(#mtNear)"
            d="M0,220 L0,160 L90,100 L180,155 L300,85 L420,150 L560,95 L700,145 L820,80 L950,140 L1080,100 L1200,155 L1200,220 Z"
          />
        </svg>
      )}

      {biome === "coast" && (
        <>
          <svg className="landscape-svg landscape-svg--coast" viewBox="0 0 1200 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(60,120,180,0.45)" />
                <stop offset="50%" stopColor="rgba(30,80,140,0.55)" />
                <stop offset="100%" stopColor="rgba(10,30,50,0.85)" />
              </linearGradient>
              <linearGradient id="shore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(180,160,120,0.5)" />
                <stop offset="100%" stopColor="rgba(40,35,30,0.9)" />
              </linearGradient>
            </defs>
            <path fill="url(#sea)" d="M0,80 Q300,70 600,85 T1200,75 L1200,180 L0,180 Z" className="sea-surface" />
            <path
              fill="none"
              stroke="rgba(200,230,255,0.25)"
              strokeWidth="1.5"
              d="M0,95 Q200,88 400,98 T800,92 T1200,100"
              className="sea-wave"
            />
            <path
              fill="none"
              stroke="rgba(200,230,255,0.15)"
              strokeWidth="1"
              d="M0,110 Q250,102 500,112 T1000,108 T1200,115"
              className="sea-wave sea-wave--2"
            />
            <path fill="url(#shore)" d="M0,150 Q400,145 800,155 T1200,148 L1200,180 L0,180 Z" />
          </svg>
        </>
      )}

      {biome === "desert" && (
        <svg className="landscape-svg" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="duneFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(210,150,90,0.55)" />
              <stop offset="100%" stopColor="rgba(120,70,40,0.85)" />
            </linearGradient>
            <linearGradient id="duneNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(190,120,60,0.75)" />
              <stop offset="100%" stopColor="rgba(60,35,20,0.95)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#duneFar)"
            d="M0,200 L0,130 Q150,100 300,125 T600,110 T900,130 T1200,115 L1200,200 Z"
          />
          <path
            fill="url(#duneNear)"
            d="M0,200 L0,155 Q200,125 400,150 T800,140 T1200,155 L1200,200 Z"
          />
        </svg>
      )}

      {biome === "plains" && (
        <svg className="landscape-svg" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="plain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(90,130,90,0.4)" />
              <stop offset="100%" stopColor="rgba(30,50,35,0.85)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#plain)"
            d="M0,160 L0,100 Q200,90 400,105 T800,95 T1200,100 L1200,160 Z"
          />
          {/* Soft hill hints */}
          <path
            fill="rgba(50,80,55,0.35)"
            d="M100,160 Q250,120 400,160 Z"
          />
          <path
            fill="rgba(50,80,55,0.3)"
            d="M700,160 Q850,115 1000,160 Z"
          />
        </svg>
      )}
    </div>
  );
}
