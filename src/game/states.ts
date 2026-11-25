import type { AttackId } from "../types/game";

export type FighterState =
  | "idle"
  | "walk"
  | "jump"
  | "crouch"
  | "block"
  | "attack"
  | "hit"
  | "knockdown"
  | "victory"
  | "defeat";

export interface AttackProgress {
  id: AttackId;
  /** 0..1 through startup+active+recovery */
  progress: number;
  phase: "startup" | "active" | "recovery";
}

export interface Pose {
  lean: number;
  armF: number;
  armB: number;
  legF: number;
  legB: number;
  headTilt: number;
  bodyY: number;
  frontStretch: number;
}

export const NEUTRAL_POSE: Pose = {
  lean: 0,
  armF: 10,
  armB: -12,
  legF: 7,
  legB: -7,
  headTilt: 0,
  bodyY: 0,
  frontStretch: 1,
};
