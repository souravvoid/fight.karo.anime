import type { BattleSnapshot, MatchResult } from "../types/game";

type EventMap = {
  snapshot: BattleSnapshot;
  result: MatchResult;
  ready: void;
  pauseRequest: void;
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class Bus {
  private handlers = new Map<string, Set<(payload: unknown) => void>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as (payload: unknown) => void);
    return () => set!.delete(handler as (payload: unknown) => void);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      (handler as Handler<K>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const bus = new Bus();

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  special: boolean;
  grab: boolean;
  super: boolean;
}

export function blankInput(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    special: false,
    grab: false,
    super: false,
  };
}

function blank(): InputState {
  return blankInput();
}

/** Touch / on-screen pad input, written by React, read by Phaser. */
export const touchInput: InputState = blank();

export function setTouchInput(key: keyof InputState, pressed: boolean): void {
  touchInput[key] = pressed;
}

export function resetTouchInput(): void {
  Object.assign(touchInput, blank());
}
