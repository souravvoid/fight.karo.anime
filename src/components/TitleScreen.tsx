import { Play, BookOpen, Settings as SettingsIcon, Swords, Trophy } from "lucide-react";
import type { RecordData } from "../services/storage";

interface Props {
  onPlay: () => void;
  onHowTo: () => void;
  onSettings: () => void;
  record: RecordData;
}

export function TitleScreen({ onPlay, onHowTo, onSettings, record }: Props) {
  return (
    <div className="screen title-screen">
      <div className="bg-speedlines" aria-hidden />
      <div className="bg-orb bg-orb-a" aria-hidden />
      <div className="bg-orb bg-orb-b" aria-hidden />

      <div className="title-wrap">
        <div className="title-kicker">
          <span className="kicker-line" />
          A CROSSOVER ARENA ORIGINAL
          <span className="kicker-line" />
        </div>

        <h1 className="logo">
          <span className="logo-top">ANIME</span>
          <span className="logo-main" data-text="CLASH">
            CLASH
          </span>
        </h1>

        <div className="logo-sub">
          <Swords size={16} strokeWidth={2.4} />
          CROSSOVER ARENA
          <Swords size={16} strokeWidth={2.4} />
        </div>

        <p className="title-tagline">Choose your fighter. Unleash your power. Own the arena.</p>

        <div className="title-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onPlay}>
            <Play size={20} strokeWidth={2.6} />
            ENTER THE ARENA
          </button>
          <div className="title-actions-row">
            <button type="button" className="btn btn-ghost" onClick={onHowTo}>
              <BookOpen size={17} />
              How to Play
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSettings}>
              <SettingsIcon size={17} />
              Settings
            </button>
          </div>
        </div>

        <div className="record-strip">
          <div className="record-item">
            <Trophy size={15} />
            <span className="record-value">{record.wins}</span>
            <span className="record-label">WINS</span>
          </div>
          <div className="record-sep" />
          <div className="record-item">
            <span className="record-value">{record.losses}</span>
            <span className="record-label">LOSSES</span>
          </div>
          <div className="record-sep" />
          <div className="record-item">
            <span className="record-value">{record.bestCombo}</span>
            <span className="record-label">BEST COMBO</span>
          </div>
        </div>
      </div>

      <footer className="title-footer">
        <span>Original characters, art and audio. Not affiliated with any anime studio or existing fighting game.</span>
        <span className="footer-dot" />
        <span>Built for the Embarko Student Challenge</span>
      </footer>
    </div>
  );
}
