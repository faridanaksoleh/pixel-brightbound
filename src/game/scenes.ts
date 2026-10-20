import Phaser from "phaser";
import { WORLDS, TILE, GROUND_ROW, buildLevel, type LevelData } from "./levels";
import { makeTextures } from "./textures";
import { sfx, startMusic, stopMusic, unlockAudio, touch } from "./audio";

export const W = 960;
export const H = 540;
const PIX = '"Press Start 2P", monospace';
const MONO = '"Space Mono", monospace';
const CREAM = "#fff6e0";

type Run = { lives: number; hearts: number; score: number; coins: number; world: number; start: number };
const newRun = (): Run => ({ lives: 3, hearts: 3, score: 0, coins: 0, world: 0, start: Date.now() });

function addBackground(scene: Phaser.Scene, world: number) {
  const t = WORLDS[world]!;
  scene.cameras.main.setBackgroundColor(t.sky);
  const bg = scene.add.tileSprite(0, 0, W, H, "bg").setOrigin(0).setScrollFactor(0).setTint(t.tint);
  bg.tileScaleX = bg.tileScaleY = H / 1088;
  const hills = scene.add.tileSprite(0, H - 200, W, 200, "hills" + world).setOrigin(0).setScrollFactor(0).setAlpha(0.9);
  return { bg, hills };
}

/* ---------------- Boot / Preload ---------------- */
export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }
  preload() {
    const bgUrl = this.registry.get("bgUrl") as string;
    this.load.image("bg", bgUrl);
    const bar = this.add.rectangle(W / 2 - 150, H / 2, 0, 12, 0xffc820).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 304, 16).setStrokeStyle(2, 0xffffff);
    this.load.on("progress", (p: number) => (bar.width = 300 * p));
  }
  create() {
    makeTextures(this);
    this.anims.create({ key: "walk", frames: [{ key: "hero_walk1" }, { key: "hero_idle" }, { key: "hero_walk2" }, { key: "hero_idle" }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: "coin", frames: [{ key: "coin0" }, { key: "coin1" }], frameRate: 5, repeat: -1 });
    this.scene.start("Menu");
  }
}

/* ---------------- Menu ---------------- */
export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }
  create() {
    const { bg } = addBackground(this, 0);
    this.events.on("update", () => (bg.tilePositionX += 0.3));
    this.add.rectangle(0, 0, W, H, 0x0a1a14, 0.35).setOrigin(0);
    const title = this.add.text(W / 2, 170, "BRIGHTBOUND", { fontFamily: PIX, fontSize: "64px", color: "#ffe066", stroke: "#1a2a20", strokeThickness: 10 }).setOrigin(0.5);
    title.setShadow(0, 6, "#1a2a20", 0, true, true);
    this.tweens.add({ targets: title, y: 160, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.add.text(W / 2, 250, "Chase the light. Find your brave.", { fontFamily: MONO, fontSize: "22px", color: CREAM, stroke: "#1a2a20", strokeThickness: 5 }).setOrigin(0.5);

    const btn = this.add.container(W / 2, 340);
    const shadow = this.add.rectangle(4, 6, 340, 64, 0x1a2a20);
    const face = this.add.rectangle(0, 0, 340, 64, 0xffc820).setStrokeStyle(4, 0x1a2a20);
    const label = this.add.text(0, 0, "LET'S ADVENTURE →", { fontFamily: PIX, fontSize: "18px", color: "#1a2a20" }).setOrigin(0.5);
    btn.add([shadow, face, label]);
    face.setInteractive({ useHandCursor: true })
      .on("pointerover", () => face.setFillStyle(0xffe066))
      .on("pointerout", () => face.setFillStyle(0xffc820))
      .on("pointerdown", () => this.begin());
    this.add.text(W / 2, 410, "OR PRESS ENTER TO BEGIN", { fontFamily: PIX, fontSize: "11px", color: CREAM }).setOrigin(0.5).setAlpha(0.85);
    const hero = this.add.sprite(W / 2 - 230, 340, "hero_idle").setScale(3).play("walk");
    this.tweens.add({ targets: hero, y: 330, duration: 400, yoyo: true, repeat: -1 });
    this.input.keyboard?.once("keydown-ENTER", () => this.begin());
  }
  begin() {
    unlockAudio(); startMusic();
    this.registry.set("run", newRun());
    this.scene.start("Game");
  }
}

/* ---------------- Game ---------------- */
export class GameScene extends Phaser.Scene {
  run!: Run;
  lvl!: LevelData;
  player!: Phaser.Physics.Arcade.Sprite;
  solids!: Phaser.Physics.Arcade.StaticGroup;
  blocks!: Phaser.Physics.Arcade.StaticGroup;
  coins!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  plants!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  items!: Phaser.Physics.Arcade.Group;
  keys!: Record<"left"|"right"|"a"|"d"|"jump"|"up"|"w"|"run"|"shoot"|"esc", Phaser.Input.Keyboard.Key>;
  bgl!: { bg: Phaser.GameObjects.TileSprite; hills: Phaser.GameObjects.TileSprite };
  spawn = { x: 3 * TILE, y: GROUND_ROW * TILE - 40 };
  lastGround = 0; lastJumpPress = -999; lastShot = 0; invuln = 0; facing = 1;
  finished = false; dying = false; prevJump = false; prevShoot = false;
  cpFlag!: Phaser.GameObjects.Image; cpReached = false;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super("Game"); }

  create() {
    this.run = this.registry.get("run");
    const wi = this.run.world;
    this.lvl = buildLevel(wi);
    this.finished = this.dying = this.cpReached = false;
    this.spawn = { x: 3 * TILE, y: GROUND_ROW * TILE - 40 };
    const worldW = this.lvl.cols * TILE;
    this.physics.world.setBounds(0, 0, worldW, H + 200);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.bgl = addBackground(this, wi);

    this.solids = this.physics.add.staticGroup();
    this.blocks = this.physics.add.staticGroup();
    this.coins = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group();
    this.plants = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.items = this.physics.add.group();
    const L = this.lvl;

    // ground
    for (let x = 0; x < L.cols; x++) {
      if (!L.ground[x]) continue;
      this.solids.create(x * TILE, GROUND_ROW * TILE, "grass" + wi).setOrigin(0).refreshBody();
      for (let y = GROUND_ROW + 1; y * TILE < H; y++) this.add.image(x * TILE, y * TILE, "dirt" + wi).setOrigin(0);
      if ((x * 7) % 11 === 0) this.add.image(x * TILE + 10, GROUND_ROW * TILE - 6, "flower");
    }
    // static dirt row under ground already decorative; bridges
    L.bridges.forEach((x) => { if (!L.ground[x]) this.solids.create(x * TILE, GROUND_ROW * TILE, "bridge").setOrigin(0).refreshBody(); });
    // pipes
    L.pipes.forEach((p) => {
      for (let i = 0; i < p.h; i++) {
        const key = i === p.h - 1 ? "pipetop" : "pipebody";
        this.solids.create(p.x * TILE, (GROUND_ROW - 1 - i) * TILE, key).setOrigin(0).refreshBody();
      }
      if (p.plant) {
        const topY = (GROUND_ROW - p.h) * TILE;
        const pl = this.plants.create(p.x * TILE + 32, topY + 18, "plant") as Phaser.Physics.Arcade.Sprite;
        pl.setDepth(-1);
        this.tweens.add({ targets: pl, y: topY - 16, duration: 900, hold: 1200, repeatDelay: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: p.x * 37 % 1500 });
      }
    });
    L.bricks.forEach(([x, y]) => this.blocks.create(x * TILE, y * TILE, "brick").setOrigin(0).refreshBody().setData("type", "brick"));
    L.qblocks.forEach(([x, y], i) => this.blocks.create(x * TILE, y * TILE, "qblock").setOrigin(0).refreshBody().setData("type", "q").setData("item", i % 4 === 3 ? "heart" : "coin"));
    L.coins.forEach(([x, y]) => (this.coins.create(x * TILE + 16, y * TILE + 16, "coin0") as Phaser.Physics.Arcade.Sprite).play("coin"));
    L.slimes.forEach((x) => {
      const s = this.enemies.create(x * TILE + 16, GROUND_ROW * TILE - 20, "slime") as Phaser.Physics.Arcade.Sprite;
      s.setVelocityX(-50 - wi * 6).setBounce(0).setCollideWorldBounds(true);
      (s.body as Phaser.Physics.Arcade.Body).setSize(28, 22).setOffset(2, 4);
    });

    // checkpoint & goal
    this.add.image(L.checkpoint * TILE + 4, GROUND_ROW * TILE - 32, "pole").setOrigin(0.5, 0).setScale(1, 2).setY(GROUND_ROW * TILE - 64);
    this.cpFlag = this.add.image(L.checkpoint * TILE + 6, GROUND_ROW * TILE - 62, "cpflag").setOrigin(0, 0);
    for (let i = 0; i < 6; i++) this.add.image(L.goal * TILE, GROUND_ROW * TILE - 32 - i * 32, "pole").setOrigin(0.5, 0);
    const flag = this.add.image(L.goal * TILE + 2, GROUND_ROW * TILE - 190, "flag").setOrigin(0, 0);
    this.tweens.add({ targets: flag, scaleX: 0.85, duration: 500, yoyo: true, repeat: -1 });
    const orb = this.add.image(L.goal * TILE, GROUND_ROW * TILE - 200, "orb").setScale(1.4);
    this.tweens.add({ targets: orb, alpha: 0.6, scale: 1.8, duration: 600, yoyo: true, repeat: -1 });

    // player
    this.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, "hero_idle");
    this.player.setCollideWorldBounds(true).setDepth(5);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(16, 30).setOffset(4, 2).setMaxVelocityY(900);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.blocks, (_p, b) => this.hitBlock(b as Phaser.Physics.Arcade.Sprite));
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.enemies, this.blocks);
    this.physics.add.collider(this.items, this.solids);
    this.physics.add.collider(this.items, this.blocks);
    this.physics.add.overlap(this.player, this.coins, (_p, c) => this.collectCoin(c as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.items, (_p, it) => {
      (it as Phaser.GameObjects.GameObject).destroy();
      this.run.hearts = Math.min(3, this.run.hearts + 1); this.run.score += 500; sfx.powerup(); this.emit();
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.touchEnemy(e as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.plants, () => this.damage());
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => { b.destroy(); this.killEnemy(e as Phaser.Physics.Arcade.Sprite, 200); });
    this.physics.add.overlap(this.bullets, this.plants, (b, p) => { b.destroy(); this.killEnemy(p as Phaser.Physics.Arcade.Sprite, 300); });
    this.physics.add.collider(this.bullets, this.solids, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.blocks, (b) => b.destroy());

    this.sparks = this.add.particles(0, 0, "spark", { speed: { min: 80, max: 220 }, lifespan: 450, scale: { start: 1, end: 0 }, gravityY: 400, emitting: false, tint: [0xffe060, 0xffffff, 0xffa020] }).setDepth(10);

    this.cameras.main.setBounds(0, 0, worldW, H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -120, 0);
    this.cameras.main.setRoundPixels(true);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ left: "LEFT", right: "RIGHT", a: "A", d: "D", jump: "SPACE", up: "UP", w: "W", run: "SHIFT", shoot: "J", esc: "ESC" }) as GameScene["keys"];
    kb.on("keydown-ESC", () => this.pauseGame());

    this.scene.launch("UI");
    this.time.delayedCall(50, () => this.emit());
    this.events.once("shutdown", () => this.scene.stop("UI"));
  }

  emit() { this.registry.set("run", { ...this.run }); this.events.emit("hud"); }

  pauseGame() {
    if (this.finished || this.dying) return;
    this.scene.pause(); this.scene.launch("Pause");
  }

  burst(x: number, y: number, n = 10) { this.sparks.explode(n, x, y); }

  collectCoin(c: Phaser.Physics.Arcade.Sprite) {
    this.burst(c.x, c.y, 6); c.destroy();
    this.run.coins++; this.run.score += 100; sfx.coin();
    if (this.run.coins % 100 === 0) this.run.lives++;
    this.emit();
  }

  hitBlock(b: Phaser.Physics.Arcade.Sprite) {
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    if (!(pb.touching.up || pb.blocked.up) || pb.top < b.y + TILE - 6) return;
    const type = b.getData("type");
    if (type === "brick") {
      this.burst(b.x + 16, b.y + 16, 14); sfx.breakb(); b.destroy(); this.run.score += 50; this.emit();
      this.bumpAbove(b);
    } else if (type === "q") {
      b.setData("type", "used").setTexture("used");
      this.tweens.add({ targets: b, y: b.y - 8, duration: 80, yoyo: true, onComplete: () => b.refreshBody() });
      if (b.getData("item") === "heart") {
        const h = this.items.create(b.x + 16, b.y - 16, "heart") as Phaser.Physics.Arcade.Sprite;
        h.setVelocity(80, -200); h.setBounceX(1); h.setCollideWorldBounds(true);
        sfx.powerup();
      } else {
        const c = this.add.image(b.x + 16, b.y - 10, "coin0");
        this.tweens.add({ targets: c, y: b.y - 70, duration: 300, yoyo: true, onComplete: () => c.destroy() });
        this.run.coins++; this.run.score += 200; sfx.coin(); this.emit();
      }
      this.bumpAbove(b);
    } else sfx.bump();
  }

  bumpAbove(b: Phaser.Physics.Arcade.Sprite) {
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      if (Math.abs(e.x - (b.x + 16)) < 24 && Math.abs(e.y - (b.y - 12)) < 20) this.killEnemy(e, 200);
    });
  }

  touchEnemy(e: Phaser.Physics.Arcade.Sprite) {
    if (!e.active || e.getData("dead")) return;
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    if (pb.velocity.y > 0 && pb.bottom < e.y + 4) {
      this.killEnemy(e, 200); this.player.setVelocityY(-380); sfx.stomp();
    } else this.damage();
  }

  killEnemy(e: Phaser.Physics.Arcade.Sprite, pts: number) {
    if (!e.active || e.getData("dead")) return;
    e.setData("dead", true);
    this.tweens.killTweensOf(e);
    this.burst(e.x, e.y, 14);
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    this.tweens.add({ targets: e, scaleY: 0.2, alpha: 0, duration: 250, onComplete: () => e.destroy() });
    this.run.score += pts; this.emit();
    const t = this.add.text(e.x, e.y - 20, String(pts), { fontFamily: PIX, fontSize: "10px", color: "#fff" }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  damage() {
    if (this.time.now < this.invuln || this.finished || this.dying) return;
    this.run.hearts--; sfx.hurt();
    this.cameras.main.shake(150, 0.006);
    if (this.run.hearts <= 0) { this.loseLife(); return; }
    this.invuln = this.time.now + 1500;
    this.player.setVelocity(-this.facing * 200, -300);
    this.emit();
  }

  loseLife() {
    if (this.dying) return;
    this.dying = true;
    this.run.lives--; this.emit();
    this.player.setVelocity(0, -450).setTint(0xff6060);
    (this.player.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
    this.time.delayedCall(1200, () => {
      if (this.run.lives <= 0) {
        stopMusic(); sfx.lose();
        this.registry.set("run", { ...this.run }); this.scene.start("GameOver", { win: false });
        return;
      }
      this.run.hearts = 3; this.dying = false;
      (this.player.body as Phaser.Physics.Arcade.Body).checkCollision.none = false;
      this.player.clearTint().setPosition(this.spawn.x, this.spawn.y).setVelocity(0, 0);
      this.invuln = this.time.now + 1500;
      this.emit();
    });
  }

  finish() {
    this.finished = true; sfx.win();
    this.player.setVelocity(0, 0);
    const remaining = Math.max(0, 300 - Math.floor((Date.now() - this.run.start) / 1000) % 300);
    this.run.score += 1000 + remaining * 5;
    this.emit();
    this.events.emit("clear");
    this.time.delayedCall(2200, () => {
      if (this.run.world >= WORLDS.length - 1) {
        stopMusic(); this.registry.set("run", { ...this.run }); this.scene.start("GameOver", { win: true });
      } else {
        this.run.world++; this.run.hearts = 3;
        this.registry.set("run", { ...this.run }); this.scene.restart();
      }
    });
  }

  shoot() {
    if (this.time.now - this.lastShot < 280) return;
    this.lastShot = this.time.now;
    const b = this.bullets.create(this.player.x + this.facing * 14, this.player.y + 2, "bullet") as Phaser.Physics.Arcade.Sprite;
    b.setVelocityX(this.facing * 620).setFlipX(this.facing < 0);
    this.time.delayedCall(900, () => b.destroy());
    sfx.shoot();
    this.player.setData("shootUntil", this.time.now + 180);
  }

  override update(time: number) {
    this.bgl.bg.tilePositionX = this.cameras.main.scrollX * 0.15 / this.bgl.bg.tileScaleX;
    this.bgl.hills.tilePositionX = this.cameras.main.scrollX * 0.4;

    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach((e) => {
      const b = e.body as Phaser.Physics.Arcade.Body;
      if (!b?.enable) return;
      const sp = 50 + this.run.world * 6;
      if (b.blocked.left) e.setVelocityX(sp);
      else if (b.blocked.right) e.setVelocityX(-sp);
      e.setFlipX(b.velocity.x > 0);
      if (e.y > H + 50) e.destroy();
    });

    if (this.dying || this.finished) return;
    const k = this.keys;
    const p = this.player;
    const body = p.body as Phaser.Physics.Arcade.Body;
    const left = k.left.isDown || k.a.isDown || touch.left;
    const right = k.right.isDown || k.d.isDown || touch.right;
    const jumpHeld = k.jump.isDown || k.up.isDown || k.w.isDown || touch.jump;
    const run = k.run.isDown || touch.run;
    const shootHeld = k.shoot.isDown || touch.shoot;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) this.lastGround = time;
    if (jumpHeld && !this.prevJump) this.lastJumpPress = time;
    if (shootHeld && !this.prevShoot) this.shoot();

    const max = run ? 290 : 180;
    const accel = onGround ? 1400 : 900;
    if (left) { body.setAccelerationX(-accel); this.facing = -1; }
    else if (right) { body.setAccelerationX(accel); this.facing = 1; }
    else { body.setAccelerationX(0); body.setVelocityX(body.velocity.x * (onGround ? 0.8 : 0.95)); }
    body.setVelocityX(Phaser.Math.Clamp(body.velocity.x, -max, max));

    // coyote time (100ms) + jump buffer (120ms)
    if (time - this.lastJumpPress < 120 && time - this.lastGround < 100) {
      body.setVelocityY(run && Math.abs(body.velocity.x) > 200 ? -600 : -560);
      this.lastJumpPress = -999; this.lastGround = -999; sfx.jump();
    }
    // variable jump height
    if (!jumpHeld && body.velocity.y < -200) body.setVelocityY(body.velocity.y * 0.85);
    this.prevJump = jumpHeld; this.prevShoot = shootHeld;

    // animation
    p.setFlipX(this.facing < 0);
    if ((p.getData("shootUntil") ?? 0) > time) { p.anims.stop(); p.setTexture("hero_shoot"); }
    else if (!onGround) { p.anims.stop(); p.setTexture(body.velocity.y < 0 ? "hero_jump" : "hero_fall"); }
    else if (Math.abs(body.velocity.x) > 20) { p.play("walk", true); p.anims.timeScale = run ? 1.8 : 1; }
    else { p.anims.stop(); p.setTexture("hero_idle"); }
    p.setAlpha(time < this.invuln ? (Math.floor(time / 80) % 2 ? 0.3 : 1) : 1);

    if (p.y > H + 40) { this.run.hearts = 0; this.loseLife(); }
    if (!this.cpReached && p.x > this.lvl.checkpoint * TILE) {
      this.cpReached = true; this.cpFlag.setTexture("cpflagon");
      this.spawn = { x: this.lvl.checkpoint * TILE, y: GROUND_ROW * TILE - 40 };
      this.burst(this.cpFlag.x + 10, this.cpFlag.y + 10, 16); sfx.powerup();
    }
    if (p.x > this.lvl.goal * TILE - 8) this.finish();
  }
}

/* ---------------- UI / HUD ---------------- */
export class UIScene extends Phaser.Scene {
  constructor() { super("UI"); }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0x12302a, 0.82); g.fillRoundedRect(16, 12, W - 32, 64, 10);
    g.lineStyle(2, 0xffffff, 0.12); g.strokeRoundedRect(16, 12, W - 32, 64, 10);
    [180, 400, 640, 830].forEach((x) => { g.fillStyle(0xffffff, 0.12); g.fillRect(x, 24, 1, 40); });
    const lbl = (x: number, y: number, s: string) => this.add.text(x, y, s, { fontFamily: PIX, fontSize: "8px", color: "#a8c8b8" });
    const val = (x: number, y: number, size = 16) => this.add.text(x, y, "", { fontFamily: PIX, fontSize: size + "px", color: CREAM });
    this.add.image(46, 44, "hero_idle").setScale(1.3);
    const lives = val(70, 26, 14);
    const hearts = [0, 1, 2].map((i) => this.add.image(78 + i * 20, 60, "heart"));
    lbl(200, 24, "SCORE"); const score = val(200, 42, 18);
    this.add.image(430, 44, "coin0").setScale(1.6); const coins = val(452, 36, 16);
    const stage = lbl(660, 24, ""); const stageName = val(660, 44, 11);
    const time = val(850, 26, 13); lbl(850, 50, "ELAPSED");

    const banner = this.add.text(W / 2, 150, "", { fontFamily: PIX, fontSize: "22px", color: CREAM, stroke: "#12302a", strokeThickness: 6, align: "center" }).setOrigin(0.5);
    const sub = this.add.text(W / 2, 192, "", { fontFamily: MONO, fontSize: "20px", color: CREAM, stroke: "#12302a", strokeThickness: 5, fontStyle: "bold" }).setOrigin(0.5);

    const game = this.scene.get("Game");
    const refresh = () => {
      const r = this.registry.get("run") as Run;
      lives.setText("× " + String(r.lives).padStart(2, "0"));
      hearts.forEach((h, i) => h.setAlpha(i < r.hearts ? 1 : 0.2));
      score.setText(String(r.score).padStart(6, "0"));
      coins.setText("× " + String(r.coins).padStart(2, "0"));
      stage.setText(`STAGE ${String(r.world + 1).padStart(2, "0")} / ${WORLDS.length}`);
      stageName.setText(WORLDS[r.world]!.name.toUpperCase());
    };
    game.events.on("hud", refresh);
    game.events.on("clear", () => { banner.setText("WORLD CLEAR!").setAlpha(1); sub.setText("The light grows brighter.").setAlpha(1); });
    this.events.once("shutdown", () => { game.events.off("hud", refresh); game.events.off("clear"); });
    refresh();

    const r0 = this.registry.get("run") as Run;
    banner.setText(`${String(r0.world + 1).padStart(2, "0")}  /  ${WORLDS[r0.world]!.name.toUpperCase()}`);
    sub.setText(WORLDS[r0.world]!.tagline);
    this.tweens.add({ targets: [banner, sub], alpha: 0, delay: 2600, duration: 800 });

    this.time.addEvent({ delay: 250, loop: true, callback: () => {
      const r = this.registry.get("run") as Run;
      const s = Math.floor((Date.now() - r.start) / 1000);
      time.setText(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    } });
  }
}

/* ---------------- Pause ---------------- */
export class PauseScene extends Phaser.Scene {
  constructor() { super("Pause"); }
  create() {
    this.add.rectangle(0, 0, W, H, 0x0a1a14, 0.65).setOrigin(0);
    this.add.text(W / 2, H / 2 - 40, "PAUSED", { fontFamily: PIX, fontSize: "40px", color: "#ffe066" }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 20, "ESC / TAP TO RESUME", { fontFamily: PIX, fontSize: "12px", color: CREAM }).setOrigin(0.5);
    const resume = () => { this.scene.resume("Game"); this.scene.stop(); };
    this.input.keyboard?.once("keydown-ESC", resume);
    this.input.once("pointerdown", resume);
  }
}

/* ---------------- Game Over / Victory ---------------- */
export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }
  create(data: { win: boolean }) {
    const r = this.registry.get("run") as Run;
    addBackground(this, data.win ? 9 : 0);
    this.add.rectangle(0, 0, W, H, 0x0a1a14, 0.6).setOrigin(0);
    this.add.text(W / 2, 150, data.win ? "YOU ARE BRIGHTBOUND" : "GAME OVER", { fontFamily: PIX, fontSize: data.win ? "34px" : "48px", color: data.win ? "#ffe066" : "#ff6a6a", stroke: "#12302a", strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(W / 2, 215, data.win ? "A little courage went a long way." : "Every hero falls. The brave get up.", { fontFamily: MONO, fontSize: "20px", color: CREAM }).setOrigin(0.5);
    this.add.text(W / 2, 290, `SCORE ${String(r.score).padStart(6, "0")}   COINS ${r.coins}   WORLD ${r.world + 1}/10`, { fontFamily: PIX, fontSize: "13px", color: CREAM }).setOrigin(0.5);
    if (data.win) this.add.particles(0, 0, "spark", { x: { min: 0, max: W }, y: -10, speedY: { min: 60, max: 160 }, lifespan: 4000, tint: [0xffe060, 0xff6a6a, 0x6ad0ff, 0x8aff8a], frequency: 60 });
    const t = this.add.text(W / 2, 380, "PRESS ENTER OR TAP TO PLAY AGAIN", { fontFamily: PIX, fontSize: "12px", color: "#ffe066" }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    const again = () => { startMusic(); this.registry.set("run", newRun()); this.scene.start("Game"); };
    this.time.delayedCall(600, () => {
      this.input.keyboard?.once("keydown-ENTER", again);
      this.input.once("pointerdown", again);
    });
  }
}
