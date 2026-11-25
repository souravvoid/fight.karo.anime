import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import type { MatchConfig, Settings } from "../types/game";

export function createBattle(container: HTMLElement, match: MatchConfig, settings: Settings): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 1280,
    height: 720,
    backgroundColor: "#09090F",
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    render: {
      antialias: true,
      powerPreference: "high-performance",
    },
    audio: { noAudio: true },
    scene: [BattleScene],
  });

  game.registry.set("match", match);
  game.registry.set("settings", settings);
  return game;
}
