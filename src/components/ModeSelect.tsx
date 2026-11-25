import { ArrowLeft, Bot, Dumbbell, Swords } from "lucide-react";

interface Props {
  onBattle: () => void;
  onTraining: () => void;
  onBack: () => void;
}

export function ModeSelect({ onBattle, onTraining, onBack }: Props) {
  return (
    <div className="screen mode-screen">
      <div className="bg-orb bg-orb-a" aria-hidden />
      <header className="screen-head">
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Back to title">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">STEP 01</p>
          <h2 className="screen-title">SELECT MODE</h2>
        </div>
      </header>

      <div className="mode-grid">
        <button type="button" className="mode-card" onClick={onBattle}>
          <span className="mode-icon">
            <Swords size={34} strokeWidth={2.2} />
          </span>
          <span className="mode-name">CPU BATTLE</span>
          <span className="mode-desc">Best-of-three against an AI opponent. Three difficulty levels.</span>
          <span className="mode-tags">
            <span className="tag tag-live">READY</span>
            <span className="tag">3 DIFFICULTIES</span>
          </span>
          <span className="mode-cta">FIGHT →</span>
        </button>

        <button type="button" className="mode-card" onClick={onTraining}>
          <span className="mode-icon">
            <Dumbbell size={34} strokeWidth={2.2} />
          </span>
          <span className="mode-name">TRAINING</span>
          <span className="mode-desc">A passive dummy that never attacks. Learn ranges, specials and the super meter.</span>
          <span className="mode-tags">
            <span className="tag tag-live">READY</span>
            <span className="tag">NO PRESSURE</span>
          </span>
          <span className="mode-cta">PRACTISE →</span>
        </button>
      </div>

      <div className="mode-note">
        <Bot size={16} />
        Online multiplayer, accounts and story campaigns are intentionally not part of this build.
      </div>
    </div>
  );
}
