# ANIME CLASH: CROSSOVER ARENA

An original 2D anime-inspired browser fighting game. Four fighters, two arenas, best-of-three rounds against a CPU opponent — built with React, TypeScript, Vite and Phaser 3.

**Play:** _deployment link goes here_

## Stack

| Layer | Choice |
| --- | --- |
| Shell / menus / HUD | React 19 + TypeScript |
| Combat simulation | Phaser 3.90 (fixed 60 Hz step) |
| Rendering | Phaser vector graphics — no sprite sheets |
| Audio | Web Audio API synthesis — no audio files |
| Styling | Hand-written CSS, ember fight-poster direction |
| Type | Anton (display) + Inter Variable (UI), self-hosted via Fontsource |
| Persistence | LocalStorage (settings + local record only) |
| Icons | Lucide React |

## Features

- **4 original fighters** — Kaze (nimble), Helios (heavy), Zuri (brawler), Shiro (swordsman), each with their own frame data, reach, archetype stats, special and super.
- **2 original arenas** — Shadow Dojo and Ruined Capital, both drawn procedurally with parallax, ambient particles and lighting.
- **Real fighting-game mechanics** — startup/active/recovery frames, hitboxes and hurtboxes, hitstop, blockstun, hitstun, chip damage, knockback, launchers, unblockable supers, energy meter, combo counter.
- **3 CPU difficulties** — Easy, Normal and Hard differ in reaction time, block rate, punish rate, anti-air rate and meter usage. The CPU only presses buttons a human can press.
- **Best-of-three rounds** — 60 second timer, health-lead wins on timeout, round and match banners, victory/defeat/rematch.
- **Training mode** — passive dummy for learning ranges and the super meter.
- **Keyboard + touch** — WASD + J/K/U/I/L on desktop; landscape D-pad and attack cluster on phones.
- **Settings** — SFX, music, reduced motion; persisted locally.
- **Accessibility** — keyboard-operable menus, visible focus rings, ARIA labels, orientation hint, reduced-motion respect.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle in dist/
npm run preview  # serve the production build
npm test         # headless combat rules checks
npm run test:e2e # Playwright menu-to-battle smoke test (needs a browser install)
```

## Controls

| Input | Action |
| --- | --- |
| `A` / `D` | Move |
| `W` | Jump |
| `S` | Crouch |
| `J` | Punch |
| `K` | Kick |
| `U` | Special |
| `I` | Grab (unblockable) |
| `L` / `Space` | Super (needs full meter) |
| `Esc` / `P` | Pause |

Hold the direction **away from your opponent** to block.

## Originality

Every character, arena, portrait, sound and piece of UI in this project is original work made for this build. No ripped anime sprites, no copyrighted screenshots, music or logos, and no code or assets from any existing fighting game.

This is a fan-culture tribute project. It is not affiliated with, endorsed by, or licensed by any anime studio, publisher or existing fighting game.

## Project layout

```
src/
  components/   React screens, HUD, touch controls, portraits
  data/         Fighter and arena definitions (frame data lives here)
  game/         Phaser scene, fighter FSM, rendering rig, CPU brain, effects
  services/     Event bus, audio synthesis, storage, imperative controls
  styles/       Design system and responsive layout
  types/        Shared game types
```

## Status

Playable vertical slice: menu → mode → fighter select → rival select → arena + difficulty → live Phaser battle → victory/rematch → local record.
