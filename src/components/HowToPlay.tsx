import { ArrowLeft, Heart, Shield, Smartphone, Swords, Zap } from "lucide-react";

interface Props {
  onBack: () => void;
}

const KEYS: [string, string][] = [
  ["A / D", "Move left and right"],
  ["W", "Jump"],
  ["S", "Crouch"],
  ["J", "Punch — fast, low damage"],
  ["K", "Kick — slower, breaks guard pressure"],
  ["U", "Special — signature technique"],
  ["I", "Grab — unblockable, close range"],
  ["L / Space", "Super — needs a full energy meter"],
  ["Esc / P", "Pause"],
];

export function HowToPlay({ onBack }: Props) {
  return (
    <div className="screen info-screen">
      <div className="bg-orb bg-orb-b" aria-hidden />
      <header className="screen-head">
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">FIELD MANUAL</p>
          <h2 className="screen-title">HOW TO PLAY</h2>
        </div>
      </header>

      <div className="info-grid">
        <section className="info-card">
          <h3>
            <Swords size={17} /> CONTROLS
          </h3>
          <ul className="key-list">
            {KEYS.map(([key, action]) => (
              <li key={key}>
                <kbd>{key}</kbd>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="info-card">
          <h3>
            <Shield size={17} /> DEFENCE
          </h3>
          <p>
            Hold the direction <strong>away from your rival</strong> to guard. Blocked hits deal only chip damage, but
            your guard is not absolute — grabs and signature supers punch straight through it.
          </p>
          <p>
            Crouching shrinks your hurtbox and ducks under high attacks. Jumping commits you to the air: you can drift,
            but you cannot change your mind.
          </p>
        </section>

        <section className="info-card">
          <h3>
            <Zap size={17} /> ENERGY & SUPERS
          </h3>
          <p>
            Landing and taking hits builds the energy bar. Specials have a short cooldown and cost nothing. Supers need a
            full bar and hit for roughly a third of a health bar — they are unblockable, so spend the meter when it will
            land.
          </p>
          <p className="info-note">If the bar is full and glowing, the HUD will tell you.</p>
        </section>

        <section className="info-card">
          <h3>
            <Heart size={17} /> MATCH RULES
          </h3>
          <p>
            Best of three rounds. Each round lasts 60 seconds. Reduce your rival to zero health, or hold the health lead
            when the clock hits zero.
          </p>
          <p>Rounds reset health, energy, positions and cooldowns. First to two rounds takes the match.</p>
        </section>

        <section className="info-card">
          <h3>
            <Smartphone size={17} /> ON A PHONE
          </h3>
          <p>
            Turn the phone sideways. The left pad moves and jumps; the right cluster holds punch, kick, special, grab and
            super. Hold the pad away from your rival to block — same rule as keyboard.
          </p>
        </section>

        <section className="info-card info-card-accent">
          <h3>HOW TO WIN</h3>
          <ul className="tip-list">
            <li>Poke with punch, punish the recovery with kick.</li>
            <li>Do not swing at max range — whiffs are free punishment.</li>
            <li>Build meter with safe hits, then land a super on a blocked opponent.</li>
            <li>Hard CPU reads your habits. Change your rhythm.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
