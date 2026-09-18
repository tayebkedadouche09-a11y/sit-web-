import { Moon, Sun, Sunrise } from "lucide-react";
import { useSkyMode, type SkyPreference } from "@/contexts/SkyModeContext";

const OPTIONS: { id: SkyPreference; icon: typeof Sun; title: string }[] = [
  { id: "auto", icon: Sunrise, title: "Auto sky (real time)" },
  { id: "day", icon: Sun, title: "Daylight" },
  { id: "night", icon: Moon, title: "Night sky" },
];

export default function SkyToggle() {
  const { preference, setPreference, label } = useSkyMode();

  return (
    <div
      className="flex items-center rounded-full border border-white/12 bg-black/20 p-0.5 backdrop-blur-md"
      title={`Sky: ${label}`}
    >
      {OPTIONS.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          aria-label={title}
          aria-pressed={preference === id}
          onClick={() => setPreference(id)}
          className={`grid h-7 w-7 place-items-center rounded-full transition ${
            preference === id
              ? "bg-white/18 text-white shadow-[0_0_12px_rgba(255,200,120,0.25)]"
              : "text-white/45 hover:text-white/80"
          }`}
        >
          <Icon size={13} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}
