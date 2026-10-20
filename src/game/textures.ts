import Phaser from "phaser";
import { WORLDS } from "./levels";

// All pixel art is generated here from rectangles — original, easily replaceable.
type G = Phaser.GameObjects.Graphics;
const r = (g: G, c: number, x = 0, y = 0, w = 0, h = 0) => { g.fillStyle(c); g.fillRect(x, y, w, h); };

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Hero 24x32. pose: idle | walk1 | walk2 | jump | fall | shoot
function hero(g: G, pose: string) {
  const SK = 0xffd2a0, BL = 0x2f6fe0, BLD = 0x1f4aa8, RD = 0xe0342a, RDD = 0xa82018, BR = 0x6a3a1a, OUT = 0x1a1a2a;
  // cape
  const capeY = pose === "jump" || pose === "fall" ? 10 : 12;
  r(g, RDD, 1, capeY, 5, 14); r(g, RD, 2, capeY, 4, 12);
  // helmet
  r(g, OUT, 6, 0, 13, 1); r(g, BL, 5, 1, 15, 8); r(g, BLD, 5, 7, 15, 2); r(g, 0xffffff, 9, 2, 3, 2);
  // face
  r(g, SK, 8, 9, 10, 6); r(g, OUT, 14, 10, 2, 2); r(g, 0xe08060, 16, 13, 2, 1);
  // body
  r(g, BL, 7, 15, 11, 8); r(g, 0xffd84a, 7, 20, 11, 2); r(g, RD, 8, 15, 3, 3);
  // arms
  if (pose === "shoot") { r(g, BL, 16, 16, 7, 3); r(g, SK, 22, 16, 2, 3); }
  else if (pose === "jump") { r(g, BL, 17, 12, 3, 5); r(g, SK, 17, 10, 3, 2); }
  else { r(g, BL, 17, 16, 3, 5); r(g, SK, 17, 21, 3, 2); }
  // legs
  const legs: Record<string, [number, number, number, number]> = {
    idle: [8, 13, 23, 23], walk1: [6, 15, 22, 24], walk2: [10, 12, 24, 22], jump: [7, 14, 21, 23], fall: [8, 14, 23, 22], shoot: [8, 13, 23, 23],
  };
  const [a, b, ya, yb] = legs[pose]!;
  r(g, BLD, a, ya, 4, 6); r(g, BLD, b, yb, 4, 6);
  r(g, BR, a - 1, ya + 6, 6, 3); r(g, BR, b - 1, yb + 6, 6, 3);
}

export function makeTextures(scene: Phaser.Scene) {
  ["idle", "walk1", "walk2", "jump", "fall", "shoot"].forEach((p) => make(scene, "hero_" + p, 24, 32, (g) => hero(g, p)));

  WORLDS.forEach((w, i) => {
    make(scene, "grass" + i, 32, 32, (g) => {
      r(g, w.dirt, 0, 0, 32, 32);
      for (let k = 0; k < 6; k++) r(g, w.dirtDark, (k * 11) % 28, 12 + ((k * 7) % 18), 4, 3);
      r(g, w.grass, 0, 0, 32, 9); r(g, w.grassHi, 0, 0, 32, 3);
      for (let k = 0; k < 32; k += 4) r(g, w.grass, k, 9, 2, 3);
    });
    make(scene, "dirt" + i, 32, 32, (g) => {
      r(g, w.dirt, 0, 0, 32, 32);
      for (let k = 0; k < 7; k++) r(g, w.dirtDark, (k * 13) % 28, (k * 9) % 28, 5, 3);
    });
    make(scene, "hills" + i, 512, 200, (g) => {
      g.fillStyle(w.hills, 1);
      for (let k = -1; k < 4; k++) g.fillCircle(k * 160 + 80, 220, 130 + (k % 2) * 30);
      g.fillStyle(Phaser.Display.Color.ValueToColor(w.hills).darken(15).color, 1);
      g.fillRect(0, 170, 512, 30);
    });
  });

  make(scene, "brick", 32, 32, (g) => {
    r(g, 0x5a2a10, 0, 0, 32, 32);
    const B = 0xc0642a;
    [[1, 1, 14, 6], [17, 1, 14, 6], [1, 9, 6, 6], [9, 9, 14, 6], [25, 9, 6, 6], [1, 17, 14, 6], [17, 17, 14, 6], [1, 25, 6, 6], [9, 25, 14, 6], [25, 25, 6, 6]].forEach(([x, y, w, h]) => { r(g, B, x, y, w, h); r(g, 0xe08a4a, x, y, w, 1); });
  });
  make(scene, "qblock", 32, 32, (g) => {
    r(g, 0x8a5a10, 0, 0, 32, 32); r(g, 0xffc020, 1, 1, 30, 30); r(g, 0xffe080, 1, 1, 30, 2);
    [[2, 2], [27, 2], [2, 27], [27, 27]].forEach(([x, y]) => r(g, 0x8a5a10, x, y, 3, 3));
    const Q = 0x6a3a08;
    r(g, Q, 11, 7, 10, 3); r(g, Q, 19, 9, 3, 6); r(g, Q, 14, 14, 6, 3); r(g, Q, 14, 16, 3, 4); r(g, Q, 14, 22, 3, 3);
    r(g, 0xffffff, 10, 6, 10, 2);
  });
  make(scene, "used", 32, 32, (g) => { r(g, 0x5a3a20, 0, 0, 32, 32); r(g, 0x9a6a3a, 2, 2, 28, 28); });
  make(scene, "bridge", 32, 16, (g) => {
    r(g, 0x5a5a6a, 0, 0, 32, 16); r(g, 0xb8b8c8, 1, 1, 14, 6); r(g, 0xb8b8c8, 17, 1, 14, 6); r(g, 0x9a9aaa, 1, 9, 30, 6);
  });
  make(scene, "coin0", 16, 16, (g) => {
    g.fillStyle(0xa86a00); g.fillEllipse(8, 8, 14, 16); g.fillStyle(0xffc820); g.fillEllipse(8, 8, 11, 13);
    r(g, 0xfff0a0, 6, 3, 2, 8);
  });
  make(scene, "coin1", 16, 16, (g) => { g.fillStyle(0xa86a00); g.fillEllipse(8, 8, 6, 16); g.fillStyle(0xffd840); g.fillEllipse(8, 8, 3, 13); });
  make(scene, "slime", 32, 26, (g) => {
    g.fillStyle(0x1f7a2a); g.fillEllipse(16, 15, 32, 22); g.fillStyle(0x5ad04a); g.fillEllipse(16, 14, 28, 18);
    r(g, 0x9af07a, 9, 6, 6, 3);
    r(g, 0xffffff, 8, 11, 5, 5); r(g, 0xffffff, 19, 11, 5, 5); r(g, 0x101010, 10, 12, 2, 3); r(g, 0x101010, 21, 12, 2, 3);
    r(g, 0x101010, 7, 9, 6, 2); r(g, 0x101010, 19, 9, 6, 2); r(g, 0x101010, 13, 19, 6, 2);
  });
  make(scene, "plant", 28, 36, (g) => {
    r(g, 0x2a8a2a, 12, 18, 4, 18); r(g, 0x4ac04a, 4, 24, 8, 4); r(g, 0x4ac04a, 16, 28, 8, 4);
    g.fillStyle(0xd02a3a); g.fillCircle(14, 11, 11); g.fillStyle(0xffffff);
    [[8, 6], [18, 5], [12, 15], [20, 13]].forEach(([x, y]) => g.fillRect(x, y, 3, 3));
    r(g, 0x3a0a10, 5, 10, 18, 3); r(g, 0xffffff, 7, 9, 2, 2); r(g, 0xffffff, 19, 9, 2, 2);
  });
  make(scene, "pipetop", 64, 32, (g) => {
    r(g, 0x0a4a1a, 0, 0, 64, 32); r(g, 0x2ab04a, 2, 2, 60, 28); r(g, 0x7ae08a, 6, 2, 6, 28); r(g, 0x1a8a3a, 50, 2, 10, 28);
  });
  make(scene, "pipebody", 64, 32, (g) => {
    r(g, 0x0a4a1a, 4, 0, 56, 32); r(g, 0x2ab04a, 6, 0, 52, 32); r(g, 0x7ae08a, 10, 0, 6, 32); r(g, 0x1a8a3a, 46, 0, 10, 32);
  });
  make(scene, "bullet", 12, 8, (g) => { g.fillStyle(0xffe060); g.fillEllipse(6, 4, 12, 8); g.fillStyle(0xffffff); g.fillEllipse(7, 4, 5, 4); });
  make(scene, "heart", 16, 16, (g) => {
    g.fillStyle(0xff4a5a); g.fillCircle(5, 6, 4); g.fillCircle(11, 6, 4); g.fillTriangle(1, 7, 15, 7, 8, 15);
    r(g, 0xffffff, 3, 4, 2, 2);
  });
  make(scene, "spark", 6, 6, (g) => r(g, 0xffffff, 0, 0, 6, 6));
  make(scene, "pole", 8, 32, (g) => { r(g, 0xd8d8e0, 2, 0, 4, 32); r(g, 0x8a8a9a, 5, 0, 1, 32); });
  make(scene, "flag", 40, 28, (g) => { g.fillStyle(0xffc820); g.fillTriangle(0, 0, 40, 14, 0, 28); r(g, 0xffffff, 6, 10, 6, 6); });
  make(scene, "orb", 16, 16, (g) => { g.fillStyle(0xffe060); g.fillCircle(8, 8, 8); g.fillStyle(0xffffff); g.fillCircle(6, 6, 3); });
  make(scene, "cpflag", 28, 20, (g) => { g.fillStyle(0x3ad0ff); g.fillTriangle(0, 0, 28, 10, 0, 20); });
  make(scene, "cpflagon", 28, 20, (g) => { g.fillStyle(0xff4a5a); g.fillTriangle(0, 0, 28, 10, 0, 20); });
  make(scene, "flower", 12, 12, (g) => { g.fillStyle(0xffffff); [[3, 3], [9, 3], [3, 9], [9, 9]].forEach(([x, y]) => g.fillCircle(x, y, 3)); g.fillStyle(0xffd040); g.fillCircle(6, 6, 2); });
}
