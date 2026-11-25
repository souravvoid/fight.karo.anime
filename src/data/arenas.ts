import type { ArenaDef, ArenaId } from "../types/game";

export const ARENAS: Record<ArenaId, ArenaDef> = {
  dojo: {
    id: "dojo",
    name: "SHADOW DOJO",
    subtitle: "Night of the Falling Petals",
    description: "A shrine courtyard above the valley. Lanterns burn, petals drift, and the floor remembers every duel.",
    floorY: 596,
    bounds: [120, 1160],
    sky: ["#0A1024", "#1A2440"],
    accent: "#40B9FF",
  },
  capital: {
    id: "capital",
    name: "RUINED CAPITAL",
    subtitle: "After the Last Siren",
    description: "The old city broke its own skyline. Embers still climb from the crater where the tower used to stand.",
    floorY: 592,
    bounds: [120, 1160],
    sky: ["#170B1E", "#3A1226"],
    accent: "#FF8A3D",
  },
};

export const ARENA_LIST: ArenaDef[] = [ARENAS.dojo, ARENAS.capital];

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
