import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import type { BattleSnapshot, MatchConfig } from "../types/game";
import { FIGHTERS } from "../data/fighters";
import { bus } from "../services/bus";

function RoundPips({ wins, side }: { wins: number; side: "left" | "right" }) {
  return (
    <div className={`pips pips-${side}`} aria-label={`${wins} rounds won`}>
      {[0, 1].map((i) => (
        <span key={i} className={`pip${i < wins ? " is-on" : ""}`} />
      ))}
    </div>
  );
}

function FighterPanel({
  name,
  role,
  hp,
  maxHp,
  energy,
  wins,
  side,
}: {
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  energy: number;
  wins: number;
  side: "left" | "right";
}) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const energyPct = Math.max(0, Math.min(100, energy));
  return (
    <div className={`fighter-panel fighter-panel-${side}`}>
      <div className="fh-name-row">
        <span className="fh-role">{role}</span>
        <span className="fh-name">{name}</span>
        <RoundPips wins={wins} side={side} />
      </div>
      <div className={`hp-track${hpPct < 25 ? " is-low" : ""}`}>
        <div className="hp-ghost" style={{ width: `${hpPct}%` }} />
        <div className="hp-fill" style={{ width: `${hpPct}%` }} />
        <div className="hp-gloss" />
      </div>
      <div className={`energy-track${energyPct >= 100 ? " is-full" : ""}`}>
        <div className="energy-fill" style={{ width: `${energyPct}%` }} />
        <span className="energy-label">
          {energyPct >= 100 ? (
            <>
              <Flame size={11} /> SUPER READY
            </>
          ) : (
            "ENERGY"
          )}
        </span>
      </div>
    </div>
  );
}

export function Hud({ config }: { config: MatchConfig }) {
  const [snap, setSnap] = useState<BattleSnapshot | null>(null);

  useEffect(() => bus.on("snapshot", setSnap), []);

  const player = FIGHTERS[config.playerId];
  const cpu = FIGHTERS[config.cpuId];

  const p = snap?.player ?? { hp: 100, maxHp: 100, energy: 0, wins: 0, state: "idle" };
  const c = snap?.cpu ?? { hp: 100, maxHp: 100, energy: 0, wins: 0, state: "idle" };

  return (
    <div className="hud" aria-live="off">
      <div className="hud-top">
        <FighterPanel
          name={player.name}
          role="P1"
          hp={p.hp}
          maxHp={p.maxHp}
          energy={p.energy}
          wins={p.wins}
          side="left"
        />

        <div className="hud-center">
          <div className="timer">{snap ? snap.timer : 60}</div>
          <div className="round-label">ROUND {snap?.round ?? 1}</div>
        </div>

        <FighterPanel
          name={cpu.name}
          role={config.mode === "training" ? "DUMMY" : "CPU"}
          hp={c.hp}
          maxHp={c.maxHp}
          energy={c.energy}
          wins={c.wins}
          side="right"
        />
      </div>

      {snap?.banner && (
        <div className="battle-banner" key={`${snap.banner.text}-${snap.banner.sub ?? ""}`}>
          <div className="banner-text">{snap.banner.text}</div>
          {snap.banner.sub && <div className="banner-sub">{snap.banner.sub}</div>}
        </div>
      )}

      {snap?.announcement && (
        <div className="super-announce">
          <div className="super-kicker">SIGNATURE ART</div>
          <div className="super-name">{snap.announcement.text}</div>
          {snap.announcement.sub && <div className="super-sub">{snap.announcement.sub}</div>}
        </div>
      )}

      {snap?.combo && (
        <div className={`combo-counter combo-${snap.combo.owner}`}>
          <span className="combo-num">{snap.combo.count}</span>
          <span className="combo-text">
            HIT
            <br />
            COMBO
          </span>
        </div>
      )}
    </div>
  );
}
