import { Music2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { ambientEngine } from "@/lib/ambientAudio";
import { useSkyMode } from "@/contexts/SkyModeContext";
import { useLocale } from "@/contexts/LocaleContext";

function biomeFromPeriodWeather(
  period: string,
  weather: string,
): "space" | "coast" | "mountains" | "desert" | "plains" {
  if (period === "night" || period === "dusk") return weather === "clear" ? "space" : "mountains";
  if (period === "dawn" || period === "sunrise") return "coast";
  if (period === "golden" || period === "sunset") return "desert";
  if (weather === "rain" || weather === "overcast") return "mountains";
  if (weather === "fog") return "coast";
  return "plains";
}

export default function AmbientToggle() {
  const { period, weather } = useSkyMode();
  const { locale } = useLocale();
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const biome = biomeFromPeriodWeather(period, weather);
    ambientEngine.update({
      weather: weather as any,
      biome,
      period: period as any,
    });
  }, [period, weather]);

  const labelOn =
    locale === "ar" ? "إيقاف Moonlight Sonata" : locale === "fr" ? "Couper le piano" : "Mute Moonlight Sonata";
  const labelOff =
    locale === "ar" ? "تشغيل بيانو Moonlight Sonata" : locale === "fr" ? "Jouer Moonlight Sonata" : "Play Moonlight Sonata";

  const toggle = async () => {
    try {
      if (!ambientEngine.isEnabled) {
        await ambientEngine.unlock();
        setMuted(false);
        return;
      }
      const next = !muted;
      ambientEngine.setMuted(next);
      setMuted(next);
    } catch (error) {
      console.warn("[AmbientToggle] Unable to start audio", error);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      title={muted ? labelOff : labelOn}
      aria-label={muted ? labelOff : labelOn}
      className={`ambient-control ${muted ? "ambient-control--muted" : "ambient-control--on"}`}
    >
      {muted ? <VolumeX size={14} /> : <Music2 size={14} />}
      <span className="hidden sm:inline">
        {muted
          ? locale === "ar"
            ? "Moonlight"
            : locale === "fr"
              ? "Moonlight"
              : "Moonlight"
          : locale === "ar"
            ? "يعمل"
            : locale === "fr"
              ? "En lecture"
              : "Playing"}
      </span>
      <span className="ambient-control__signal" aria-hidden="true">
        <i /><i /><i />
      </span>
    </button>
  );
}
