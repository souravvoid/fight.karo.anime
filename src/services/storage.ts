import type { MatchConfig, Settings } from "../types/game";

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

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
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
  return read(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export function loadRecord(): RecordData {
  return read(RECORD_KEY, DEFAULT_RECORD);
}

export function saveRecord(data: RecordData): void {
  write(RECORD_KEY, data);
}

export function saveLastMatch(config: MatchConfig): void {
  write(LAST_KEY, config);
}

export function loadLastMatch(): MatchConfig | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as MatchConfig;
    if (!value.playerId || !value.cpuId || !value.arenaId) return null;
    return value;
  } catch {
    return null;
  }
}
