import Phaser from "phaser";
import type { ArenaDef } from "../types/game";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../data/arenas";

export interface ArenaView {
  update(midX: number, time: number): void;
  destroy(): void;
}

function hex(value: string): number {
  return Phaser.Display.Color.HexStringToColor(value).color;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function skyGradient(g: Phaser.GameObjects.Graphics, top: number, bottom: number, height: number, steps = 26): void {
  const bandH = height / steps;
  for (let i = 0; i < steps; i += 1) {
    g.fillStyle(lerpColor(top, bottom, i / (steps - 1)), 1);
    g.fillRect(0, i * bandH, WORLD_WIDTH, bandH + 1);
  }
}

export function buildArena(scene: Phaser.Scene, arena: ArenaDef): ArenaView {
  const floorY = arena.floorY;
  const far = scene.add.container(0, 0).setDepth(1);
  const mid = scene.add.container(0, 0).setDepth(3);
  const floor = scene.add.container(0, 0).setDepth(2);
  const ambient = scene.add.container(0, 0).setDepth(4);

  const farG = scene.add.graphics();
  const midG = scene.add.graphics();
  const floorG = scene.add.graphics();
  far.add(farG);
  mid.add(midG);
  floor.add(floorG);

  const accent = hex(arena.accent);

  if (arena.id === "dojo") {
    skyGradient(farG, hex(arena.sky[0]), hex(arena.sky[1]), floorY, 30);
    // stars
    farG.fillStyle(0xffe9c8, 0.7);
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 173.7) % WORLD_WIDTH;
      const y = ((i * 91.3) % 340) + 10;
      farG.fillCircle(x, y, i % 7 === 0 ? 1.6 : 1);
    }
    // moon with halo
    farG.fillStyle(0xf5b544, 0.08);
    farG.fillCircle(1010, 150, 132);
    farG.fillStyle(0xffc978, 0.1);
    farG.fillCircle(1010, 150, 104);
    farG.fillStyle(0xfff1d6, 0.92);
    farG.fillCircle(1010, 150, 76);
    farG.fillStyle(0xf0d0a8, 0.5);
    farG.fillCircle(988, 132, 13);
    farG.fillCircle(1032, 168, 18);
    farG.fillCircle(1002, 182, 9);
    // clouds
    farG.fillStyle(0x2a1209, 0.85);
    farG.fillEllipse(300, 200, 520, 54);
    farG.fillEllipse(880, 250, 640, 44);
    farG.fillEllipse(640, 160, 420, 30);
    // mountains
    farG.fillStyle(0x1c0d08, 1);
    farG.fillPoints(
      [
        { x: -20, y: floorY },
        { x: 120, y: 340 },
        { x: 250, y: 430 },
        { x: 400, y: 320 },
        { x: 560, y: 440 },
        { x: 720, y: 350 },
        { x: 900, y: 450 },
        { x: 1080, y: 360 },
        { x: 1220, y: 440 },
        { x: 1300, y: floorY },
      ],
      true,
    );
    farG.fillStyle(0x26130b, 0.9);
    farG.fillPoints(
      [
        { x: -20, y: floorY },
        { x: 200, y: 430 },
        { x: 360, y: 500 },
        { x: 620, y: 410 },
        { x: 860, y: 520 },
        { x: 1100, y: 440 },
        { x: 1300, y: 520 },
        { x: 1300, y: floorY },
      ],
      true,
    );

    // distant pagoda
    midG.fillStyle(0x120804, 1);
    for (let tier = 0; tier < 5; tier += 1) {
      const w = 150 - tier * 20;
      const y = 470 - tier * 46;
      midG.fillTriangle(150 - w / 2 - 24, y, 150 + w / 2 + 24, y, 150, y - 30);
      midG.fillRect(150 - w / 2 + 10, y, w - 20, 40);
    }
    midG.fillRect(144, 300, 12, 60);

    // torii gate
    const toriiCol = 0x140a06;
    midG.fillStyle(toriiCol, 1);
    midG.fillRect(500, 300, 32, floorY - 300);
    midG.fillRect(748, 300, 32, floorY - 300);
    midG.fillRect(470, 306, 340, 16);
    midG.fillRect(486, 264, 308, 20);
    midG.fillStyle(accent, 0.16);
    midG.fillRect(486, 264, 308, 4);
    midG.fillStyle(toriiCol, 1);
    midG.fillRect(628, 280, 44, 26);
    // stone lanterns
    for (const lx of [380, 900]) {
      midG.fillStyle(0x1a0e08, 1);
      midG.fillRect(lx - 6, 520, 12, floorY - 520);
      midG.fillRect(lx - 18, 500, 36, 14);
      midG.fillStyle(0xffd9a0, 0.9);
      midG.fillCircle(lx, 512, 7);
      midG.fillStyle(0xffb45c, 0.12);
      midG.fillCircle(lx, 512, 34);
    }
    // bamboo on the right
    for (let i = 0; i < 9; i += 1) {
      const bx = 1140 + i * 17;
      midG.fillStyle(0x1a0f08, 1);
      midG.fillRect(bx, 250 - (i % 4) * 30, 6, floorY - 250);
      midG.fillStyle(0x24160c, 1);
      for (let j = 0; j < 4; j += 1) {
        midG.fillEllipse(bx + (j % 2 === 0 ? -22 : 22), 300 + j * 62 - i * 12, 44, 10);
      }
    }

    // hanging lanterns
    for (let i = 0; i < 5; i += 1) {
      const lx = 220 + i * 210;
      const ly = 80 + (i % 2) * 26;
      midG.fillStyle(0x1a0e08, 1);
      midG.fillRect(lx - 1, 0, 2, ly - 12);
      midG.fillStyle(0xd9475b, 0.95);
      midG.fillEllipse(lx, ly, 30, 38);
      midG.fillStyle(0xffd9a0, 0.25);
      midG.fillEllipse(lx, ly, 42, 50);
      midG.fillStyle(0x2a0a06, 1);
      midG.fillRect(lx - 8, ly - 22, 16, 4);
      midG.fillRect(lx - 8, ly + 18, 16, 4);
    }

    // floor
    floorG.fillStyle(0x1a0f0a, 1);
    floorG.fillRect(0, floorY, WORLD_WIDTH, WORLD_HEIGHT - floorY);
    floorG.fillStyle(0x241610, 1);
    floorG.fillRect(0, floorY, WORLD_WIDTH, 10);
    floorG.lineStyle(1, 0x33200f, 0.8);
    for (let i = 0; i < 18; i += 1) {
      const x = i * 76;
      floorG.lineBetween(x, floorY + 10, x - 40, WORLD_HEIGHT);
    }
    for (let i = 0; i < 5; i += 1) {
      const y = floorY + 14 + i * i * 6;
      floorG.lineStyle(1, 0x33200f, 0.5);
      floorG.lineBetween(0, y, WORLD_WIDTH, y);
    }
    floorG.fillStyle(accent, 0.18);
    floorG.fillRect(0, floorY, WORLD_WIDTH, 3);
    floorG.fillStyle(0x000000, 0.45);
    floorG.fillRect(0, floorY + 10, WORLD_WIDTH, 6);

    // petals
    const petals = scene.add
      .particles(0, 0, "petal", {
        x: { min: 0, max: WORLD_WIDTH },
        y: -20,
        lifespan: 12000,
        speedY: { min: 26, max: 62 },
        speedX: { min: -30, max: 30 },
        scale: { min: 0.5, max: 1 },
        alpha: { start: 0.75, end: 0 },
        rotate: { min: 0, max: 360 },
        frequency: 240,
        tint: [0xffc2d4, 0xffd9e3, 0xf7a8c0],
      })
      .setDepth(4);
    petals.start();
    ambient.add(petals as unknown as Phaser.GameObjects.GameObject);
  } else {
    skyGradient(farG, hex(arena.sky[0]), hex(arena.sky[1]), floorY, 30);
    // horizon fire glow
    for (let i = 0; i < 10; i += 1) {
      farG.fillStyle(0xff5a2a, 0.03 + i * 0.004);
      farG.fillRect(0, floorY - 210 + i * 16, WORLD_WIDTH, 190 - i * 16);
    }
    // broken moon
    farG.fillStyle(0xffb27a, 0.1);
    farG.fillCircle(300, 150, 120);
    farG.fillStyle(0xffd7b0, 0.85);
    farG.fillCircle(300, 150, 66);
    farG.fillStyle(hex(arena.sky[0]), 1);
    farG.fillCircle(330, 128, 58);
    // smoke bands
    farG.fillStyle(0x1f0f0a, 0.55);
    farG.fillEllipse(520, 250, 760, 70);
    farG.fillEllipse(900, 210, 620, 52);

    // skyline
    const buildings = [
      { x: 0, w: 150, h: 220 },
      { x: 140, w: 110, h: 320 },
      { x: 240, w: 90, h: 180 },
      { x: 330, w: 130, h: 390 },
      { x: 450, w: 100, h: 250 },
      { x: 700, w: 120, h: 300 },
      { x: 820, w: 90, h: 210 },
      { x: 900, w: 150, h: 360 },
      { x: 1040, w: 110, h: 240 },
      { x: 1140, w: 150, h: 300 },
    ];
    for (const b of buildings) {
      const top = floorY - b.h;
      farG.fillStyle(0x150a06, 1);
      farG.fillRect(b.x, top, b.w, b.h);
      // broken top edge
      farG.fillStyle(hex(arena.sky[1]), 1);
      farG.fillTriangle(b.x + b.w * 0.25, top, b.x + b.w * 0.5, top - 26, b.x + b.w * 0.75, top);
      farG.fillTriangle(b.x + b.w * 0.6, top, b.x + b.w * 0.9, top - 14, b.x + b.w, top);
      // windows
      for (let wy = top + 26; wy < floorY - 30; wy += 34) {
        for (let wx = b.x + 14; wx < b.x + b.w - 16; wx += 26) {
          if ((wx * 7 + wy * 13) % 11 < 3) {
            farG.fillStyle((wx + wy) % 5 === 0 ? 0xf5b544 : 0xff8a3d, 0.55);
            farG.fillRect(wx, wy, 12, 16);
          }
        }
      }
    }
    // leaning broken tower
    farG.save();
    farG.translateCanvas(640, floorY - 420);
    farG.rotateCanvas(0.07);
    farG.fillStyle(0x1c0f0a, 1);
    farG.fillRect(-46, 0, 92, 420);
    farG.fillStyle(0x100705, 1);
    farG.fillTriangle(-46, 0, 46, 0, -10, -90);
    farG.fillStyle(0xff8a3d, 0.16);
    for (let i = 0; i < 6; i += 1) farG.fillRect(-30 + (i % 2) * 26, 40 + i * 58, 14, 22);
    farG.restore();

    // foreground ruins
    midG.fillStyle(0x180d08, 1);
    midG.fillRect(60, 430, 44, floorY - 430);
    midG.fillRect(70, 410, 24, 24);
    midG.fillRect(1170, 400, 50, floorY - 400);
    midG.fillStyle(0x23130c, 1);
    midG.fillTriangle(1170, 400, 1220, 400, 1200, 366);
    // rebar
    midG.lineStyle(3, 0x33200f, 1);
    midG.lineBetween(80, 410, 60, 340);
    midG.lineBetween(88, 410, 96, 352);
    midG.lineBetween(1194, 400, 1180, 330);
    // rubble
    midG.fillStyle(0x1c100a, 1);
    midG.fillCircle(180, floorY - 6, 26);
    midG.fillCircle(214, floorY - 2, 16);
    midG.fillCircle(1090, floorY - 4, 22);
    midG.fillCircle(1060, floorY, 14);

    // cracked asphalt floor
    floorG.fillStyle(0x180c08, 1);
    floorG.fillRect(0, floorY, WORLD_WIDTH, WORLD_HEIGHT - floorY);
    floorG.fillStyle(0x23130c, 1);
    floorG.fillRect(0, floorY, WORLD_WIDTH, 12);
    floorG.lineStyle(2, 0x0a0503, 0.9);
    const cracks: [number, number, number, number][] = [
      [0, floorY + 12, 180, 700],
      [190, floorY + 6, 300, 720],
      [420, floorY + 14, 510, 700],
      [700, floorY + 8, 640, 720],
      [860, floorY + 16, 980, 700],
      [1000, floorY + 6, 1120, 720],
    ];
    for (const [x1, y1, x2, y2] of cracks) floorG.lineBetween(x1, y1, x2, y2);
    floorG.fillStyle(accent, 0.22);
    floorG.fillRect(0, floorY, WORLD_WIDTH, 3);

    const embers = scene.add
      .particles(0, 0, "dot", {
        x: { min: 0, max: WORLD_WIDTH },
        y: { min: floorY - 80, max: floorY + 40 },
        lifespan: { min: 2600, max: 5200 },
        speedY: { min: -110, max: -34 },
        speedX: { min: -28, max: 28 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.9, end: 0 },
        frequency: 90,
        tint: [0xff8a3d, 0xffc26b, 0xff4b64],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(4);
    embers.start();
    ambient.add(embers as unknown as Phaser.GameObjects.GameObject);
  }

  // soft vignette bands at the edges (cheap, no textures)
  const vignette = scene.add.graphics().setDepth(5);
  vignette.fillStyle(0x000000, 0.28);
  vignette.fillRect(0, 0, 70, WORLD_HEIGHT);
  vignette.fillRect(WORLD_WIDTH - 70, 0, 70, WORLD_HEIGHT);
  vignette.fillStyle(0x000000, 0.18);
  vignette.fillRect(0, 0, WORLD_WIDTH, 60);

  const baseFarX = far.x;
  const baseMidX = mid.x;

  return {
    update(midX: number, time: number): void {
      const offset = (midX - WORLD_WIDTH / 2) / (WORLD_WIDTH / 2);
      far.x = baseFarX - offset * 26;
      mid.x = baseMidX - offset * 54;
      // gentle lantern / ember sway handled by particles
      void time;
    },
    destroy(): void {
      far.destroy(true);
      mid.destroy(true);
      floor.destroy(true);
      ambient.destroy(true);
      vignette.destroy();
    },
  };
}
