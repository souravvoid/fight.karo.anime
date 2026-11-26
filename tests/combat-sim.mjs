/**
 * Headless combat simulation checks.
 *
 * The fighter FSM is deliberately renderer-independent, so the rules that
 * decide whether a punch lands can be verified without a browser.
 *
 *   node tests/combat-sim.mjs
 */
import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

try {
  const { Fighter } = await server.ssrLoadModule("/src/game/Fighter.ts");
  const { FIGHTERS } = await server.ssrLoadModule("/src/data/fighters.ts");

  const FLOOR = 596;
  const BOUNDS = [120, 1160];
  const STEP = 1000 / 60;

  const idle = () => ({
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    special: false,
    grab: false,
    super: false,
  });

  function makeFighters(aId, bId, gap = 70) {
    const hooks = {
      onWhiff() {},
      onLand() {},
      onProjectile() {},
      onSuperStart() {},
      onHit() {},
    };
    const a = new Fighter(FIGHTERS[aId], {
      x: 400,
      facing: 1,
      floorY: FLOOR,
      bounds: BOUNDS,
      isPlayer: true,
      hooks,
    });
    const b = new Fighter(FIGHTERS[bId], {
      x: 400 + gap,
      facing: -1,
      floorY: FLOOR,
      bounds: BOUNDS,
      isPlayer: false,
      hooks,
    });
    return { a, b };
  }

  function run(a, b, frames, inputFor) {
    for (let i = 0; i < frames; i += 1) {
      a.step(STEP, inputFor(i), b);
      b.step(STEP, idle(), a);
    }
  }

  check("punch in range deals damage", () => {
    const { a, b } = makeFighters("kaze", "helios");
    run(a, b, 45, (i) => ({ ...idle(), punch: i < 2 }));
    assert.ok(b.hp < b.maxHp, `expected damage, hp=${b.hp}`);
  });

  check("punch out of range whiffs", () => {
    const { a, b } = makeFighters("kaze", "helios", 420);
    run(a, b, 45, (i) => ({ ...idle(), punch: i < 2 }));
    assert.equal(b.hp, b.maxHp);
  });

  check("blocking cuts damage to chip", () => {
    const { a, b } = makeFighters("kaze", "helios");
    const def = FIGHTERS.kaze.attacks.punch;
    const plain = makeFighters("kaze", "helios").b;
    const blocked = makeFighters("kaze", "helios").b;
    blocked.state = "block";
    const open = plain.receiveHit(def, a, a.damageScale, false);
    const guard = blocked.receiveHit(def, a, a.damageScale, false);
    assert.equal(open.blocked, false);
    assert.equal(guard.blocked, true);
    assert.ok(guard.damage < open.damage, `chip ${guard.damage} should be under ${open.damage}`);
    assert.ok(b.hp === b.maxHp);
  });

  check("super needs a full meter", () => {
    const { a, b } = makeFighters("kaze", "helios");
    run(a, b, 10, (i) => ({ ...idle(), super: i < 2 }));
    assert.equal(a.state === "attack", false, "super fired without meter");

    a.energy = 100;
    run(a, b, 4, (i) => ({ ...idle(), super: i < 2 }));
    assert.equal(a.state, "attack");
    assert.equal(a.energy, 0, "meter should be spent");
  });

  check("super is unblockable", () => {
    const { a, b } = makeFighters("kaze", "helios");
    const def = FIGHTERS.kaze.attacks.super;
    b.state = "block";
    const hit = b.receiveHit(def, a, a.damageScale, false);
    assert.equal(hit.blocked, false);
    assert.ok(hit.damage > def.damage * 0.8);
  });

  check("lethal hit knocks down", () => {
    const { a, b } = makeFighters("kaze", "helios");
    const def = FIGHTERS.kaze.attacks.punch;
    b.hp = 1;
    b.receiveHit(def, a, a.damageScale, false);
    assert.equal(b.hp, 0);
    assert.equal(b.state, "knockdown");
  });

  check("attacks cost nothing except the super", () => {
    const { a, b } = makeFighters("kaze", "helios");
    a.energy = 40;
    run(a, b, 40, (i) => ({ ...idle(), kick: i < 2 }));
    assert.ok(a.energy >= 40, "kick spent meter");
  });

  check("fighters stay inside arena bounds", () => {
    const { a, b } = makeFighters("kaze", "helios");
    run(a, b, 600, () => ({ ...idle(), left: true }));
    assert.ok(a.x >= BOUNDS[0], `x=${a.x}`);
    assert.ok(a.x <= BOUNDS[1], `x=${a.x}`);
  });

  check("grab has a cooldown", () => {
    const { a, b } = makeFighters("kaze", "helios");
    run(a, b, 2, (i) => ({ ...idle(), grab: i < 2 }));
    assert.ok(a.attack !== null, "grab should start");

    // Attack animation finishes at ~460ms, but the throw cooldown runs to 600ms.
    run(a, b, 28, () => idle());
    run(a, b, 2, (i) => ({ ...idle(), grab: i < 2 }));
    assert.equal(a.attack, null, "grab re-fired during cooldown");

    run(a, b, 12, () => idle());
    run(a, b, 2, (i) => ({ ...idle(), grab: i < 2 }));
    assert.ok(a.attack !== null, "grab should be available after cooldown");
  });

  check("every fighter has a complete, valid move set", () => {
    const ids = Object.keys(FIGHTERS);
    assert.equal(ids.length, 7, `expected 7 fighters, got ${ids.length}`);
    for (const id of ids) {
      const def = FIGHTERS[id];
      for (const move of ["punch", "kick", "special", "super"]) {
        const a = def.attacks[move];
        assert.ok(a, `${id} is missing ${move}`);
        assert.ok(a.startup > 0 && a.active > 0 && a.recovery > 0, `${id}.${move} has invalid timing`);
        assert.ok(a.damage > 0, `${id}.${move} has no damage`);
        assert.ok(a.reach > 0 && a.w > 0 && a.h > 0, `${id}.${move} has an empty hitbox`);
      }
      assert.equal(def.attacks.super.energyCost, 100, `${id} super must cost a full meter`);
    }
  });

  check("new fighters land their normals", () => {
    for (const id of ["kai", "riko", "sango"]) {
      const { a, b } = makeFighters(id, "helios");
      run(a, b, 45, (i) => ({ ...idle(), punch: i < 2 }));
      assert.ok(b.hp < b.maxHp, `${id} punch did not connect`);
    }
  });

  check("new fighters land their signature specials", () => {
    for (const id of ["riko", "sango"]) {
      const { a, b } = makeFighters(id, "helios");
      run(a, b, 70, (i) => ({ ...idle(), special: i < 2 }));
      assert.ok(b.hp < b.maxHp, `${id} special did not connect`);
    }
  });

  check("round reset restores health, meter and position", () => {
    const { a, b } = makeFighters("kaze", "helios");
    a.hp = 12;
    a.energy = 91;
    a.x = 700;
    a.resetForRound(430, 1);
    assert.equal(a.hp, a.maxHp);
    assert.equal(a.energy, 0);
    assert.equal(a.x, 430);
    assert.equal(a.grounded, true);
    assert.equal(b.hp, b.maxHp);
  });
} finally {
  await server.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : ` — ${r.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
