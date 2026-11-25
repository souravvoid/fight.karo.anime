import { ArrowLeft, Crown, Repeat, Swords, Timer, Trophy, Users } from "lucide-react";
import { ARENAS } from "../data/arenas";
import { FIGHTERS } from "../data/fighters";
import type { MatchResult } from "../types/game";
import { FighterPortrait } from "./FighterPortrait";

interface Props {
  result: MatchResult;
  onRematch: () => void;
  onChange: () => void;
  onMenu: () => void;
}

export function ResultScreen({ result, onRematch, onChange, onMenu }: Props) {
  const won = result.winner === "player";
  const player = FIGHTERS[result.playerId];
  const cpu = FIGHTERS[result.cpuId];
  const arena = ARENAS[result.arenaId];
  const seconds = Math.round(result.durationMs / 1000);

  return (
    <div className={`screen result-screen ${won ? "is-win" : "is-loss"}`}>
      <div className="bg-orb bg-orb-a" aria-hidden />
      <div className="bg-orb bg-orb-b" aria-hidden />

      <div className="result-wrap">
        <p className="eyebrow">{won ? "MATCH COMPLETE" : "MATCH COMPLETE"}</p>
        <h1 className="result-title">{won ? "VICTORY" : "DEFEAT"}</h1>

        <div className="result-heroes">
          <div className={`result-hero${won ? " is-champion" : ""}`}>
            <FighterPortrait def={player} size={104} />
            <span className="result-hero-name">{player.name}</span>
            <span className="result-hero-role">YOU</span>
            {won && (
              <span className="crown-badge">
                <Crown size={14} /> CHAMPION
              </span>
            )}
          </div>

          <div className="result-score">
            <div className="score-line">
              <span className={won ? "score-win" : "score-lose"}>{result.rounds.player}</span>
              <span className="score-dash">–</span>
              <span className={!won ? "score-win" : "score-lose"}>{result.rounds.cpu}</span>
            </div>
            <div className="score-caption">ROUNDS</div>
            <div className="score-vs">
              <Swords size={13} /> {arena.name}
            </div>
          </div>

          <div className={`result-hero${!won ? " is-champion" : ""}`}>
            <FighterPortrait def={cpu} size={104} />
            <span className="result-hero-name">{cpu.name}</span>
            <span className="result-hero-role">CPU</span>
            {!won && (
              <span className="crown-badge">
                <Crown size={14} /> CHAMPION
              </span>
            )}
          </div>
        </div>

        <div className="result-stats">
          <div className="result-stat">
            <Trophy size={16} />
            <span className="result-stat-value">{result.difficulty.toUpperCase()}</span>
            <span className="result-stat-label">DIFFICULTY</span>
          </div>
          <div className="result-stat">
            <Repeat size={16} />
            <span className="result-stat-value">{result.maxCombo}</span>
            <span className="result-stat-label">BEST COMBO</span>
          </div>
          <div className="result-stat">
            <Timer size={16} />
            <span className="result-stat-value">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
            <span className="result-stat-label">MATCH TIME</span>
          </div>
          <div className="result-stat">
            <Users size={16} />
            <span className="result-stat-value">{result.perfect ? "PERFECT" : "—"}</span>
            <span className="result-stat-label">FLAWLESS</span>
          </div>
        </div>

        <div className="result-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onRematch}>
            <Repeat size={19} />
            REMATCH
          </button>
          <button type="button" className="btn btn-ghost" onClick={onChange}>
            <Users size={18} />
            Change fighters
          </button>
          <button type="button" className="btn btn-ghost" onClick={onMenu}>
            <ArrowLeft size={18} />
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
}
