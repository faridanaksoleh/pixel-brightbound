// World themes + seeded procedural level layouts. Add a world by appending to WORLDS.
export type Theme = {
  name: string;
  tagline: string;
  sky: number;
  tint: number; // background image tint
  grass: number;
  grassHi: number;
  dirt: number;
  dirtDark: number;
  hills: number;
};

export const WORLDS: Theme[] = [
  { name: "Sunlit Meadows", tagline: "Every adventure starts with a little leap.", sky: 0x4aa8ff, tint: 0xffffff, grass: 0x4cc23a, grassHi: 0x9be34f, dirt: 0xa0612e, dirtDark: 0x7a4520, hills: 0x2f9a4a },
  { name: "Whispering Woods", tagline: "The trees remember every footstep.", sky: 0x5fb38a, tint: 0xb8e6a8, grass: 0x2f9a3a, grassHi: 0x6cc24a, dirt: 0x6e4a2a, dirtDark: 0x4e321c, hills: 0x1d6b34 },
  { name: "Crystal Caverns", tagline: "Light hides in the darkest places.", sky: 0x2a2850, tint: 0x6a6aa8, grass: 0x6a8ad8, grassHi: 0xa8c4ff, dirt: 0x4a4466, dirtDark: 0x302c48, hills: 0x3a3670 },
  { name: "Frostpeak Ridge", tagline: "Cold wind, warm heart.", sky: 0xa8d8ff, tint: 0xdcefff, grass: 0xeaf6ff, grassHi: 0xffffff, dirt: 0x7a8ca8, dirtDark: 0x56688a, hills: 0xb8d0e8 },
  { name: "Amber Dunes", tagline: "The sun tests the patient.", sky: 0xffc878, tint: 0xffd8a0, grass: 0xf0c060, grassHi: 0xffe08a, dirt: 0xc88a3a, dirtDark: 0x9a6428, hills: 0xd8a050 },
  { name: "Mistral Coast", tagline: "Follow the gulls home.", sky: 0x7ad0e8, tint: 0xd0f0ff, grass: 0x5ad0a0, grassHi: 0xa0f0c8, dirt: 0xd8b88a, dirtDark: 0xb08e62, hills: 0x3aa8a0 },
  { name: "Ember Hollow", tagline: "Step lightly, the ground is hungry.", sky: 0x6a2a2a, tint: 0xff9070, grass: 0xd8582a, grassHi: 0xffa040, dirt: 0x4a2a24, dirtDark: 0x301a16, hills: 0x7a2a20 },
  { name: "Lantern Village", tagline: "Every window holds a story.", sky: 0x3a4a8a, tint: 0x9aa8e0, grass: 0x4aa86a, grassHi: 0x8ad88a, dirt: 0x7a5a3a, dirtDark: 0x5a3e26, hills: 0x2a3a6a },
  { name: "Skyward Isles", tagline: "Don't look down. Look forward.", sky: 0xc8a8ff, tint: 0xf0d8ff, grass: 0x8ad86a, grassHi: 0xc8ff9a, dirt: 0xa88ad0, dirtDark: 0x7a62a8, hills: 0xa890e0 },
  { name: "The Bright Spire", tagline: "Chase the light. Find your brave.", sky: 0xffe8a0, tint: 0xfff0c0, grass: 0xffd040, grassHi: 0xfff0a0, dirt: 0x8a6a4a, dirtDark: 0x5a4430, hills: 0xe8b850 },
];

export const TILE = 32;
export const GROUND_ROW = 14; // ground surface row (y = 448)

export type LevelData = {
  cols: number;
  ground: boolean[];
  bridges: number[]; // columns with bridge tiles
  bricks: [number, number][];
  qblocks: [number, number][];
  coins: [number, number][];
  slimes: number[];
  pipes: { x: number; h: number; plant: boolean }[];
  checkpoint: number;
  goal: number;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildLevel(index: number): LevelData {
  const r = rng(1234 + index * 977);
  const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const cols = 150 + index * 14;
  const d: LevelData = { cols, ground: Array(cols).fill(true), bridges: [], bricks: [], qblocks: [], coins: [], slimes: [], pipes: [], checkpoint: Math.floor(cols / 2), goal: cols - 8 };
  const top = GROUND_ROW;
  let x = 14;
  // intro coins
  for (let i = 5; i < 10; i++) d.coins.push([i, top - 2]);
  while (x < cols - 18) {
    if (Math.abs(x - d.checkpoint) < 4) { x += 4; continue; }
    const t = r();
    if (t < 0.22) {
      // gap (sometimes bridged)
      const len = Math.min(2 + Math.floor(index / 3) + ri(0, 1), 4);
      for (let i = 0; i < len; i++) d.ground[x + i] = false;
      if (len >= 4 || r() < 0.25) for (let i = -1; i <= len; i++) d.bridges.push(x + i);
      for (let i = 0; i < len; i++) d.coins.push([x + i, top - 4]);
      x += len + ri(3, 5);
    } else if (t < 0.4) {
      const h = r() < 0.75 ? 2 : 3;
      d.pipes.push({ x, h, plant: r() < 0.3 + index * 0.05 });
      x += 2 + ri(3, 5);
    } else if (t < 0.7) {
      // brick row with ? blocks
      const len = ri(3, 6);
      for (let i = 0; i < len; i++) {
        if (r() < 0.3) d.qblocks.push([x + i, top - 4]);
        else d.bricks.push([x + i, top - 4]);
      }
      if (r() < 0.5) {
        d.qblocks.push([x + Math.floor(len / 2), top - 8]);
        for (let i = 0; i < len; i++) d.coins.push([x + i, top - 5]);
      }
      if (r() < 0.6) d.slimes.push(x + ri(0, len));
      x += len + ri(2, 4);
    } else if (t < 0.85) {
      for (let i = 0; i < 5; i++) d.coins.push([x + i, top - 2 - (i === 2 ? 2 : i % 4 === 0 ? 0 : 1)]);
      d.slimes.push(x + 2);
      if (index > 3 && r() < 0.5) d.slimes.push(x + 5);
      x += 7;
    } else {
      x += ri(3, 6);
    }
  }
  return d;
}
