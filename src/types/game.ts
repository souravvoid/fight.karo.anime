export type FighterId = "kaze" | "helios" | "zuri" | "shiro" | "kai" | "riko" | "sango";
export type ArenaId = "dojo" | "capital";
export type Difficulty = "easy" | "normal" | "hard";
export type FighterSlot = "player" | "cpu";

export type AttackId = "punch" | "kick" | "special" | "super";

export interface AttackDef {
  id: AttackId;
  name: string;
  /** ms before the hitbox appears */
  startup: number;
  /** ms the hitbox is live */
  active: number;
  /** ms before the fighter can act again */
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  /** energy gained by the attacker on hit */
  energyGain: number;
  /** energy cost (super only) */
  energyCost: number;
  /** cooldown in ms, enforced by the fighter */
  cooldown: number;
  /** horizontal reach in front of the fighter body */
  reach: number;
  /** hitbox height offset from the feet */
  y: number;
  w: number;
  h: number;
  /** how the attack is delivered */
  delivery: "melee" | "projectile" | "rush" | "beam";
  /** projectiles and supers that punch through guard */
  unblockable?: boolean;
  /** projectile speed in px/s (projectile / beam) */
  projectileSpeed?: number;
  /** total hits for multi-hit moves */
  hits?: number;
  launch?: boolean;
}

export interface FighterBuild {
  torsoW: number;
  torsoH: number;
  shoulder: number;
  armThickness: number;
  armLength: number;
  legThickness: number;
  legLength: number;
  headR: number;
  hipDrop: number;
  hair: "spikes" | "crown" | "ponytail" | "long" | "short" | "tridents";
}

export interface FighterColors {
  primary: string;
  secondary: string;
  accent: string;
  skin: string;
  hair: string;
  aura: string;
}

export interface FighterDef {
  id: FighterId;
  name: string;
  epithet: string;
  style: string;
  tagline: string;
  bio: string;
  archetype: "Nimble" | "Heavy" | "Brawler" | "Swordsman" | "Striker" | "Elastic" | "Ronin";
  colors: FighterColors;
  /** 1..10 presentation stats */
  stats: { health: number; power: number; speed: number };
  build: FighterBuild;
  accessory: "scarf" | "cape" | "bands" | "sword" | "headband" | "goggles" | "trisword";
  attacks: Record<AttackId, AttackDef>;
  specialName: string;
  superName: string;
  superText: string;
}

export interface ArenaDef {
  id: ArenaId;
  name: string;
  subtitle: string;
  description: string;
  floorY: number;
  bounds: [number, number];
  sky: [string, string];
  accent: string;
}

export interface MatchConfig {
  playerId: FighterId;
  cpuId: FighterId;
  arenaId: ArenaId;
  difficulty: Difficulty;
  mode: "battle" | "training";
}

export interface Settings {
  sfx: boolean;
  music: boolean;
  reducedMotion: boolean;
}

export interface FighterHudState {
  hp: number;
  maxHp: number;
  energy: number;
  wins: number;
  state: string;
}

export type BattlePhase =
  | "intro"
  | "fight"
  | "roundEnd"
  | "matchEnd";

export interface BattleSnapshot {
  phase: BattlePhase;
  timer: number;
  rounds: { player: number; cpu: number };
  player: FighterHudState;
  cpu: FighterHudState;
  banner: { text: string; sub?: string } | null;
  combo: { owner: FighterSlot; count: number } | null;
  announcement: { text: string; sub?: string } | null;
  round: number;
}

export interface MatchResult {
  winner: FighterSlot;
  rounds: { player: number; cpu: number };
  playerId: FighterId;
  cpuId: FighterId;
  arenaId: ArenaId;
  difficulty: Difficulty;
  perfect: boolean;
  durationMs: number;
  maxCombo: number;
}
