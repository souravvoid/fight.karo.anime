import Phaser from "phaser";
import { ARENAS } from "../data/arenas";
import { FIGHTERS } from "../data/fighters";
import type { AttackDef, BattlePhase, BattleSnapshot, MatchConfig, MatchResult, Settings } from "../types/game";
import { Fighter } from "./Fighter";
import type { FighterHooks } from "./Fighter";
import { FighterRig } from "./FighterRig";
import { Effects, toInt } from "./Effects";
import { buildArena } from "./ArenaBuilder";
import type { ArenaView } from "./ArenaBuilder";
import { CpuBrain } from "./CpuBrain";
import { ensureTextures } from "./textures";
import { blankInput, bus, touchInput } from "../services/bus";
import type { InputState } from "../services/bus";
import { audio } from "../services/audio";
import { battleControl } from "../services/control";

const STEP = 1000 / 60;
const ROUND_MS = 60_000;

interface Projectile {
  obj: Phaser.GameObjects.Container;
  def: AttackDef;
  owner: Fighter;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  born: number;
  lastTrail: number;
}

export class BattleScene extends Phaser.Scene {
  private config!: MatchConfig;
  private settings!: Settings;

  private player!: Fighter;
  private cpu!: Fighter;
  private playerRig!: FighterRig;
  private cpuRig!: FighterRig;
  private brain!: CpuBrain;
  private effects!: Effects;
  private arenaView!: ArenaView;
  private floorY = 596;
  private bounds: [number, number] = [120, 1160];

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private accumulator = 0;
  private visualTime = 0;
  private simTime = 0;
  private hitstop = 0;
  private superFreeze = 0;

  private phase: BattlePhase = "intro";
  private phaseTime = 0;
  private round = 1;
  private wins = { player: 0, cpu: 0 };
  private roundTime = ROUND_MS;
  private banner: { text: string; sub?: string } | null = null;
  private announcement: { text: string; sub?: string; until: number } | null = null;
  private combos = {
    player: { count: 0, last: 0 },
    cpu: { count: 0, last: 0 },
  };
  private maxCombo = 0;
  private playerTookDamage = false;
  private resultSent = false;
  private lastEmit = 0;
  private projectiles: Projectile[] = [];
  private startedAt = 0;

  constructor() {
    super("Battle");
  }

  create(): void {
    ensureTextures(this);
    this.config = this.registry.get("match") as MatchConfig;
    this.settings = this.registry.get("settings") as Settings;

    const arena = ARENAS[this.config.arenaId];
    this.floorY = arena.floorY;
    this.bounds = arena.bounds;
    this.arenaView = buildArena(this, arena);
    this.effects = new Effects(this);
    this.effects.setReducedMotion(this.settings.reducedMotion);

    const hooks: FighterHooks = {
      onWhiff: (_f, kind) => {
        if (kind === "punch") audio.whiff();
        else if (kind === "kick") audio.whiff();
        else audio.special();
      },
      onLand: (f) => {
        this.effects.dust(f.x, f.y - 4);
      },
      onProjectile: (f, def) => this.spawnProjectile(f, def),
      onSuperStart: (f, def) => this.startCinematic(f, def),
      onHit: (attacker, defender, def, blocked, damage) => this.registerHit(attacker, defender, def, blocked, damage),
    };

    this.player = new Fighter(this, FIGHTERS[this.config.playerId], {
      x: 430,
      facing: 1,
      floorY: this.floorY,
      bounds: this.bounds,
      isPlayer: true,
      hooks,
    });
    this.cpu = new Fighter(this, FIGHTERS[this.config.cpuId], {
      x: 850,
      facing: -1,
      floorY: this.floorY,
      bounds: this.bounds,
      isPlayer: false,
      hooks,
    });

    this.playerRig = new FighterRig(this, this.player.def);
    this.cpuRig = new FighterRig(this, this.cpu.def);
    this.brain = new CpuBrain(this.config.difficulty);

    this.bindInput();
    this.beginRound(true);

    battleControl.pause = () => {
      if (this.scene.isActive()) this.scene.pause();
    };
    battleControl.resume = () => {
      if (this.scene.isPaused()) this.scene.resume();
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      battleControl.pause = undefined;
      battleControl.resume = undefined;
      this.projectiles.forEach((p) => p.obj.destroy(true));
      this.projectiles = [];
    });

    this.startedAt = performance.now();
    audio.gong();
    this.emitSnapshot(true);
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = keyboard.addKeys("A,D,W,S,J,K,U,I,L,SPACE,ESC,P,LEFT,RIGHT,UP,DOWN") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
    ]);
  }

  private readPlayerInput(): InputState {
    const down = (name: string): boolean => this.keys[name]?.isDown ?? false;
    return {
      left: down("A") || down("LEFT") || touchInput.left,
      right: down("D") || down("RIGHT") || touchInput.right,
      up: down("W") || down("UP") || touchInput.up,
      down: down("S") || down("DOWN") || touchInput.down,
      punch: down("J") || touchInput.punch,
      kick: down("K") || touchInput.kick,
      special: down("U") || touchInput.special,
      grab: down("I") || touchInput.grab,
      super: down("L") || down("SPACE") || touchInput.super,
    };
  }

  private beginRound(first: boolean): void {
    this.phase = "intro";
    this.phaseTime = 0;
    this.roundTime = ROUND_MS;
    this.banner = { text: `ROUND ${this.round}`, sub: first ? "CHOOSE YOUR MOMENT" : "RESET" };
    this.announcement = null;
    this.player.resetForRound(430, 1);
    this.cpu.resetForRound(850, -1);
    this.combos.player = { count: 0, last: 0 };
    this.combos.cpu = { count: 0, last: 0 };
    this.projectiles.forEach((p) => p.obj.destroy(true));
    this.projectiles = [];
    this.emitSnapshot(true);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.visualTime += dt;

    if (this.keys.ESC && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      bus.emit("pauseRequest", undefined);
      return;
    }
    if (this.keys.P && Phaser.Input.Keyboard.JustDown(this.keys.P)) {
      bus.emit("pauseRequest", undefined);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.renderRigs();
      return;
    }

    if (this.superFreeze > 0) {
      this.superFreeze -= dt;
      this.renderRigs();
      this.emitSnapshot(false);
      return;
    }

    this.accumulator += dt;
    let guard = 0;
    while (this.accumulator >= STEP && guard < 6) {
      this.simulate(STEP);
      this.accumulator -= STEP;
      guard += 1;
    }
    if (guard >= 6) this.accumulator = 0;

    this.renderRigs();
    this.updateCamera();
    this.emitSnapshot(false);
  }

  private simulate(dt: number): void {
    this.simTime += dt;
    this.phaseTime += dt;

    const fighting = this.phase === "fight";
    const playerInput = fighting ? this.readPlayerInput() : blankInput();
    const cpuInput = fighting && this.config.mode !== "training" ? this.brain.update(this.simTime, this.cpu, this.player) : blankInput();

    this.player.step(dt, playerInput, this.cpu);
    this.cpu.step(dt, cpuInput, this.player);
    Fighter.separate(this.player, this.cpu);

    this.updateProjectiles(dt);

    if (this.phase === "intro") {
      if (this.phaseTime > 700 && this.banner?.text !== "FIGHT!") {
        this.banner = { text: "FIGHT!", sub: this.player.def.name + "  vs  " + this.cpu.def.name };
        audio.countdown(true);
        this.emitSnapshot(true);
      }
      if (this.phaseTime > 1250) {
        this.phase = "fight";
        this.phaseTime = 0;
        this.banner = null;
        this.emitSnapshot(true);
      }
      return;
    }

    if (this.phase === "fight") {
      this.roundTime = Math.max(0, this.roundTime - dt);
      if (this.player.hp <= 0 || this.cpu.hp <= 0 || this.roundTime <= 0) {
        this.endRound();
      }
      return;
    }

    if (this.phase === "roundEnd") {
      if (this.phaseTime > 2600) {
        if (this.wins.player >= 2 || this.wins.cpu >= 2) {
          this.beginMatchEnd();
        } else {
          this.round += 1;
          this.beginRound(false);
        }
      }
      return;
    }

    if (this.phase === "matchEnd") {
      if (this.phaseTime > 1500 && !this.resultSent) {
        this.resultSent = true;
        this.sendResult();
      }
    }
  }

  private endRound(): void {
    const pDead = this.player.hp <= 0;
    const cDead = this.cpu.hp <= 0;
    let winner: "player" | "cpu" | "draw" = "draw";

    if (pDead && cDead) winner = "draw";
    else if (pDead) winner = "cpu";
    else if (cDead) winner = "player";
    else winner = this.player.hp > this.cpu.hp ? "player" : this.cpu.hp > this.player.hp ? "cpu" : "draw";

    if (winner === "player") this.wins.player += 1;
    if (winner === "cpu") this.wins.cpu += 1;

    const ko = pDead || cDead;
    this.phase = "roundEnd";
    this.phaseTime = 0;

    if (winner === "draw") {
      this.banner = { text: "DRAW", sub: "ROUND REPLAYED" };
    } else {
      const name = winner === "player" ? this.player.def.name : this.cpu.def.name;
      this.banner = {
        text: ko ? "K.O." : "TIME UP",
        sub: `${name} TAKES ROUND ${this.round}`,
      };
    }

    audio.ko();
    this.effects.flash(0xffffff, 180, 0.7);
    this.effects.shake(0.014, 320);
    this.hitstop = 120;
    this.emitSnapshot(true);
  }

  private beginMatchEnd(): void {
    this.phase = "matchEnd";
    this.phaseTime = 0;
    const playerWon = this.wins.player > this.wins.cpu;
    if (playerWon) {
      this.player.setVictory();
      this.cpu.setDefeat();
      this.banner = { text: "VICTORY", sub: `${this.player.def.name} OWNS THE ARENA` };
    } else {
      this.cpu.setVictory();
      this.player.setDefeat();
      this.banner = { text: "DEFEAT", sub: `${this.cpu.def.name} TAKES THE MATCH` };
    }
    audio.gong();
    this.emitSnapshot(true);
  }

  private sendResult(): void {
    const playerWon = this.wins.player > this.wins.cpu;
    const result: MatchResult = {
      winner: playerWon ? "player" : "cpu",
      rounds: { ...this.wins },
      playerId: this.config.playerId,
      cpuId: this.config.cpuId,
      arenaId: this.config.arenaId,
      difficulty: this.config.difficulty,
      perfect: playerWon && !this.playerTookDamage,
      durationMs: performance.now() - this.startedAt,
      maxCombo: this.maxCombo,
    };
    bus.emit("result", result);
  }

  private registerHit(attacker: Fighter, defender: Fighter, def: AttackDef, blocked: boolean, damage: number): void {
    const owner = attacker.isPlayer ? "player" : "cpu";
    const other = owner === "player" ? "cpu" : "player";
    const color = toInt(attacker.def.colors.accent);
    const x = (attacker.x + defender.x) / 2;
    const y = defender.y - 92;

    if (blocked) {
      this.effects.block(x, y);
      audio.block();
      this.hitstop = Math.max(this.hitstop, 26);
    } else {
      const heavy = def.damage >= 10 || def.id === "super";
      this.effects.hit(x, y, color, heavy);
      audio.hit(heavy);
      this.hitstop = Math.max(this.hitstop, heavy ? 90 : 52);
      this.effects.shake(heavy ? 0.009 : 0.004, heavy ? 200 : 120);
      defender.isPlayer ? (this.playerTookDamage = true) : null;

      this.combos[owner].count += 1;
      this.combos[owner].last = this.simTime;
      this.combos[other].count = 0;
      if (this.combos[owner].count > this.maxCombo) this.maxCombo = this.combos[owner].count;

      if (this.combos[owner].count === 3) {
        this.effects.ring(x, y, color, 120, 320);
      }
    }

    if (damage >= 1) {
      this.effects.burst(defender.x, defender.y - 70, color, blocked ? 6 : 10);
    }
    this.emitSnapshot(true);
  }

  private startCinematic(f: Fighter, def: AttackDef): void {
    this.superFreeze = 430;
    this.announcement = { text: def.name.toUpperCase(), sub: f.def.superText, until: this.simTime + 2200 };
    const color = toInt(f.def.colors.aura);
    this.effects.flash(color, 140, 0.85);
    this.effects.shake(0.013, 340);
    this.effects.ring(f.x, f.y - 90, color, 260, 460);
    this.effects.burst(f.x, f.y - 90, color, 34);
    audio.superFlash();
    this.cameras.main.zoomTo(1.07, 200);
    this.time.delayedCall(620, () => {
      this.cameras.main.zoomTo(1, 320);
    });
    this.emitSnapshot(true);
  }

  private spawnProjectile(owner: Fighter, def: AttackDef): void {
    const color = toInt(owner.def.colors.accent);
    const y = owner.y - def.y;
    const x = owner.x + owner.facing * 62;
    const obj = this.add.container(x, y).setDepth(30);

    if (def.delivery === "beam") {
      const glow = this.add
        .rectangle(0, 0, def.w * 1.5, def.h * 0.75, color, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.rectangle(0, 0, def.w, def.h * 0.42, color, 0.95);
      const white = this.add.rectangle(0, 0, def.w * 0.55, def.h * 0.16, 0xffffff, 0.95);
      obj.add([glow, core, white]);
      obj.scaleX = owner.facing;
    } else {
      const glow = this.add.image(0, 0, "glow").setScale(def.w / 26).setTint(color).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(0, 0, def.w * 0.3, 0xffffff, 0.95);
      const ring = this.add.circle(0, 0, def.w * 0.42, color, 0).setStrokeStyle(3, color, 0.9);
      obj.add([glow, core, ring]);
      this.tweens.add({ targets: obj, scale: 1.18, duration: 220, yoyo: true, repeat: -1 });
    }

    this.projectiles.push({
      obj,
      def,
      owner,
      x,
      y,
      vx: owner.facing * (def.projectileSpeed ?? 520),
      w: def.w,
      h: def.h,
      born: this.simTime,
      lastTrail: 0,
    });

    audio.special();
    this.effects.burst(x, y, color, 10);
  }

  private updateProjectiles(dt: number): void {
    const target = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const p = this.projectiles[i];
      const dts = dt / 1000;
      p.x += p.vx * dts;
      p.obj.setPosition(p.x, p.y);

      if (this.simTime - p.lastTrail > 45) {
        p.lastTrail = this.simTime;
        this.effects.trail(p.x, p.y, toInt(p.owner.def.colors.accent));
      }

      const hurt = target.hurtbox();
      const hits = Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h),
        new Phaser.Geom.Rectangle(hurt.x - hurt.w / 2, hurt.y - hurt.h / 2, hurt.w, hurt.h),
      );

      const expired = this.simTime - p.born > 2400 || p.x < -120 || p.x > 1400;

      if (hits && target.state !== "defeat") {
        target.receiveHit(p.def, p.owner, p.owner.damageScale, true);
        this.effects.burst(p.x, p.y, toInt(p.owner.def.colors.accent), 18);
        p.obj.destroy(true);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (expired) {
        p.obj.destroy(true);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private renderRigs(): void {
    this.playerRig.container.setPosition(this.player.x, this.player.y);
    this.cpuRig.container.setPosition(this.cpu.x, this.cpu.y);
    this.playerRig.setFacing(this.player.facing);
    this.cpuRig.setFacing(this.cpu.facing);
    this.playerRig.setEnergy(this.player.energy / 100);
    this.cpuRig.setEnergy(this.cpu.energy / 100);

    this.playerRig.update(this.rigFrame(this.player), this.visualTime);
    this.cpuRig.update(this.rigFrame(this.cpu), this.visualTime);
  }

  private rigFrame(f: Fighter) {
    let attack: { id: string; phase: "startup" | "active" | "recovery"; phaseProgress: number } | null = null;
    if (f.attack) {
      const def = f.attack.def;
      const t = f.attack.elapsed;
      if (t < def.startup) {
        attack = { id: def.id, phase: "startup", phaseProgress: def.startup === 0 ? 1 : t / def.startup };
      } else if (t < def.startup + def.active) {
        attack = { id: def.id, phase: "active", phaseProgress: (t - def.startup) / Math.max(1, def.active) };
      } else {
        attack = {
          id: def.id,
          phase: "recovery",
          phaseProgress: (t - def.startup - def.active) / Math.max(1, def.recovery),
        };
      }
    }
    return {
      state: f.state,
      stateTime: f.stateTime,
      attack,
      vx: f.vx,
      vy: f.vy,
      grounded: f.grounded,
      crouching: f.state === "crouch",
      blocking: f.state === "block",
      time: this.visualTime,
    };
  }

  private updateCamera(): void {
    const mid = (this.player.x + this.cpu.x) / 2;
    this.arenaView.update(mid, this.visualTime);
  }

  private emitSnapshot(force: boolean): void {
    if (!force && this.visualTime - this.lastEmit < 55) return;
    this.lastEmit = this.visualTime;

    const announcement = this.announcement && this.simTime < this.announcement.until ? this.announcement : null;
    const comboActive =
      this.combos.player.count >= 2 && this.simTime - this.combos.player.last < 1100
        ? { owner: "player" as const, count: this.combos.player.count }
        : this.combos.cpu.count >= 2 && this.simTime - this.combos.cpu.last < 1100
          ? { owner: "cpu" as const, count: this.combos.cpu.count }
          : null;

    const snapshot: BattleSnapshot = {
      phase: this.phase,
      timer: Math.ceil(this.roundTime / 1000),
      rounds: { ...this.wins },
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        energy: this.player.energy,
        wins: this.wins.player,
        state: this.player.state,
      },
      cpu: {
        hp: this.cpu.hp,
        maxHp: this.cpu.maxHp,
        energy: this.cpu.energy,
        wins: this.wins.cpu,
        state: this.cpu.state,
      },
      banner: this.banner,
      combo: comboActive,
      announcement: announcement ? { text: announcement.text, sub: announcement.sub } : null,
      round: this.round,
    };

    bus.emit("snapshot", snapshot);
  }
}
