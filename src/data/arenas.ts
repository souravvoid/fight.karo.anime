import type { ArenaDef, ArenaId } from "../types/game";

export const ARENAS: Record<ArenaId, ArenaDef> = {
  dojo: {
    id: "dojo",
    name: "SHADOW DOJO",
    subtitle: "Night of the Falling Petals",
    description: "A shrine courtyard above the valley. Lanterns burn, petals drift, and the floor remembers every duel.",
    floorY: 596,
    bounds: [120, 1160],
    sky: ["#120806", "#331509"],
    accent: "#FF7A1A",
  },
  capital: {
    id: "capital",
    name: "RUINED CAPITAL",
    subtitle: "After the Last Siren",
    description: "The old city broke its own skyline. Embers still climb from the crater where the tower used to stand.",
    floorY: 592,
    bounds: [120, 1160],
    sky: ["#1A0A06", "#3D130C"],
    accent: "#FF6A13",
  },
};

export const ARENA_LIST: ArenaDef[] = [ARENAS.dojo, ARENAS.capital];

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
