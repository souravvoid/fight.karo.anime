import { ArrowLeft, Check, Dices, Zap } from "lucide-react";
import { FIGHTER_LIST, FIGHTERS } from "../data/fighters";
import type { FighterId } from "../types/game";
import { FighterPortrait } from "./FighterPortrait";

interface Props {
  step: "player" | "cpu";
  playerId: FighterId;
  cpuId: FighterId | null;
  onChoosePlayer: (id: FighterId) => void;
  onChooseCpu: (id: FighterId) => void;
  onRandomCpu: () => void;
  onBack: () => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-track">
        <span className="stat-fill" style={{ width: `${value * 10}%` }} />
      </span>
    </div>
  );
}

export function FighterSelect({ step, playerId, cpuId, onChoosePlayer, onChooseCpu, onRandomCpu, onBack }: Props) {
  const chosen = step === "player" ? playerId : cpuId;

  return (
    <div className="screen select-screen">
      <div className="bg-orb bg-orb-b" aria-hidden />
      <header className="screen-head">
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">STEP 0{step === "player" ? 2 : 3}</p>
          <h2 className="screen-title">
            {step === "player" ? "CHOOSE YOUR FIGHTER" : "CHOOSE YOUR RIVAL"}
          </h2>
        </div>
        {step === "cpu" && (
          <div className="selected-pill">
            <FighterPortrait def={FIGHTERS[playerId]} size={34} />
            <span>
              YOU: <strong>{FIGHTERS[playerId].name}</strong>
            </span>
          </div>
        )}
      </header>

      <div className="roster">
        {FIGHTER_LIST.map((def) => {
          const takenByOther = step === "cpu" && def.id === playerId;
          const active = chosen === def.id;
          return (
            <button
              key={def.id}
              type="button"
              className={`roster-card${active ? " is-active" : ""}${takenByOther ? " is-taken" : ""}`}
              style={{ ["--fighter-accent" as string]: def.colors.accent }}
              disabled={takenByOther}
              onClick={() => (step === "player" ? onChoosePlayer(def.id) : onChooseCpu(def.id))}
            >
              <span className="roster-glow" aria-hidden />
              <div className="roster-art">
                <FighterPortrait def={def} size={104} dim={takenByOther} />
                {active && (
                  <span className="roster-check">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="roster-body">
                <div className="roster-name-row">
                  <span className="roster-name">{def.name}</span>
                  <span className="roster-arch">{def.archetype}</span>
                </div>
                <p className="roster-epithet">{def.epithet}</p>
                <div className="roster-stats">
                  <StatBar label="HP" value={def.stats.health} />
                  <StatBar label="PWR" value={def.stats.power} />
                  <StatBar label="SPD" value={def.stats.speed} />
                </div>
                <div className="roster-special">
                  <Zap size={12} />
                  {def.specialName}
                </div>
              </div>
              {takenByOther && <span className="roster-taken">YOUR PICK</span>}
            </button>
          );
        })}
      </div>

      {step === "cpu" && (
        <div className="select-footer">
          <button type="button" className="btn btn-ghost" onClick={onRandomCpu}>
            <Dices size={18} />
            Surprise me
          </button>
          <p className="select-hint">Tap a fighter to lock in your rival.</p>
        </div>
      )}
      {step === "player" && (
        <div className="select-footer">
          <p className="select-hint">Every fighter is original. Pick the silhouette that fits how you want to fight.</p>
        </div>
      )}
    </div>
  );
}
