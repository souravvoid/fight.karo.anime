import { ARENAS } from "../data/arenas";
import { FIGHTERS } from "../data/fighters";
import type { Difficulty, MatchConfig, Settings } from "../types/game";

const SETTINGS_KEY = "anime-clash.settings.v1";
const RECORD_KEY = "anime-clash.record.v1";
const LAST_KEY = "anime-clash.last-match.v1";

export const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  music: true,
  reducedMotion: false,
};

export interface RecordData {
  wins: number;
  losses: number;
  matches: number;
  bestCombo: number;
  roundsWon: number;
}

export const DEFAULT_RECORD: RecordData = {
  wins: 0,
  losses: 0,
  matches: 0,
  bestCombo: 0,
  roundsWon: 0,
};

const FIGHTER_IDS: readonly string[] = Object.keys(FIGHTERS);
const ARENA_IDS: readonly string[] = Object.keys(ARENAS);
const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isSettings(value: unknown): value is Settings {
  if (!isObject(value)) return false;
  return (
    isBoolean(value.sfx) && isBoolean(value.music) && isBoolean(value.reducedMotion)
  );
}

function isRecordData(value: unknown): value is RecordData {
  if (!isObject(value)) return false;
  return (
    isCount(value.wins) &&
    isCount(value.losses) &&
    isCount(value.matches) &&
    isCount(value.bestCombo) &&
    isCount(value.roundsWon)
  );
}

function isMatchConfig(value: unknown): value is MatchConfig {
  if (!isObject(value)) return false;
  return (
    typeof value.playerId === "string" &&
    FIGHTER_IDS.includes(value.playerId) &&
    typeof value.cpuId === "string" &&
    FIGHTER_IDS.includes(value.cpuId) &&
    typeof value.arenaId === "string" &&
    ARENA_IDS.includes(value.arenaId) &&
    DIFFICULTIES.includes(value.difficulty as Difficulty) &&
    (value.mode === "battle" || value.mode === "training")
  );
}

/**
 * localStorage is user-writable, so every stored value is treated as untrusted
 * input. A corrupt or tampered save falls back to defaults instead of flowing
 * arbitrary values into React state.
 */
function read<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — game still works, just without persistence */
  }
}

export function loadSettings(): Settings {
  return read(SETTINGS_KEY, DEFAULT_SETTINGS, isSettings);
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export function loadRecord(): RecordData {
  return read(RECORD_KEY, DEFAULT_RECORD, isRecordData);
}

export function saveRecord(data: RecordData): void {
  write(RECORD_KEY, data);
}

export function saveLastMatch(config: MatchConfig): void {
  write(LAST_KEY, config);
}

export function loadLastMatch(): MatchConfig | null {
  return read<MatchConfig | null>(LAST_KEY, null, (value): value is MatchConfig | null =>
    value === null || isMatchConfig(value),
  );
}
