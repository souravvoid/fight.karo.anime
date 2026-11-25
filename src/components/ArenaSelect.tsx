import { ArrowLeft, Flame, Gauge, Moon, Play, Shield, Swords } from "lucide-react";
import { ARENA_LIST } from "../data/arenas";
import { FIGHTERS } from "../data/fighters";
import type { ArenaId, Difficulty, MatchConfig } from "../types/game";
import { FighterPortrait } from "./FighterPortrait";

interface Props {
  config: MatchConfig;
  onArena: (id: ArenaId) => void;
  onDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  onBack: () => void;
}

function DojoPreview() {
  return (
    <svg viewBox="0 0 320 150" className="arena-preview" aria-hidden>
      <defs>
        <linearGradient id="dojo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#120806" />
          <stop offset="100%" stopColor="#331509" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill="url(#dojo-sky)" />
      <circle cx="252" cy="38" r="24" fill="#FFF1D6" opacity="0.92" />
      <circle cx="252" cy="38" r="38" fill="#FFF1D6" opacity="0.08" />
      <path d="M0 118 L46 86 L92 108 L140 80 L196 110 L246 88 L320 116 L320 150 L0 150 Z" fill="#1C0D08" />
      <g fill="#140A06">
        <rect x="122" y="66" width="10" height="60" />
        <rect x="188" y="66" width="10" height="60" />
        <rect x="112" y="60" width="96" height="7" />
        <rect x="118" y="48" width="84" height="7" />
      </g>
      <circle cx="92" cy="72" r="5" fill="#FFD9A0" opacity="0.9" />
      <circle cx="228" cy="80" r="5" fill="#FFD9A0" opacity="0.9" />
      <rect y="126" width="320" height="24" fill="#1A0F0A" />
      <rect y="126" width="320" height="2" fill="#FF7A1A" opacity="0.4" />
    </svg>
  );
}

function CapitalPreview() {
  return (
    <svg viewBox="0 0 320 150" className="arena-preview" aria-hidden>
      <defs>
        <linearGradient id="cap-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A0A06" />
          <stop offset="100%" stopColor="#3D130C" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill="url(#cap-sky)" />
      <circle cx="72" cy="34" r="18" fill="#FFD7B0" opacity="0.85" />
      <circle cx="82" cy="28" r="15" fill="#1A0A06" />
      <g fill="#150A06">
        <rect x="0" y="74" width="44" height="54" />
        <rect x="48" y="56" width="34" height="72" />
        <rect x="86" y="84" width="40" height="44" />
        <rect x="130" y="44" width="38" height="84" />
        <rect x="172" y="70" width="30" height="58" />
        <rect x="206" y="52" width="46" height="76" />
        <rect x="256" y="78" width="30" height="50" />
        <rect x="290" y="60" width="30" height="68" />
      </g>
      <g fill="#FF6A13" opacity="0.6">
        <rect x="56" y="66" width="6" height="8" />
        <rect x="138" y="58" width="6" height="8" />
        <rect x="214" y="66" width="6" height="8" />
        <rect x="222" y="94" width="6" height="8" />
      </g>
      <rect y="126" width="320" height="24" fill="#180C08" />
      <rect y="126" width="320" height="2" fill="#FF6A13" opacity="0.45" />
      <circle cx="150" cy="120" r="2" fill="#FFC26B" opacity="0.9" />
      <circle cx="262" cy="112" r="1.6" fill="#FF6A13" opacity="0.9" />
    </svg>
  );
}

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string; icon: typeof Gauge }[] = [
  { id: "easy", label: "EASY", blurb: "Slow reactions, forgiving gaps.", icon: Shield },
  { id: "normal", label: "NORMAL", blurb: "Blocks, pokes, mixes it up.", icon: Gauge },
  { id: "hard", label: "HARD", blurb: "Punishes whiffs, saves meter.", icon: Flame },
];

export function ArenaSelect({ config, onArena, onDifficulty, onStart, onBack }: Props) {
  const player = FIGHTERS[config.playerId];
  const cpu = FIGHTERS[config.cpuId];

  return (
    <div className="screen arena-screen">
      <div className="bg-orb bg-orb-a" aria-hidden />
      <header className="screen-head">
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">STEP 04</p>
          <h2 className="screen-title">SET THE STAGE</h2>
        </div>
        <div className="matchup-pill">
          <span style={{ color: player.colors.accent }}>{player.name}</span>
          <Swords size={14} />
          <span style={{ color: cpu.colors.accent }}>{cpu.name}</span>
        </div>
      </header>

      <div className="arena-layout">
        <div className="arena-column">
          <p className="section-label">ARENA</p>
          <div className="arena-grid">
            {ARENA_LIST.map((arena) => (
              <button
                key={arena.id}
                type="button"
                className={`arena-card${config.arenaId === arena.id ? " is-active" : ""}`}
                onClick={() => onArena(arena.id)}
                style={{ ["--arena-accent" as string]: arena.accent }}
              >
                {arena.id === "dojo" ? <DojoPreview /> : <CapitalPreview />}
                <div className="arena-card-body">
                  <div className="arena-name-row">
                    {arena.id === "dojo" ? <Moon size={15} /> : <Flame size={15} />}
                    <span className="arena-name">{arena.name}</span>
                  </div>
                  <p className="arena-sub">{arena.subtitle}</p>
                  <p className="arena-desc">{arena.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="setup-column">
          <p className="section-label">CPU DIFFICULTY</p>
          <div className="difficulty-group" role="group" aria-label="CPU difficulty">
            {DIFFICULTIES.map(({ id, label, blurb, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`difficulty${config.difficulty === id ? " is-active" : ""}`}
                onClick={() => onDifficulty(id)}
              >
                <Icon size={16} />
                <span className="difficulty-label">{label}</span>
                <span className="difficulty-blurb">{blurb}</span>
              </button>
            ))}
          </div>

          <div className="versus-card">
            <div className="versus-side">
              <FighterPortrait def={player} size={74} />
              <span className="versus-name">{player.name}</span>
              <span className="versus-role">YOU</span>
            </div>
            <div className="versus-mark">VS</div>
            <div className="versus-side">
              <FighterPortrait def={cpu} size={74} />
              <span className="versus-name">{cpu.name}</span>
              <span className="versus-role">CPU</span>
            </div>
          </div>

          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onStart}>
            <Play size={20} strokeWidth={2.6} />
            {config.mode === "training" ? "START TRAINING" : "FIGHT!"}
          </button>
          <p className="setup-hint">Best of three · 60 seconds per round · first to two rounds wins</p>
        </div>
      </div>
    </div>
  );
}
