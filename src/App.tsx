import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaId, Difficulty, FighterId, MatchConfig, MatchResult, Settings } from "./types/game";
import { loadLastMatch, loadRecord, loadSettings, saveLastMatch, saveRecord, saveSettings, DEFAULT_RECORD } from "./services/storage";
import type { RecordData } from "./services/storage";
import { audio } from "./services/audio";
import { FIGHTER_IDS, FIGHTERS } from "./data/fighters";
import { TitleScreen } from "./components/TitleScreen";
import { ModeSelect } from "./components/ModeSelect";
import { FighterSelect } from "./components/FighterSelect";
import { ArenaSelect } from "./components/ArenaSelect";
import { BattleScreen } from "./components/BattleScreen";
import { ResultScreen } from "./components/ResultScreen";
import { HowToPlay } from "./components/HowToPlay";
import { SettingsPanel } from "./components/SettingsPanel";

type Screen = "title" | "mode" | "select" | "arena" | "battle" | "result" | "howto";

const FALLBACK_CONFIG: MatchConfig = {
  playerId: "kaze",
  cpuId: "helios",
  arenaId: "dojo",
  difficulty: "normal",
  mode: "battle",
};

function initialConfig(): MatchConfig {
  const saved = loadLastMatch();
  if (!saved) return FALLBACK_CONFIG;
  return {
    ...FALLBACK_CONFIG,
    ...saved,
    playerId: FIGHTERS[saved.playerId] ? saved.playerId : FALLBACK_CONFIG.playerId,
    cpuId: FIGHTERS[saved.cpuId] ? saved.cpuId : FALLBACK_CONFIG.cpuId,
    mode: saved.mode === "training" ? "training" : "battle",
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [record, setRecord] = useState<RecordData>(() => loadRecord());
  const [config, setConfig] = useState<MatchConfig>(initialConfig);
  const [selectStep, setSelectStep] = useState<"player" | "cpu">("player");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  const unlocked = useRef(false);

  useEffect(() => {
    saveSettings(settings);
    audio.configure(settings.sfx, settings.music);
    if (unlocked.current) {
      if (settings.music) audio.startMusic();
      else audio.stopMusic();
    }
  }, [settings]);

  useEffect(() => {
    const unlock = () => {
      if (unlocked.current) return;
      unlocked.current = true;
      audio.unlock();
      audio.configure(settings.sfx, settings.music);
      if (settings.music) audio.startMusic();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => audio.stopMusic(), []);

  const click = () => audio.ui();

  const handleResult = useCallback((next: MatchResult) => {
    setResult(next);
    setRecord((prev) => {
      const updated: RecordData = {
        matches: prev.matches + 1,
        wins: prev.wins + (next.winner === "player" ? 1 : 0),
        losses: prev.losses + (next.winner === "cpu" ? 1 : 0),
        bestCombo: Math.max(prev.bestCombo, next.maxCombo),
        roundsWon: prev.roundsWon + next.rounds.player,
      };
      saveRecord(updated);
      return updated;
    });
    setScreen("result");
  }, []);

  const startMatch = () => {
    saveLastMatch(config);
    setBattleKey((k) => k + 1);
    setScreen("battle");
  };

  const pickMode = (mode: "battle" | "training") => {
    setConfig((c) => ({ ...c, mode }));
    setSelectStep("player");
    setScreen("select");
  };

  const pickPlayer = (id: FighterId) => {
    const nextCpu = config.cpuId === id ? (FIGHTER_IDS.find((f) => f !== id) ?? config.cpuId) : config.cpuId;
    setConfig((c) => ({ ...c, playerId: id, cpuId: nextCpu }));
    setSelectStep("cpu");
    click();
  };

  const pickCpu = (id: FighterId) => {
    setConfig((c) => ({ ...c, cpuId: id }));
    setScreen("arena");
    click();
  };

  const randomCpu = () => {
    const pool = FIGHTER_IDS.filter((id) => id !== config.playerId);
    const id = pool[Math.floor(Math.random() * pool.length)];
    setConfig((c) => ({ ...c, cpuId: id }));
    setScreen("arena");
    click();
  };

  return (
    <div className="app" data-reduced-motion={settings.reducedMotion ? "true" : "false"}>
      <div className="app-vignette" aria-hidden />
      <main className="app-main" key={`${screen}-${battleKey}`}>
        {screen === "title" && (
          <TitleScreen
            record={record}
            onPlay={() => {
              click();
              setScreen("mode");
            }}
            onHowTo={() => {
              click();
              setScreen("howto");
            }}
            onSettings={() => {
              click();
              setSettingsOpen(true);
            }}
          />
        )}

        {screen === "mode" && (
          <ModeSelect
            onBattle={() => {
              click();
              pickMode("battle");
            }}
            onTraining={() => {
              click();
              pickMode("training");
            }}
            onBack={() => {
              click();
              setScreen("title");
            }}
          />
        )}

        {screen === "select" && (
          <FighterSelect
            step={selectStep}
            playerId={config.playerId}
            cpuId={selectStep === "cpu" ? config.cpuId : null}
            onChoosePlayer={pickPlayer}
            onChooseCpu={pickCpu}
            onRandomCpu={randomCpu}
            onBack={() => {
              click();
              if (selectStep === "cpu") setSelectStep("player");
              else setScreen("mode");
            }}
          />
        )}

        {screen === "arena" && (
          <ArenaSelect
            config={config}
            onArena={(id: ArenaId) => {
              click();
              setConfig((c) => ({ ...c, arenaId: id }));
            }}
            onDifficulty={(d: Difficulty) => {
              click();
              setConfig((c) => ({ ...c, difficulty: d }));
            }}
            onStart={() => {
              click();
              startMatch();
            }}
            onBack={() => {
              click();
              setSelectStep("cpu");
              setScreen("select");
            }}
          />
        )}

        {screen === "battle" && (
          <BattleScreen
            key={battleKey}
            config={config}
            settings={settings}
            onSettings={setSettings}
            onResult={handleResult}
            onQuit={() => {
              click();
              setScreen("title");
            }}
            onRestart={() => {
              click();
              setBattleKey((k) => k + 1);
            }}
          />
        )}

        {screen === "result" && result && (
          <ResultScreen
            result={result}
            onRematch={() => {
              click();
              setBattleKey((k) => k + 1);
              setScreen("battle");
            }}
            onChange={() => {
              click();
              setSelectStep("player");
              setScreen("select");
            }}
            onMenu={() => {
              click();
              setScreen("title");
            }}
          />
        )}

        {screen === "howto" && (
          <HowToPlay
            onBack={() => {
              click();
              setScreen("title");
            }}
          />
        )}
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          record={record}
          onChange={setSettings}
          onResetRecord={() => {
            setRecord(DEFAULT_RECORD);
            saveRecord(DEFAULT_RECORD);
            click();
          }}
          onClose={() => {
            click();
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}
