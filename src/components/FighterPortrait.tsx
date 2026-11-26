import type { FighterDef } from "../types/game";

interface Props {
  def: FighterDef;
  size?: number;
  dim?: boolean;
}

/** Original vector portrait, drawn from the same palette and silhouette rules as the in-game rig. */
export function FighterPortrait({ def, size = 96, dim = false }: Props) {
  const c = def.colors;
  const gid = `pg-${def.id}`;
  const style = def.build.hair;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${def.name} portrait`}
      style={{ opacity: dim ? 0.4 : 1, display: "block" }}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.35" />
          <stop offset="60%" stopColor={c.secondary} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#08080e" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.primary} />
          <stop offset="100%" stopColor={c.secondary} />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="49" fill={`url(#${gid})`} />
      <circle cx="50" cy="50" r="48" fill="none" stroke={c.accent} strokeOpacity="0.45" strokeWidth="1.5" />

      {/* shoulders */}
      <path d="M18 100 C22 76 34 68 50 68 C66 68 78 76 82 100 Z" fill={`url(#${gid}-body)`} stroke={c.accent} strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M50 68 L44 100 L56 100 Z" fill={c.accent} opacity="0.55" />
      <path d="M38 74 L50 92 L62 74" fill="none" stroke={c.accent} strokeOpacity="0.6" strokeWidth="1.5" />

      {/* neck */}
      <rect x="45" y="58" width="10" height="14" rx="3" fill={c.skin} />

      {/* head */}
      <ellipse cx="50" cy="44" rx="15" ry="16" fill={c.skin} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
      <ellipse cx="52" cy="50" rx="8" ry="6" fill="rgba(0,0,0,0.10)" />

      {/* hair */}
      {style === "spikes" && (
        <path
          d="M34 40 L28 22 L38 30 L38 16 L46 28 L50 12 L54 28 L62 18 L62 31 L72 24 L66 41 C62 32 56 30 50 30 C44 30 38 32 34 40 Z"
          fill={c.hair}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
      )}
      {style === "crown" && (
        <path
          d="M33 40 L30 18 L39 30 L44 12 L50 28 L56 12 L61 30 L70 18 L67 40 C62 31 56 29 50 29 C44 29 38 31 33 40 Z"
          fill={c.hair}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
      )}
      {style === "ponytail" && (
        <>
          <path d="M64 40 C74 36 82 44 80 56 C78 66 70 70 66 64 C72 58 70 48 62 46 Z" fill={c.hair} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          <path d="M34 42 C34 28 42 24 50 24 C58 24 66 28 66 42 C60 34 54 32 50 32 C44 32 38 34 34 42 Z" fill={c.hair} />
        </>
      )}
      {style === "long" && (
        <>
          <path d="M33 44 C31 26 40 22 50 22 C60 22 69 26 67 44 C63 34 57 32 50 32 C43 32 37 34 33 44 Z" fill={c.hair} />
          <path d="M33 42 C29 54 30 66 34 74 L40 72 C36 62 36 50 38 44 Z" fill={c.hair} opacity="0.95" />
          <path d="M67 42 C71 54 70 66 66 74 L60 72 C64 62 64 50 62 44 Z" fill={c.hair} opacity="0.95" />
        </>
      )}
      {style === "short" && (
        <>
          <path d="M33 44 C31 27 40 22 50 22 C60 22 69 27 67 44 C63 34 57 31 50 31 C43 31 37 34 33 44 Z" fill={c.hair} />
          <path d="M35 37 L43 31 L42 41 L50 32 L58 41 L57 31 L65 37 L63 43 L37 43 Z" fill={c.hair} opacity="0.92" />
        </>
      )}
      {style === "tridents" && (
        <path
          d="M33 42 L26 12 L40 30 L44 8 L50 28 L56 8 L60 30 L74 12 L67 42 C62 32 56 30 50 30 C44 30 38 32 33 42 Z"
          fill={c.hair}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
      )}

      {/* accessories */}
      {def.accessory === "headband" && (
        <>
          <rect x="35" y="35" width="30" height="4" rx="1" fill={c.accent} />
          <path d="M35 37 L22 43 L26 50 L36 43 Z" fill={c.accent} opacity="0.8" />
        </>
      )}
      {def.accessory === "goggles" && (
        <>
          <rect x="34" y="34" width="32" height="5" rx="2" fill="#141821" />
          <circle cx="43" cy="36.5" r="5" fill={c.accent} opacity="0.92" />
          <circle cx="57" cy="36.5" r="5" fill={c.accent} opacity="0.92" />
          <circle cx="43" cy="36.5" r="2" fill="#ffffff" opacity="0.65" />
          <circle cx="57" cy="36.5" r="2" fill="#ffffff" opacity="0.65" />
        </>
      )}

      {/* eyes */}
      <ellipse cx="44" cy="45" rx="2.6" ry="3.4" fill="#0b0b14" />
      <ellipse cx="56" cy="45" rx="2.6" ry="3.4" fill="#0b0b14" />
      <circle cx="44.8" cy="43.6" r="1" fill={c.accent} />
      <circle cx="56.8" cy="43.6" r="1" fill={c.accent} />
      <path d="M40 39 L48 40" stroke={c.hair} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M52 40 L60 39" stroke={c.hair} strokeWidth="1.6" strokeLinecap="round" />

      {/* accent slash */}
      <path d="M12 78 L30 66" stroke={c.accent} strokeWidth="2" opacity="0.5" strokeLinecap="round" />
      <path d="M88 78 L70 66" stroke={c.accent} strokeWidth="2" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}
