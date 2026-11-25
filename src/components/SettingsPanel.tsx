import { Music, Sparkles, Trash2, Volume2, X } from "lucide-react";
import type { Settings } from "../types/game";
import type { RecordData } from "../services/storage";

interface Props {
  settings: Settings;
  record: RecordData;
  onChange: (s: Settings) => void;
  onResetRecord: () => void;
  onClose: () => void;
}

function Toggle({
  label,
  hint,
  icon,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="settings-row" onClick={onToggle} aria-pressed={on}>
      <span className="settings-icon">{icon}</span>
      <span className="settings-copy">
        <span className="settings-label">{label}</span>
        <span className="settings-hint">{hint}</span>
      </span>
      <span className={`switch${on ? " is-on" : ""}`} />
    </button>
  );
}

export function SettingsPanel({ settings, record, onChange, onResetRecord, onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal">
        <header className="modal-head">
          <div>
            <p className="eyebrow">CONFIGURATION</p>
            <h2 className="modal-title">SETTINGS</h2>
          </div>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </header>

        <div className="settings-list">
          <Toggle
            label="Sound effects"
            hint="Hits, blocks, specials and interface clicks."
            icon={<Volume2 size={18} />}
            on={settings.sfx}
            onToggle={() => onChange({ ...settings, sfx: !settings.sfx })}
          />
          <Toggle
            label="Music"
            hint="Original procedural arcade loop."
            icon={<Music size={18} />}
            on={settings.music}
            onToggle={() => onChange({ ...settings, music: !settings.music })}
          />
          <Toggle
            label="Reduced motion"
            hint="Softens camera shake and screen flashes."
            icon={<Sparkles size={18} />}
            on={settings.reducedMotion}
            onToggle={() => onChange({ ...settings, reducedMotion: !settings.reducedMotion })}
          />
        </div>

        <div className="settings-record">
          <p className="section-label">LOCAL RECORD</p>
          <div className="record-grid">
            <div>
              <span className="record-value">{record.matches}</span>
              <span className="record-label">MATCHES</span>
            </div>
            <div>
              <span className="record-value">{record.wins}</span>
              <span className="record-label">WINS</span>
            </div>
            <div>
              <span className="record-value">{record.losses}</span>
              <span className="record-label">LOSSES</span>
            </div>
            <div>
              <span className="record-value">{record.bestCombo}</span>
              <span className="record-label">BEST COMBO</span>
            </div>
          </div>
          <button type="button" className="btn btn-danger-ghost" onClick={onResetRecord}>
            <Trash2 size={15} />
            Reset local record
          </button>
        </div>

        <p className="modal-footnote">
          Settings and record are stored in this browser only. No account, no backend, no tracking.
        </p>
      </div>
    </div>
  );
}
