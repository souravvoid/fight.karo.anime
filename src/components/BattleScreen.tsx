import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, RotateCcw, Volume2, VolumeX, Music, Zap, Smartphone } from "lucide-react";
import type { MatchConfig, MatchResult, Settings } from "../types/game";
import { createBattle } from "../game/createGame";
import { battleControl } from "../services/control";
import { bus, resetTouchInput } from "../services/bus";
import { audio } from "../services/audio";
import { Hud } from "./Hud";
import { TouchControls } from "./TouchControls";

interface Props {
  config: MatchConfig;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onResult: (result: MatchResult) => void;
  onQuit: () => void;
  onRestart: () => void;
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = () => setCoarse(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return coarse;
}

export function BattleScreen({ config, settings, onSettings, onResult, onQuit, onRestart }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const touch = useCoarsePointer();
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = createBattle(host, config, settingsRef.current);
    return () => {
      resetTouchInput();
      game.destroy(true);
    };
  }, [config]);

  useEffect(() => {
    const offResult = bus.on("result", (result) => onResultRef.current(result));
    const offPause = bus.on("pauseRequest", () => setPaused(true));
    return () => {
      offResult();
      offPause();
    };
  }, []);

  useEffect(() => {
    if (paused) battleControl.pause?.();
    else battleControl.resume?.();
  }, [paused]);

  const resume = () => {
    audio.ui();
    setPaused(false);
  };

  const toggle = (key: "sfx" | "music") => {
    const next = { ...settings, [key]: !settings[key] };
    onSettings(next);
    audio.configure(next.sfx, next.music);
    if (next.music) audio.startMusic();
    else audio.stopMusic();
    audio.ui();
  };

  return (
    <div className="screen battle-screen">
      <div className="battle-frame">
        <div className="phaser-host" ref={hostRef} />
        <Hud config={config} />
        <div className="scanlines" aria-hidden />

        <button type="button" className="stage-pause" aria-label="Pause" onClick={() => setPaused(true)}>
          <Pause size={16} />
        </button>

        {touch && <TouchControls />}

        <div className="rotate-hint">
          <Smartphone size={38} />
          <strong>ROTATE YOUR PHONE</strong>
          <span>This arena is built for landscape.</span>
        </div>

        {paused && (
          <div className="pause-overlay">
            <div className="pause-panel">
              <p className="eyebrow">MATCH SUSPENDED</p>
              <h2 className="pause-title">PAUSED</h2>

              <div className="pause-actions">
                <button type="button" className="btn btn-primary" onClick={resume}>
                  <Play size={18} />
                  Resume
                </button>
                <button type="button" className="btn btn-ghost" onClick={onRestart}>
                  <RotateCcw size={18} />
                  Restart match
                </button>
                <button type="button" className="btn btn-ghost" onClick={onQuit}>
                  <ArrowLeft size={18} />
                  Quit to menu
                </button>
              </div>

              <div className="pause-toggles">
                <button type="button" className="toggle-row" onClick={() => toggle("sfx")}>
                  {settings.sfx ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <span>Sound effects</span>
                  <span className={`switch${settings.sfx ? " is-on" : ""}`} />
                </button>
                <button type="button" className="toggle-row" onClick={() => toggle("music")}>
                  <Music size={16} />
                  <span>Music</span>
                  <span className={`switch${settings.music ? " is-on" : ""}`} />
                </button>
              </div>

              <div className="pause-controls">
                <div>
                  <span>A / D</span> move
                </div>
                <div>
                  <span>W</span> jump
                </div>
                <div>
                  <span>S</span> crouch
                </div>
                <div>
                  <span>J</span> punch
                </div>
                <div>
                  <span>K</span> kick
                </div>
                <div>
                  <span>U</span> special
                </div>
                <div>
                  <span>I</span> grab
                </div>
                <div>
                  <span>L</span> super
                </div>
              </div>
              <p className="pause-hint">Hold the direction away from your rival to block.</p>
            </div>
          </div>
        )}
      </div>

      {!touch && (
        <div className="control-strip">
          <span>
            <kbd>A</kbd>
            <kbd>D</kbd> move
          </span>
          <span>
            <kbd>W</kbd> jump
          </span>
          <span>
            <kbd>S</kbd> crouch
          </span>
          <span>
            <kbd>J</kbd> punch
          </span>
          <span>
            <kbd>K</kbd> kick
          </span>
          <span>
            <kbd>U</kbd> special
          </span>
          <span>
            <kbd>I</kbd> grab
          </span>
          <span>
            <kbd>L</kbd> super
          </span>
          <span className="strip-extra">
            <Zap size={13} /> hold away to block
          </span>
        </div>
      )}
    </div>
  );
}
