import { Music2, Pause, Play, Volume2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { spaceAudio, useSpaceAudio } from "@/lib/spaceAudio";

function Meter({ value }: { value: number }) {
  return (
    <span className="space-audio__meter" aria-hidden="true">
      <i style={{ opacity: value > 0.05 ? 1 : 0.2 }} />
      <i style={{ opacity: value > 0.25 ? 1 : 0.2 }} />
      <i style={{ opacity: value > 0.5 ? 1 : 0.2 }} />
      <i style={{ opacity: value > 0.78 ? 1 : 0.2 }} />
    </span>
  );
}

export default function SpaceAudioPanel() {
  const { locale } = useLocale();
  const state = useSpaceAudio();

  const title = locale === "ar" ? "صوت الفضاء" : locale === "fr" ? "Audio spatial" : "Space audio";
  const piano = locale === "ar" ? "Piano" : locale === "fr" ? "Piano" : "Piano";
  const fx = locale === "ar" ? "أصوات الفضاء" : locale === "fr" ? "Effets spatiaux" : "Space FX";
  const master = locale === "ar" ? "الرئيسي" : locale === "fr" ? "Principal" : "Master";

  return (
    <div className="space-audio-panel">
      <div className="space-audio-panel__header">
        <div className="space-audio-panel__identity">
          <span className="space-audio-panel__icon">
            <Music2 size={14} />
          </span>
          <div>
            <strong>{title}</strong>
            <span>{state.enabled ? "Moonlight Sonata · playing" : "Audio off"}</span>
          </div>
        </div>
        <button
          type="button"
          className="space-audio-panel__play"
          onClick={() => void spaceAudio.toggle()}
          aria-label={state.enabled ? "Pause audio" : "Play audio"}
        >
          {state.enabled ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      <label className="space-audio__row">
        <span><span>{piano}</span><Meter value={state.pianoVolume} /></span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={state.pianoVolume}
          onChange={(event) => spaceAudio.setPianoVolume(Number(event.target.value))}
        />
      </label>

      <label className="space-audio__row">
        <span><span>{fx}</span><Meter value={state.fxVolume} /></span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={state.fxVolume}
          onChange={(event) => spaceAudio.setFxVolume(Number(event.target.value))}
        />
      </label>

      <label className="space-audio__row">
        <span><span>{master}</span><Volume2 size={12} /></span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={state.masterVolume}
          onChange={(event) => spaceAudio.setMasterVolume(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
