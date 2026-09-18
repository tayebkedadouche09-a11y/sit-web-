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
    locale === "ar" ? "كتم الموسيقى" : locale === "fr" ? "Couper la musique" : "Mute music";
  const labelOff =
    locale === "ar" ? "تشغيل بيانو هادئ" : locale === "fr" ? "Piano doux" : "Play soft piano";

  const toggle = async () => {
    if (!ambientEngine.isEnabled) {
      await ambientEngine.unlock();
      setMuted(false);
      return;
    }
    const next = !muted;
    ambientEngine.setMuted(next);
    setMuted(next);
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      title={muted ? labelOff : labelOn}
      aria-label={muted ? labelOff : labelOn}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition ${
        muted
          ? "border-white/12 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80"
          : "border-[#83c2ff]/35 bg-[#3b8bff]/15 text-[#c5e3ff]"
      }`}
    >
      {muted ? <VolumeX size={14} /> : <Music2 size={14} />}
      <span className="hidden sm:inline">{muted ? (locale === "ar" ? "موسيقى" : "Music") : (locale === "ar" ? "تشغيل" : "On")}</span>
    </button>
  );
}
