import { Music2, Pause, Play, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => {
      if (!touchOpen) setExpanded(false);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [expanded, touchOpen]);

  const title = locale === "ar" ? "صوت الفضاء" : locale === "fr" ? "Audio spatial" : "Space audio";
  const piano = locale === "ar" ? "Piano" : "Piano";
  const fx = locale === "ar" ? "أصوات الفضاء" : locale === "fr" ? "Effets spatiaux" : "Space FX";
  const master = locale === "ar" ? "الرئيسي" : locale === "fr" ? "Principal" : "Master";

  const reveal = () => {
    setExpanded(true);
    setTouchOpen(true);
  };

  return (
    <div
      className={`space-audio-shell ${expanded ? "is-expanded" : "is-collapsed"}`}
      onMouseEnter={() => {
        setExpanded(true);
        setTouchOpen(false);
      }}
      onMouseLeave={() => {
        if (!touchOpen) setExpanded(false);
      }}
    >
      <button
        type="button"
        className="space-audio-orb"
        onClick={expanded ? () => setExpanded(false) : reveal}
        aria-label={expanded ? "Hide audio controls" : "Show audio controls"}
        title={expanded ? "Hide audio controls" : "Show audio controls"}
      >
        <span className="space-audio-orb__ring" />
        {state.enabled ? <Music2 size={17} /> : <Volume2 size={17} />}
      </button>

      <div
        className="space-audio-panel"
        aria-hidden={!expanded}
        onFocusCapture={() => {
          setExpanded(true);
          setTouchOpen(true);
        }}
      >
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
          <div className="space-audio-panel__actions">
            <button
              type="button"
              className="space-audio-panel__play"
              onClick={() => void spaceAudio.toggle()}
              aria-label={state.enabled ? "Pause audio" : "Play audio"}
            >
              {state.enabled ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              className="space-audio-panel__close"
              onClick={() => {
                setExpanded(false);
                setTouchOpen(false);
              }}
              aria-label="Hide audio controls"
            >
              <X size={12} />
            </button>
          </div>
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
    </div>
  );
}
