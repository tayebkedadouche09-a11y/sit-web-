import { Cloud, CloudFog, CloudRain, CloudSun, Sun } from "lucide-react";
import { useSkyMode, type WeatherPreference } from "@/contexts/SkyModeContext";

const OPTIONS: { id: WeatherPreference; icon: typeof Sun; title: string }[] = [
  { id: "auto", icon: CloudSun, title: "Auto weather" },
  { id: "clear", icon: Sun, title: "Clear" },
  { id: "partly", icon: Cloud, title: "Partly cloudy" },
  { id: "fog", icon: CloudFog, title: "Fog" },
  { id: "rain", icon: CloudRain, title: "Rain" },
];

export default function WeatherToggle() {
  const { weatherPreference, setWeatherPreference, weatherLabel } = useSkyMode();

  return (
    <div
      className="hidden items-center rounded-full border border-white/12 bg-black/20 p-0.5 backdrop-blur-md sm:flex"
      title={`Weather: ${weatherLabel}`}
    >
      {OPTIONS.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          aria-label={title}
          aria-pressed={weatherPreference === id}
          onClick={() => setWeatherPreference(id)}
          className={`grid h-7 w-7 place-items-center rounded-full transition ${
            weatherPreference === id
              ? "bg-white/18 text-white shadow-[0_0_12px_rgba(140,180,255,0.3)]"
              : "text-white/45 hover:text-white/80"
          }`}
        >
          <Icon size={13} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}
