import type { Difficulty } from "../types/game";
import { blankInput, type InputState } from "../services/bus";
import type { Fighter } from "./Fighter";

interface Tuning {
  reaction: number;
  jitter: number;
  blockChance: number;
  aggression: number;
  specialChance: number;
  superChance: number;
  attackGap: [number, number];
  punish: number;
  antiAir: number;
}

const TUNING: Record<Difficulty, Tuning> = {
  easy: {
    reaction: 520,
    jitter: 150,
    blockChance: 0.26,
    aggression: 0.42,
    specialChance: 0.14,
    superChance: 0.22,
    attackGap: [700, 1150],
    punish: 0,
    antiAir: 0,
  },
  normal: {
    reaction: 290,
    jitter: 90,
    blockChance: 0.62,
    aggression: 0.65,
    specialChance: 0.4,
    superChance: 0.6,
    attackGap: [420, 780],
    punish: 0.35,
    antiAir: 0.3,
  },
  hard: {
    reaction: 155,
    jitter: 45,
    blockChance: 0.89,
    aggression: 0.82,
    specialChance: 0.62,
    superChance: 0.92,
    attackGap: [280, 520],
    punish: 0.78,
    antiAir: 0.7,
  },
};

/**
 * A lightweight decision maker. It only ever presses the same buttons a human can press,
 * so difficulty changes behaviour rather than secretly buffing damage.
 */
export class CpuBrain {
  private readonly tuning: Tuning;
  private nextThink = 0;
  private nextAttackAt = 0;
  private hold: Pick<InputState, "left" | "right" | "up" | "down"> = {
    left: false,
    right: false,
    up: false,
    down: false,
  };
  private retreatUntil = 0;

  constructor(difficulty: Difficulty) {
    this.tuning = TUNING[difficulty];
  }

  update(now: number, self: Fighter, opponent: Fighter): InputState {
    const out = blankInput();
    const away: "left" | "right" = opponent.x >= self.x ? "left" : "right";
    const toward: "left" | "right" = away === "left" ? "right" : "left";

    const distance = Math.abs(opponent.x - self.x);

    if (self.stunned || self.state === "knockdown" || self.hp <= 0) {
      this.hold = { left: false, right: false, up: false, down: false };
      return out;
    }

    if (now >= this.nextThink) {
      this.nextThink = now + this.tuning.reaction + Math.random() * this.tuning.jitter;
      this.decide(now, self, opponent, distance, away, toward, out);
    }

    if (!self.grounded) {
      this.hold.up = false;
    }

    out.left = this.hold.left;
    out.right = this.hold.right;
    out.up = this.hold.up;
    out.down = this.hold.down;
    return out;
  }

  private decide(
    now: number,
    self: Fighter,
    opponent: Fighter,
    distance: number,
    away: "left" | "right",
    toward: "left" | "right",
    out: InputState,
  ): void {
    const t = this.tuning;
    const opponentAttacking = opponent.state === "attack";
    const opponentRecovering =
      opponent.attack !== null && opponent.attack.elapsed > opponent.attack.def.startup + opponent.attack.def.active;
    const opponentAirborne = !opponent.grounded;
    const canAct = self.canAct();

    this.hold = { left: false, right: false, up: false, down: false };

    if (!canAct) return;

    // 1. Defence — hold away, and sometimes crouch guard.
    const threat = opponentAttacking && distance < 150;
    if (threat && Math.random() < t.blockChance) {
      this.hold[away] = true;
      if (Math.random() < 0.25) this.hold.down = true;
      return;
    }

    // 2. Anti-air.
    if (opponentAirborne && distance < 140 && Math.random() < t.antiAir) {
      this.pressAttack(now, out, Math.random() < 0.5 ? "kick" : "punch");
      return;
    }

    // 3. Punish an unsafe whiff.
    if (opponentRecovering && distance < 150 && Math.random() < t.punish) {
      this.pressAttack(now, out, distance < 90 ? "punch" : "kick");
      return;
    }

    // 4. Cash in a full meter.
    if (self.energy >= 100 && distance < 330 && Math.random() < t.superChance) {
      out.super = true;
      this.nextAttackAt = now + 900;
      return;
    }

    // 5. Zoning tool at mid range.
    const special = self.def.attacks.special;
    const specialIsRanged = special.delivery === "projectile" || special.delivery === "beam";
    if (
      self.isReady("special") &&
      Math.random() < t.specialChance &&
      (specialIsRanged ? distance > 220 : distance < 190)
    ) {
      out.special = true;
      this.nextAttackAt = now + 800;
      return;
    }

    // 6. Close the gap, or attack when in range.
    if (distance > 230) {
      this.hold[toward] = true;
      if (Math.random() < 0.12) this.hold.up = true;
      return;
    }

    if (distance > 120) {
      if (Math.random() < t.aggression * 0.7) this.hold[toward] = true;
      else if (Math.random() < 0.2) this.hold[away] = true;
      if (now >= this.nextAttackAt && Math.random() < t.aggression * 0.35) {
        this.pressAttack(now, out, "kick");
      }
      return;
    }

    // 7. Point blank.
    if (now < this.nextAttackAt) {
      if (Math.random() < 0.3) this.hold[away] = true;
      else this.hold[toward] = true;
      return;
    }

    const roll = Math.random();
    if (roll < t.aggression) {
      this.pressAttack(now, out, roll < t.aggression * 0.55 ? "punch" : "kick");
      return;
    }

    if (roll < t.aggression + 0.18) {
      this.hold[away] = true;
      this.retreatUntil = now + 260;
      return;
    }

    if (Math.random() < 0.3) this.hold.down = true;
    else this.hold[toward] = true;
    void self.state;
    void this.retreatUntil;
  }

  private pressAttack(now: number, out: InputState, kind: "punch" | "kick"): void {
    out[kind] = true;
    const [min, max] = this.tuning.attackGap;
    this.nextAttackAt = now + min + Math.random() * (max - min);
  }
}
