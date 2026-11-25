import Phaser from "phaser";

/** Generates tiny procedural textures so particle emitters never need image files. */
export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists("spark")) return;

  const g = scene.add.graphics();
  g.setVisible(false);

  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 7);
  g.generateTexture("spark", 16, 16);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 4);
  g.generateTexture("dot", 4, 4);
  g.clear();

  g.fillStyle(0xffffff, 0.14);
  for (let i = 0; i < 12; i += 1) {
    g.fillCircle(32, 32, 30 - i * 2.2);
  }
  g.generateTexture("glow", 64, 64);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillEllipse(4, 6, 8, 12);
  g.generateTexture("petal", 8, 12);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillTriangle(0, 10, 5, 0, 10, 10);
  g.generateTexture("shard", 10, 10);
  g.destroy();
}
