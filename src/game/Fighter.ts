import type { AttackDef, AttackId, FighterDef } from "../types/game";
import { maxHealthFor, powerScaleFor, walkSpeedFor } from "../data/fighters";
import { blankInput, type InputState } from "../services/bus";
import type { FighterState } from "./states";
import { boxesOverlap, clamp } from "./geometry";

export interface Hurtbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FighterHooks {
  onWhiff: (f: Fighter, kind: "punch" | "kick" | "special") => void;
  onLand: (f: Fighter) => void;
  onProjectile: (f: Fighter, def: AttackDef) => void;
  onSuperStart: (f: Fighter, def: AttackDef) => void;
  onHit: (attacker: Fighter, defender: Fighter, def: AttackDef, blocked: boolean, damage: number) => void;
}

interface AttackInstance {
  def: AttackDef;
  elapsed: number;
  hitIndex: number;
  lastHitAt: number;
  fired: boolean;
  whiffed: boolean;
}

const GRAVITY = 2700;
const JUMP_VELOCITY = -940;
const PUSHBOX = 46;
const STUN_HIT = 300;

export class Fighter {
  readonly def: FighterDef;
  readonly isPlayer: boolean;
  readonly hooks: FighterHooks;

  x: number;
  y: number;
  vx = 0;
  vy = 0;
  grounded = true;
  facing: 1 | -1 = 1;

  hp: number;
  maxHp: number;
  energy = 0;

  state: FighterState = "idle";
  stateTime = 0;

  attack: AttackInstance | null = null;
  stunUntil = 0;
  private cooldowns: Partial<Record<AttackId, number>> = {};
  private grabReadyAt = 0;
  private prevInput: InputState = blankInput();
  private pressBuffer: Partial<Record<keyof InputState, number>> = {};
  private now = 0;
  private readonly floorY: number;
  private readonly bounds: [number, number];
  private hasLanded = true;

  constructor(
    def: FighterDef,
    opts: { x: number; facing: 1 | -1; floorY: number; bounds: [number, number]; isPlayer: boolean; hooks: FighterHooks },
  ) {
    this.def = def;
    this.maxHp = maxHealthFor(def);
    this.hp = this.maxHp;
    this.x = opts.x;
    this.y = opts.floorY;
    this.facing = opts.facing;
    this.floorY = opts.floorY;
    this.bounds = opts.bounds;
    this.isPlayer = opts.isPlayer;
    this.hooks = opts.hooks;
  }

  get damageScale(): number {
    return powerScaleFor(this.def);
  }

  get walkSpeed(): number {
    return walkSpeedFor(this.def);
  }

  get isAttacking(): boolean {
    return this.state === "attack";
  }

  get stunned(): boolean {
    return this.now < this.stunUntil;
  }

  isReady(id: AttackId): boolean {
    return (this.cooldowns[id] ?? 0) <= 0;
  }

  canAct(): boolean {
    return (
      (this.state === "idle" || this.state === "walk" || this.state === "crouch" || this.state === "block" || this.state === "jump") &&
      this.hp > 0 &&
      !this.stunned
    );
  }

  resetForRound(x: number, facing: 1 | -1): void {
    this.x = x;
    this.y = this.floorY;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.facing = facing;
    this.hp = this.maxHp;
    this.energy = 0;
    this.state = "idle";
    this.stateTime = 0;
    this.attack = null;
    this.stunUntil = 0;
    this.cooldowns = {};
    this.grabReadyAt = 0;
    this.prevInput = blankInput();
    this.pressBuffer = {};
    this.hasLanded = true;
  }

  private setState(state: FighterState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateTime = 0;
  }

  private tickInputEdges(input: InputState): void {
    const keys: (keyof InputState)[] = ["left", "right", "up", "down", "punch", "kick", "special", "grab", "super"];
    for (const k of keys) {
      if (input[k] && !this.prevInput[k]) this.pressBuffer[k] = this.now + 130;
      this.prevInput[k] = input[k];
    }
  }

  private consume(key: keyof InputState): boolean {
    if ((this.pressBuffer[key] ?? 0) >= this.now) {
      this.pressBuffer[key] = 0;
      return true;
    }
    return false;
  }

  private peek(key: keyof InputState): boolean {
    return (this.pressBuffer[key] ?? 0) >= this.now;
  }

  step(dtMs: number, input: InputState, opponent: Fighter): void {
    this.now += dtMs;
    this.stateTime += dtMs;
    const dt = dtMs / 1000;

    for (const key of Object.keys(this.cooldowns) as AttackId[]) {
      const value = this.cooldowns[key] ?? 0;
      if (value > 0) this.cooldowns[key] = Math.max(0, value - dtMs);
    }

    this.tickInputEdges(input);

    if (this.state === "knockdown") {
      this.vx *= Math.pow(0.002, dt);
      this.physics(dt);
      if (this.stateTime > 900 && this.hp > 0) this.setState("idle");
      return;
    }

    if (this.state === "defeat" || this.state === "victory") {
      this.vx *= Math.pow(0.01, dt);
      this.physics(dt);
      return;
    }

    if (this.state === "hit") {
      this.vx *= Math.pow(0.02, dt);
      this.physics(dt);
      if (this.stateTime > STUN_HIT) this.setState("idle");
      return;
    }

    if (this.state === "attack" && this.attack) {
      this.advanceAttack(dtMs, dt, opponent);
      this.physics(dt);
      return;
    }

    if (!this.grounded) {
      const dir = input.left ? -1 : input.right ? 1 : 0;
      this.vx += dir * 260 * dt;
      this.vx = clamp(this.vx, -this.walkSpeed * 0.95, this.walkSpeed * 0.95);
    }

    const awayHeld = this.facing === 1 ? input.left : input.right;
    const towardHeld = this.facing === 1 ? input.right : input.left;
    const opponentThreat = opponent.state === "attack" || opponent.attack !== null;

    if (this.grounded) {
      if (this.canAct()) this.facing = opponent.x >= this.x ? 1 : -1;

      if (input.down) {
        this.setState("crouch");
        this.vx = 0;
      } else if (this.stunned) {
        this.vx *= Math.pow(0.02, dt);
      } else if (awayHeld && (opponentThreat || this.state === "block")) {
        this.setState("block");
        this.vx = -this.facing * this.walkSpeed * 0.4;
      } else if (towardHeld) {
        this.setState("walk");
        this.vx = this.facing * this.walkSpeed;
      } else if (awayHeld) {
        this.setState("walk");
        this.vx = -this.facing * this.walkSpeed * 0.7;
      } else if (this.state !== "jump") {
        this.setState("idle");
        this.vx *= Math.pow(0.0005, dt);
      }
    } else if (this.state !== "jump") {
      this.setState("jump");
    }

    if (this.grounded && this.consume("up")) {
      this.vy = JUMP_VELOCITY;
      this.grounded = false;
      this.hasLanded = false;
      this.setState("jump");
      if (input.left) this.vx = -this.walkSpeed * 0.8;
      if (input.right) this.vx = this.walkSpeed * 0.8;
    }

    this.tryAttacks();

    this.physics(dt);
  }

  private tryAttacks(): void {
    if (!this.canAct() || this.attack) return;

    if (this.peek("super") && this.energy >= 100) {
      this.consume("super");
      this.startAttack("super");
      return;
    }
    if (this.peek("special") && (this.cooldowns.special ?? 0) <= 0) {
      this.consume("special");
      this.startAttack("special");
      return;
    }
    if (this.peek("punch")) {
      this.consume("punch");
      this.startAttack("punch");
      return;
    }
    if (this.peek("kick")) {
      this.consume("kick");
      this.startAttack("kick");
      return;
    }
    if (this.peek("grab") && this.now >= this.grabReadyAt) {
      this.consume("grab");
      this.startAttack("grab");
    }
  }

  private grabDef(): AttackDef {
    const punch = this.def.attacks.punch;
    return {
      ...punch,
      id: "punch",
      name: "Throw",
      startup: 90,
      active: 40,
      recovery: 330,
      damage: 8,
      hitstun: 420,
      blockstun: 0,
      knockback: 11,
      energyGain: 8,
      energyCost: 0,
      cooldown: 600,
      reach: 26,
      y: 92,
      w: 40,
      h: 60,
      delivery: "melee",
      unblockable: true,
      launch: false,
    };
  }

  private startAttack(id: AttackId | "grab"): void {
    const def = id === "grab" ? this.grabDef() : this.def.attacks[id];
    if (def.energyCost > 0 && this.energy < def.energyCost) return;
    this.energy = Math.max(0, this.energy - def.energyCost);
    if (id === "grab") this.grabReadyAt = this.now + def.cooldown;
    else this.cooldowns[id] = def.cooldown;

    this.attack = { def, elapsed: 0, hitIndex: 0, lastHitAt: -999, fired: false, whiffed: false };
    this.setState("attack");
    this.stateTime = 0;
    this.vx = def.delivery === "rush" ? this.facing * 300 : 0;

    if (id === "super") this.hooks.onSuperStart(this, def);
  }

  private advanceAttack(dtMs: number, dt: number, opponent: Fighter): void {
    const a = this.attack;
    if (!a) return;
    a.elapsed += dtMs;
    const def = a.def;

    if (def.delivery === "rush") {
      this.vx = this.facing * Math.max(110, 330 - a.elapsed * 0.45);
    } else {
      this.vx *= Math.pow(0.15, dt);
    }

    const activeStart = def.startup;
    const activeEnd = def.startup + def.active;

    if ((def.delivery === "projectile" || def.delivery === "beam") && !a.fired && a.elapsed >= activeStart) {
      a.fired = true;
      this.hooks.onProjectile(this, def);
    }

    if ((def.delivery === "melee" || def.delivery === "rush") && a.elapsed >= activeStart && a.elapsed <= activeEnd) {
      if (this.canHitNow(a)) {
        const hit = this.hitboxFor(def);
        const target = opponent.hurtbox();
        const intersects = boxesOverlap(
          { x: hit.x - hit.w / 2, y: hit.y - hit.h / 2, w: hit.w, h: hit.h },
          { x: target.x - target.w / 2, y: target.y - target.h / 2, w: target.w, h: target.h },
        );
        if (intersects) {
          a.lastHitAt = a.elapsed;
          a.hitIndex += 1;
          opponent.receiveHit(def, this, this.damageScale, false, def.damage / (def.hits ?? 1));
        } else if (!a.whiffed) {
          a.whiffed = true;
          this.hooks.onWhiff(this, def.id === "kick" ? "kick" : "punch");
        }
      }
    }

    if (a.elapsed >= def.startup + def.active + def.recovery) {
      this.attack = null;
      this.setState("idle");
    }
  }

  private canHitNow(a: AttackInstance): boolean {
    const maxHits = a.def.hits ?? 1;
    if (a.hitIndex >= maxHits) return false;
    if (a.hitIndex === 0) return true;
    const spacing = a.def.active / maxHits;
    return a.elapsed - a.lastHitAt >= spacing * 0.8;
  }

  hitboxFor(def: AttackDef): Hurtbox {
    return {
      x: this.x + this.facing * (def.reach + 15),
      y: this.y - def.y,
      w: def.w,
      h: def.h,
    };
  }

  hurtbox(): Hurtbox {
    const crouching = this.state === "crouch";
    const h = crouching ? 74 : 116;
    return { x: this.x, y: this.y - h / 2 - 4, w: crouching ? 54 : 42, h };
  }

  receiveHit(def: AttackDef, attacker: Fighter, powerScale: number, fromProjectile = false, damageOverride?: number): { blocked: boolean; damage: number } {
    if (this.state === "defeat" || this.hp <= 0) return { blocked: false, damage: 0 };
    if (this.state === "knockdown" && !fromProjectile) return { blocked: false, damage: 0 };

    const guardUp = this.state === "block";
    const blocked = guardUp && !def.unblockable;

    let damage = (damageOverride ?? def.damage) * powerScale;
    if (blocked) damage *= 0.14;
    damage = Math.round(damage * 10) / 10;
    this.hp = Math.max(0, this.hp - damage);

    this.vx = attacker.facing * def.knockback * (blocked ? 14 : 24);

    if (blocked) {
      this.state = "block";
      this.stateTime = 0;
      this.stunUntil = this.now + def.blockstun;
      this.energy = Math.min(100, this.energy + 4);
      attacker.energy = Math.min(100, attacker.energy + 3);
    } else {
      if (this.hp <= 0) this.knockDown();
      else {
        this.state = "hit";
        this.stateTime = 0;
        this.stunUntil = this.now + def.hitstun;
      }
      if (def.launch) {
        this.vy = -430;
        this.grounded = false;
      }
      this.energy = Math.min(100, this.energy + damage * 0.45);
      attacker.energy = Math.min(100, attacker.energy + def.energyGain + damage * 0.3);
    }

    this.hooks.onHit(attacker, this, def, blocked, damage);
    return { blocked, damage };
  }

  knockDown(): void {
    this.state = "knockdown";
    this.stateTime = 0;
    this.vx = this.facing * -70;
    this.stunUntil = this.now + 900;
  }

  setVictory(): void {
    this.setState("victory");
    this.vx = 0;
    this.vy = 0;
  }

  setDefeat(): void {
    this.setState("defeat");
    this.vx = 0;
  }

  private physics(dt: number): void {
    this.x += this.vx * dt;
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= this.floorY) {
        this.y = this.floorY;
        this.vy = 0;
        this.grounded = true;
        if (!this.hasLanded) {
          this.hasLanded = true;
          this.hooks.onLand(this);
        }
        if (this.state === "jump") this.setState("idle");
      }
    }
    this.x = clamp(this.x, this.bounds[0], this.bounds[1]);
    if (this.x <= this.bounds[0] + 1 || this.x >= this.bounds[1] - 1) this.vx = 0;
  }

  static separate(a: Fighter, b: Fighter): void {
    const dx = b.x - a.x;
    const min = PUSHBOX + 4;
    if (Math.abs(dx) < min) {
      const dir = dx === 0 ? a.facing : Math.sign(dx);
      const overlap = (min - Math.abs(dx)) / 2;
      a.x -= dir * overlap;
      b.x += dir * overlap;
      const [lo, hi] = a.boundsForPush;
      a.x = clamp(a.x, lo, hi);
      b.x = clamp(b.x, lo, hi);
    }
  }

  get boundsForPush(): [number, number] {
    return this.bounds;
  }

  energyRatio(): number {
    return this.energy / 100;
  }
}
