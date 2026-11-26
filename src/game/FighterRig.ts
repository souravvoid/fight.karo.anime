import Phaser from "phaser";
import type { FighterDef } from "../types/game";
import type { FighterState, Pose } from "./states";
import { NEUTRAL_POSE } from "./states";

const D2R = Math.PI / 180;

export interface RigFrame {
  state: FighterState;
  stateTime: number;
  attack: { id: string; phase: "startup" | "active" | "recovery"; phaseProgress: number } | null;
  vx: number;
  vy: number;
  grounded: boolean;
  crouching: boolean;
  blocking: boolean;
  time: number;
}

interface TintTarget {
  obj: Phaser.GameObjects.Shape;
  color: number;
  alpha: number;
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Phaser.Math.Clamp(t, 0, 1);
}

function hexToInt(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

/**
 * Original, fully procedural character rendering.
 * A limb rig of rounded shapes is posed per frame — no sprite sheets, no third-party art.
 */
export class FighterRig {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly def: FighterDef;

  private readonly upper: Phaser.GameObjects.Container;
  private readonly hipY: number;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly backArm: Phaser.GameObjects.Container;
  private readonly frontArm: Phaser.GameObjects.Container;
  private readonly backLeg: Phaser.GameObjects.Container;
  private readonly frontLeg: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Container;
  private readonly cloth: Phaser.GameObjects.Graphics;
  private readonly tints: TintTarget[] = [];

  private pose: Pose = { ...NEUTRAL_POSE };
  private flashUntil = 0;
  private energy = 0;
  private facing = 1;
  private lastState: FighterState | null = null;
  private bodyOffset = 0;

  constructor(scene: Phaser.Scene, def: FighterDef) {
    this.scene = scene;
    this.def = def;
    const b = def.build;
    const c = def.colors;
    const primary = hexToInt(c.primary);
    const secondary = hexToInt(c.secondary);
    const accent = hexToInt(c.accent);
    const skin = hexToInt(c.skin);
    const hair = hexToInt(c.hair);

    this.container = scene.add.container(0, 0);
    this.container.setDepth(20 + Math.random() * 0.001);

    this.hipY = -b.hipDrop;

    this.shadow = scene.add.ellipse(0, -2, 82, 16, 0x000000, 0.38);
    this.container.add(this.shadow);

    this.aura = scene.add
      .ellipse(0, -b.hipDrop - 20, 120, b.hipDrop + 90, accent, 0.06)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(this.aura);

    this.cloth = scene.add.graphics();
    this.container.add(this.cloth);

    // Limbs drawn first sit behind the torso.
    this.backArm = this.makeLimb(-b.shoulder, -b.hipDrop + 8, b.armThickness, b.armLength, mix(primary, 0x000000, 0.35), true);
    this.backLeg = this.makeLimb(-7, this.hipY, b.legThickness, b.legLength, mix(secondary, 0x000000, 0.25), true);
    this.container.add(this.backArm);
    this.container.add(this.backLeg);

    this.frontLeg = this.makeLimb(7, this.hipY, b.legThickness, b.legLength, secondary, true);
    this.container.add(this.frontLeg);

    this.upper = scene.add.container(0, this.hipY);
    this.container.add(this.upper);

    const torso = scene.add.ellipse(0, -b.torsoH / 2 + 3, b.torsoW, b.torsoH, primary, 1);
    torso.setStrokeStyle(2, mix(primary, 0xffffff, 0.35), 0.35);
    this.upper.add(torso);
    this.register(torso, primary, 1);

    const belt = scene.add.rectangle(0, -9, b.torsoW - 2, 6, accent, 0.95);
    this.upper.add(belt);
    this.register(belt, accent, 0.95);

    const chest = scene.add.ellipse(0, -b.torsoH * 0.62, 9, 9, accent, 0.9);
    chest.setBlendMode(Phaser.BlendModes.ADD);
    this.upper.add(chest);
    this.register(chest, accent, 0.9);

    this.head = scene.add.container(0, -(b.torsoH + b.headR - 7));
    this.upper.add(this.head);
    this.buildHead(skin, hair, accent, primary);

    this.frontArm = this.makeLimb(b.shoulder, -b.torsoH + 10, b.armThickness, b.armLength, primary, false);
    this.frontArm.x = b.shoulder;
    this.frontArm.y = -b.torsoH + 10;
    this.upper.add(this.frontArm);

    this.buildAccessory(accent, primary, secondary);

    this.backArm.x = -b.shoulder;
    this.backArm.y = -b.torsoH + 10;

    this.applyPose(1);
  }

  private register(obj: Phaser.GameObjects.Shape, color: number, alpha: number): void {
    this.tints.push({ obj, color, alpha });
  }

  private makeLimb(x: number, y: number, thickness: number, length: number, color: number, foot: boolean): Phaser.GameObjects.Container {
    const holder = this.scene.add.container(x, y);
    const limb = this.scene.add.ellipse(0, 0, thickness, length, color, 1).setOrigin(0.5, 0);
    limb.setStrokeStyle(1.5, mix(color, 0xffffff, 0.25), 0.22);
    holder.add(limb);
    this.register(limb, color, 1);

    if (foot) {
      const boot = this.scene.add.ellipse(0, length - 5, thickness + 4, 12, mix(color, 0x000000, 0.4), 1).setOrigin(0.5, 0.5);
      holder.add(boot);
      this.register(boot, mix(color, 0x000000, 0.4), 1);
    } else {
      const hand = this.scene.add.ellipse(0, length, thickness + 3, thickness + 3, hexToInt(this.def.colors.skin), 1);
      holder.add(hand);
      this.register(hand, hexToInt(this.def.colors.skin), 1);
    }
    return holder;
  }

  private buildHead(skin: number, hair: number, accent: number, primary: number): void {
    const r = this.def.build.headR;
    const neck = this.scene.add.rectangle(0, r * 0.8, 8, 10, skin, 1).setOrigin(0.5, 0.5);
    this.head.add(neck);
    this.register(neck, skin, 1);

    const skull = this.scene.add.ellipse(0, 0, r * 2, r * 2.1, skin, 1);
    skull.setStrokeStyle(1.5, mix(skin, 0x000000, 0.35), 0.5);
    this.head.add(skull);
    this.register(skull, skin, 1);

    // jaw shadow
    const jaw = this.scene.add.ellipse(1, r * 0.42, r * 1.1, r * 0.7, mix(skin, 0x000000, 0.18), 1);
    this.head.add(jaw);
    this.register(jaw, mix(skin, 0x000000, 0.18), 1);

    const hairG = this.scene.add.graphics();
    hairG.fillStyle(hair, 1);
    const style = this.def.build.hair;
    const hr = r;
    if (style === "spikes") {
      for (let i = 0; i < 7; i += 1) {
        const a = -2.55 + i * 0.36;
        const len = hr * (1.7 + (i % 3) * 0.28);
        const bx = Math.cos(a) * hr * 0.92;
        const by = Math.sin(a) * hr * 0.92;
        const px = Math.cos(a) * len;
        const py = Math.sin(a) * len;
        hairG.fillTriangle(bx - 5, by + 2, bx + 5, by + 1, px, py);
      }
      hairG.fillCircle(0, -hr * 0.45, hr * 1.02);
    } else if (style === "crown") {
      hairG.fillCircle(0, -hr * 0.4, hr * 1.06);
      for (let i = -2; i <= 2; i += 1) {
        hairG.fillTriangle(i * hr * 0.42 - 5, -hr * 1.05, i * hr * 0.42 + 5, -hr * 1.05, i * hr * 0.42, -hr * (1.9 - Math.abs(i) * 0.12));
      }
    } else if (style === "ponytail") {
      hairG.fillCircle(0, -hr * 0.42, hr * 1.05);
      hairG.fillTriangle(-hr * 0.9, -hr * 0.7, -hr * 0.4, -hr * 0.3, -hr * 2.9, -hr * 0.1);
      hairG.fillTriangle(-hr * 0.9, -hr * 0.7, -hr * 2.9, -hr * 0.1, -hr * 2.4, hr * 0.7);
    } else if (style === "short") {
      hairG.fillCircle(0, -hr * 0.42, hr * 1.08);
      hairG.fillTriangle(-hr * 0.95, -hr * 0.55, -hr * 0.35, -hr * 0.25, -hr * 0.78, hr * 0.25);
      hairG.fillTriangle(-hr * 0.42, -hr * 0.62, hr * 0.04, -hr * 0.24, -hr * 0.16, hr * 0.16);
      hairG.fillTriangle(hr * 0.14, -hr * 0.58, hr * 0.7, -hr * 0.24, hr * 0.46, hr * 0.2);
    } else if (style === "tridents") {
      hairG.fillCircle(0, -hr * 0.45, hr * 1.06);
      for (let i = -1; i <= 1; i += 1) {
        const x = i * hr * 0.55;
        hairG.fillTriangle(x - 6, -hr * 1.0, x + 6, -hr * 1.0, x + i * 4, -hr * (2.2 - Math.abs(i) * 0.18));
      }
    } else {
      hairG.fillCircle(0, -hr * 0.35, hr * 1.08);
      hairG.fillTriangle(-hr * 0.95, -hr * 0.4, -hr * 0.2, -hr * 0.2, -hr * 1.5, hr * 3.4);
      hairG.fillRect(-hr * 0.95, -hr * 0.5, hr * 0.75, hr * 2.2);
    }
    this.head.add(hairG);

    // eye — always faces local +x, flipped with the container
    const eye = this.scene.add.ellipse(hr * 0.42, -hr * 0.08, 5, 7, 0x0b0b14, 1);
    this.head.add(eye);
    const glint = this.scene.add.ellipse(hr * 0.5, -hr * 0.2, 3, 3, accent, 1).setBlendMode(Phaser.BlendModes.ADD);
    this.head.add(glint);
    const brow = this.scene.add.rectangle(hr * 0.42, -hr * 0.62, 8, 2, hair, 1).setOrigin(0.5, 0.5);
    brow.setRotation(-0.18);
    this.head.add(brow);

    const collar = this.scene.add.rectangle(0, hr * 1.0, r * 1.4, 6, primary, 1);
    this.head.add(collar);
    this.register(collar, primary, 1);
  }

  private buildAccessory(accent: number, primary: number, secondary: number): void {
    const b = this.def.build;
    const hasBlade = this.def.accessory === "sword" || this.def.accessory === "trisword";

    if (hasBlade) {
      const sword = this.scene.add.container(0, b.armLength - 2);
      const guard = this.scene.add.rectangle(0, 2, 18, 4, accent, 1);
      const blade = this.scene.add.rectangle(0, 42, 5, 78, 0xeaf6ff, 1).setOrigin(0.5, 0.5);
      blade.setStrokeStyle(1, accent, 0.9);
      const glow = this.scene.add.rectangle(0, 42, 10, 80, accent, 0.18).setBlendMode(Phaser.BlendModes.ADD);
      sword.add(guard);
      sword.add(blade);
      sword.add(glow);
      this.frontArm.add(sword);
      this.register(blade, 0xeaf6ff, 1);
      this.register(guard, accent, 1);
    }

    if (this.def.accessory === "trisword") {
      // Two sheathed blades crossed behind the torso — the third is in hand.
      for (const side of [-1, 1]) {
        const sheath = this.scene.add.rectangle(side * 9, -b.torsoH * 0.5, 6, 88, 0x15251f, 1);
        sheath.setRotation(side * 0.34);
        const tip = this.scene.add.rectangle(-side * 13, -b.torsoH * 0.5 - 42, 5, 16, accent, 0.95);
        tip.setRotation(side * 0.34);
        this.upper.add(sheath);
        this.upper.add(tip);
        this.upper.sendToBack(tip);
        this.upper.sendToBack(sheath);
      }
    }

    if (this.def.accessory === "bands") {
      const bandF = this.scene.add.ellipse(0, b.armLength - 6, b.armThickness + 8, 8, accent, 0.95);
      this.frontArm.add(bandF);
      const bandB = this.scene.add.ellipse(0, b.armLength - 6, b.armThickness + 8, 8, accent, 0.95);
      this.backArm.add(bandB);
      this.register(bandF, accent, 0.95);
      this.register(bandB, accent, 0.95);
    }

    if (this.def.accessory === "headband") {
      const r = b.headR;
      const band = this.scene.add.rectangle(0, -r * 0.52, r * 1.92, 4, accent, 0.95);
      const knot = this.scene.add.ellipse(-r * 0.98, -r * 0.52, 7, 7, accent, 1);
      const tailA = this.scene.add.triangle(-r * 1.1, -r * 0.2, 0, 0, -18, 6, -9, 20, accent, 0.85);
      const tailB = this.scene.add.triangle(-r * 1.1, -r * 0.2, 0, 0, -13, 12, -4, 24, accent, 0.7);
      this.head.add(band);
      this.head.add(knot);
      this.head.add(tailA);
      this.head.add(tailB);
      this.register(band, accent, 0.95);
      this.register(knot, accent, 1);
    }

    if (this.def.accessory === "goggles") {
      const r = b.headR;
      const strap = this.scene.add.rectangle(0, -r * 0.5, r * 1.94, 5, 0x141821, 1);
      const lensL = this.scene.add.ellipse(-r * 0.38, -r * 0.5, r * 0.56, r * 0.44, accent, 0.92);
      const lensR = this.scene.add.ellipse(r * 0.38, -r * 0.5, r * 0.56, r * 0.44, accent, 0.92);
      const glintL = this.scene.add.ellipse(-r * 0.44, -r * 0.58, 3, 3, 0xffffff, 0.7).setBlendMode(Phaser.BlendModes.ADD);
      const glintR = this.scene.add.ellipse(r * 0.32, -r * 0.58, 3, 3, 0xffffff, 0.7).setBlendMode(Phaser.BlendModes.ADD);
      this.head.add(strap);
      this.head.add(lensL);
      this.head.add(lensR);
      this.head.add(glintL);
      this.head.add(glintR);
      this.register(strap, 0x141821, 1);
      this.register(lensL, accent, 0.92);
      this.register(lensR, accent, 0.92);
    }

    if (hasBlade) {
      // coat tails
      const tail = this.scene.add.triangle(-6, -10, 0, 0, -14, 56, 10, 40, mix(primary, 0x000000, 0.35), 0.9);
      this.upper.add(tail);
      this.upper.sendToBack(tail);
      this.register(tail, mix(primary, 0x000000, 0.35), 0.9);
    }

    if (this.def.accessory === "cape" || this.def.accessory === "scarf") {
      // cloth is redrawn every frame; a base tone keeps it visible before the first update
      this.cloth.fillStyle(this.def.accessory === "cape" ? primary : accent, 0.85);
      this.cloth.fillRect(-4, -b.torsoH, 4, b.torsoH);
      void secondary;
    }
  }

  setFacing(dir: number): void {
    this.facing = dir >= 0 ? 1 : -1;
    this.container.scaleX = this.facing;
  }

  setEnergy(ratio: number): void {
    this.energy = Phaser.Math.Clamp(ratio, 0, 1);
  }

  flash(now: number): void {
    this.flashUntil = now + 90;
  }

  /** Called by the scene every rendered frame (not every simulation tick). */
  update(frame: RigFrame, now: number): void {
    const target = this.targetPose(frame);
    const rate = frame.state === "attack" ? 0.42 : 0.26;
    this.pose.lean = lerp(this.pose.lean, target.lean, rate);
    this.pose.armF = lerp(this.pose.armF, target.armF, rate);
    this.pose.armB = lerp(this.pose.armB, target.armB, rate);
    this.pose.legF = lerp(this.pose.legF, target.legF, rate);
    this.pose.legB = lerp(this.pose.legB, target.legB, rate);
    this.pose.headTilt = lerp(this.pose.headTilt, target.headTilt, rate * 0.7);
    this.pose.bodyY = lerp(this.pose.bodyY, target.bodyY, rate);
    this.pose.frontStretch = lerp(this.pose.frontStretch, target.frontStretch, rate * 1.4);

    if (frame.state !== this.lastState) {
      this.lastState = frame.state;
    }

    const downed = frame.state === "knockdown";
    const rotTarget = downed ? 1.32 : 0;
    this.container.rotation = lerp(this.container.rotation, rotTarget, 0.2);

    this.bodyOffset = lerp(this.bodyOffset, downed ? 26 : this.pose.bodyY, 0.3);
    this.upper.y = this.hipY + this.bodyOffset;
    this.backLeg.y = this.hipY + this.bodyOffset * 0.4;
    this.frontLeg.y = this.hipY + this.bodyOffset * 0.4;
    this.backArm.y = -this.def.build.torsoH + 10;
    this.frontArm.y = -this.def.build.torsoH + 10;

    this.applyPose(frame.state === "attack" ? 1 : 0.85);

    const squash = frame.crouching ? 0.82 : 1;
    const air = frame.grounded ? 1 : 1 + Phaser.Math.Clamp(Math.abs(frame.vy) / 2400, 0, 0.12);
    this.upper.scaleY = squash * air;

    this.aura.setAlpha(0.05 + this.energy * 0.26);
    this.aura.setScale(1 + this.energy * 0.12 + Math.sin(frame.time * 0.005) * 0.02);
    if (frame.blocking) this.aura.setAlpha(0.1 + this.energy * 0.2);

    this.shadow.setScale(1 - (frame.grounded ? 0 : 0.25), 1);
    this.shadow.setAlpha(frame.grounded ? 0.38 : 0.22);

    this.drawCloth(frame);
    this.applyFlash(now);
  }

  private applyPose(k: number): void {
    this.upper.rotation = this.pose.lean * k;
    this.frontArm.rotation = this.pose.armF * D2R;
    this.backArm.rotation = this.pose.armB * D2R;
    this.frontLeg.rotation = this.pose.legF * D2R;
    this.backLeg.rotation = this.pose.legB * D2R;
    this.head.rotation = this.pose.headTilt;
    this.frontArm.scaleY = this.pose.frontStretch;
  }

  private applyFlash(now: number): void {
    const flashing = now < this.flashUntil;
    for (const t of this.tints) {
      const color = flashing ? mix(t.color, 0xffffff, 0.85) : t.color;
      if (t.obj instanceof Phaser.GameObjects.Ellipse || t.obj instanceof Phaser.GameObjects.Rectangle) {
        t.obj.setFillStyle(color, t.alpha);
      } else if (t.obj instanceof Phaser.GameObjects.Triangle) {
        t.obj.setFillStyle(color, t.alpha);
      }
    }
    if (flashing) {
      this.container.setAlpha(1);
    }
  }

  private targetPose(f: RigFrame): Pose {
    const st = f.stateTime / 1000;
    const breathe = Math.sin(st * 3.1);
    switch (f.state) {
      case "idle":
        return {
          lean: 0.04,
          armF: 12 + breathe * 4,
          armB: -10 - breathe * 4,
          legF: 7,
          legB: -7,
          headTilt: Math.sin(st * 1.7) * 0.03,
          bodyY: breathe * 1.6,
          frontStretch: 1,
        };
      case "walk": {
        const s = Math.sin(st * 11);
        return {
          lean: 0.09,
          armF: 12 - s * 22,
          armB: -10 + s * 22,
          legF: s * 24,
          legB: -s * 24,
          headTilt: 0,
          bodyY: -Math.abs(s) * 2,
          frontStretch: 1,
        };
      }
      case "jump":
        return {
          lean: 0.12,
          armF: -48,
          armB: -38,
          legF: -26,
          legB: 30,
          headTilt: 0.06,
          bodyY: 0,
          frontStretch: 1,
        };
      case "crouch":
        return {
          lean: 0.2,
          armF: 26,
          armB: -24,
          legF: 46,
          legB: -44,
          headTilt: -0.1,
          bodyY: 17,
          frontStretch: 1,
        };
      case "block":
        return {
          lean: -0.08,
          armF: -76,
          armB: -62,
          legF: 16,
          legB: -14,
          headTilt: 0.08,
          bodyY: 4,
          frontStretch: 1,
        };
      case "hit": {
        const p = Phaser.Math.Clamp(f.stateTime / 260, 0, 1);
        return {
          lean: -0.3 + p * 0.1,
          armF: 44,
          armB: -46,
          legF: -14,
          legB: 16,
          headTilt: -0.26,
          bodyY: -2,
          frontStretch: 1,
        };
      }
      case "knockdown":
        return {
          lean: -0.1,
          armF: 30,
          armB: -60,
          legF: -20,
          legB: 24,
          headTilt: -0.2,
          bodyY: 0,
          frontStretch: 1,
        };
      case "victory": {
        const s = Math.sin(st * 4);
        return {
          lean: 0.02,
          armF: -152 + s * 6,
          armB: 148 - s * 6,
          legF: 10,
          legB: -10,
          headTilt: -0.08,
          bodyY: s * 2,
          frontStretch: 1,
        };
      }
      case "defeat":
        return {
          lean: 0.42,
          armF: 22,
          armB: -20,
          legF: 54,
          legB: -52,
          headTilt: 0.32,
          bodyY: 24,
          frontStretch: 1,
        };
      case "attack":
      default:
        return this.attackPose(f);
    }
  }

  private attackPose(f: RigFrame): Pose {
    const a = f.attack;
    if (!a) return NEUTRAL_POSE;
    const p = a.phaseProgress;
    const base: Pose = { ...NEUTRAL_POSE };
    if (a.id === "punch") {
      if (a.phase === "startup") {
        base.armF = lerp(12, 44, p);
        base.lean = lerp(0.04, -0.06, p);
        base.legF = 10;
        base.legB = -8;
      } else if (a.phase === "active") {
        base.armF = lerp(44, -96, Phaser.Math.Clamp(p * 3, 0, 1));
        base.frontStretch = 1.16;
        base.lean = 0.2;
        base.legF = 20;
        base.legB = -18;
        base.bodyY = -1;
      } else {
        base.armF = lerp(-96, 12, p);
        base.lean = lerp(0.2, 0.04, p);
        base.legF = lerp(20, 7, p);
        base.legB = lerp(-18, -7, p);
      }
      base.armB = -34;
      return base;
    }
    if (a.id === "kick") {
      if (a.phase === "startup") {
        base.legF = lerp(7, -34, p);
        base.lean = lerp(0.04, -0.14, p);
        base.armF = 26;
        base.armB = -34;
      } else if (a.phase === "active") {
        base.legF = lerp(-34, -104, Phaser.Math.Clamp(p * 3, 0, 1));
        base.lean = -0.24;
        base.armF = 40;
        base.armB = -52;
        base.bodyY = -3;
        base.legB = 12;
      } else {
        base.legF = lerp(-104, 7, p);
        base.lean = lerp(-0.24, 0.04, p);
        base.armF = lerp(40, 12, p);
        base.armB = lerp(-52, -10, p);
        base.legB = lerp(12, -7, p);
      }
      return base;
    }
    if (a.id === "special") {
      if (a.phase === "startup") {
        base.armF = lerp(12, 52, p);
        base.armB = lerp(-12, -62, p);
        base.lean = lerp(0.04, -0.16, p);
        base.legF = 14;
        base.legB = -12;
      } else if (a.phase === "active") {
        base.armF = lerp(52, -96, Phaser.Math.Clamp(p * 3, 0, 1));
        base.armB = lerp(-62, -84, Phaser.Math.Clamp(p * 3, 0, 1));
        base.frontStretch = 1.14;
        base.lean = 0.22;
        base.legF = 22;
        base.legB = -20;
      } else {
        base.armF = lerp(-96, 12, p);
        base.armB = lerp(-84, -12, p);
        base.lean = lerp(0.22, 0.04, p);
        base.legF = lerp(22, 7, p);
        base.legB = lerp(-20, -7, p);
      }
      return base;
    }
    // super
    if (a.phase === "startup") {
      base.armF = lerp(12, 74, p);
      base.armB = lerp(-12, -86, p);
      base.lean = lerp(0.04, -0.34, p);
      base.legF = lerp(7, 30, p);
      base.legB = lerp(-7, -30, p);
      base.bodyY = lerp(0, 8, p);
      base.headTilt = -0.2;
    } else if (a.phase === "active") {
      base.armF = -104;
      base.armB = -96;
      base.lean = 0.3;
      base.legF = 34;
      base.legB = -30;
      base.bodyY = -2;
      base.frontStretch = 1.2;
      base.headTilt = 0.1;
    } else {
      base.armF = lerp(-104, 12, p);
      base.armB = lerp(-96, -12, p);
      base.lean = lerp(0.3, 0.04, p);
      base.legF = lerp(34, 7, p);
      base.legB = lerp(-30, -7, p);
      base.bodyY = lerp(-2, 0, p);
      base.headTilt = 0.1;
    }
    return base;
  }

  private drawCloth(f: RigFrame): void {
    const g = this.cloth;
    g.clear();
    if (
      this.def.accessory === "bands" ||
      this.def.accessory === "sword" ||
      this.def.accessory === "trisword" ||
      this.def.accessory === "headband" ||
      this.def.accessory === "goggles"
    ) {
      return;
    }

    const cape = this.def.accessory === "cape";
    const b = this.def.build;
    const baseY = -b.torsoH + 4;
    const baseX = cape ? 0 : 2;
    const segments = cape ? 6 : 5;
    const segLen = cape ? 15 : 11;
    const speed = Phaser.Math.Clamp(Math.abs(f.vx) / 300, 0, 1.4);
    const t = f.time * 0.004;

    const top: { x: number; y: number }[] = [];
    const bottom: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i += 1) {
      const k = i / segments;
      const wave = Math.sin(t * (2.6 + speed) + i * 0.8) * (cape ? 5 : 7) * k;
      const x = baseX - k * segLen * (1 + speed * 0.55);
      const y = baseY + k * (cape ? 13 : 3) + wave * 0.35;
      top.push({ x, y });
      const thick = (cape ? 12 : 6) * (1 - k * 0.55);
      bottom.push({ x: x + thick * 0.4, y: y + thick + wave * 0.5 });
    }

    const points: Phaser.Types.Math.Vector2Like[] = [...top, ...bottom.reverse()];
    const color = cape ? hexToInt(this.def.colors.primary) : hexToInt(this.def.colors.accent);
    g.fillStyle(color, cape ? 0.92 : 0.85);
    g.fillPoints(points, true);
    if (!cape) {
      g.lineStyle(2, 0xffffff, 0.18);
      g.strokePoints(top, false);
    }
    // trailing ribbon highlight
    g.fillStyle(mix(color, 0xffffff, 0.35), 0.35);
    g.fillPoints(
      [
        top[2],
        top[3],
        { x: top[3].x + 6, y: top[3].y + 5 },
        { x: top[2].x + 4, y: top[2].y + 4 },
      ],
      true,
    );
  }

  getFacing(): number {
    return this.facing;
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
