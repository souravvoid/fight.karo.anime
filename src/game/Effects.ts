import Phaser from "phaser";

/**
 * All impact feedback lives here: sparks, dust, rings, shake and flashes.
 * Everything is short-lived and pooled through particle emitters.
 */
export class Effects {
  private readonly scene: Phaser.Scene;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shards: Phaser.GameObjects.Particles.ParticleEmitter;
  private reducedMotion = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.sparks = scene.add
      .particles(0, 0, "spark", {
        lifespan: { min: 180, max: 420 },
        speed: { min: 90, max: 420 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 620,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(70);

    this.smoke = scene.add
      .particles(0, 0, "glow", {
        lifespan: { min: 400, max: 900 },
        speed: { min: 10, max: 90 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.9, end: 2.2 },
        alpha: { start: 0.5, end: 0 },
        emitting: false,
      })
      .setDepth(68);

    this.shards = scene.add
      .particles(0, 0, "shard", {
        lifespan: { min: 300, max: 700 },
        speed: { min: 120, max: 380 },
        angle: { min: 190, max: 350 },
        scale: { start: 1, end: 0.2 },
        alpha: { start: 1, end: 0 },
        gravityY: 900,
        rotate: { min: 0, max: 360 },
        emitting: false,
      })
      .setDepth(69);
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  hit(x: number, y: number, color: number, heavy: boolean): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(heavy ? 22 : 12, x, y);
    this.smoke.setParticleTint(color);
    this.smoke.explode(heavy ? 5 : 2, x, y);
    if (heavy) {
      this.shards.setParticleTint(0xffffff);
      this.shards.explode(6, x, y);
    }
  }

  block(x: number, y: number): void {
    this.sparks.setParticleTint(0x9fd8ff);
    this.sparks.explode(8, x, y);
  }

  dust(x: number, y: number): void {
    this.smoke.setParticleTint(0x8a8a9a);
    this.smoke.explode(5, x, y);
  }

  trail(x: number, y: number, color: number): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(2, x, y);
  }

  burst(x: number, y: number, color: number, count = 26): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
    this.smoke.setParticleTint(color);
    this.smoke.explode(6, x, y);
  }

  ring(x: number, y: number, color: number, radius = 90, duration = 320): void {
    const circle = this.scene.add.circle(x, y, 12, color, 0);
    circle.setStrokeStyle(4, color, 0.9);
    circle.setDepth(72);
    circle.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: circle,
      radius,
      alpha: 0,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => circle.destroy(),
    });
  }

  shake(intensity = 0.006, duration = 140): void {
    if (this.reducedMotion) {
      this.scene.cameras.main.shake(duration * 0.5, intensity * 0.25);
      return;
    }
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(color = 0xffffff, duration = 90, alpha = 0.75): void {
    if (this.reducedMotion) return;
    this.scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, false, undefined, alpha);
  }
}

export function toInt(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}
