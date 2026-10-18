import { useEffect, useRef, useState } from "react";
import bgUrl from "@/assets/bg-meadows.jpg";
import { isMuted, onMuteChange, setMuted, touch, unlockAudio } from "@/game/audio";

type TouchKey = keyof typeof touch;

export function BrightboundGame() {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [muted, setM] = useState(false);
  const [stick, setStick] = useState(0);

  useEffect(() => {
    let game: import("phaser").Game | null = null;
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const S = await import("@/game/scenes");
      await document.fonts?.ready;
      if (cancelled || !hostRef.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: S.W,
        height: S.H,
        pixelArt: true,
        backgroundColor: "#4aa8ff",
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 1400 } } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        callbacks: { preBoot: (g) => g.registry.set("bgUrl", bgUrl) },
        scene: [S.BootScene, S.MenuScene, S.GameScene, S.UIScene, S.PauseScene, S.GameOverScene],
      });
    })();
    const off = onMuteChange(setM);
    setM(isMuted());
    return () => { cancelled = true; off(); game?.destroy(true); };
  }, []);

  const fullscreen = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => {}));
  };

  const hold = (k: TouchKey) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); unlockAudio(); touch[k] = true; },
    onPointerUp: () => (touch[k] = false),
    onPointerLeave: () => (touch[k] = false),
    onPointerCancel: () => (touch[k] = false),
  });

  const stickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
    setStick(dx);
    touch.left = dx < -0.25; touch.right = dx > 0.25;
  };
  const stickEnd = () => { setStick(0); touch.left = touch.right = false; };

  return (
    <div ref={frameRef} className="game-frame">
      <div className="game-stage">
        <div ref={hostRef} className="game-host" onPointerDown={() => unlockAudio()} />

        <div className="touch-controls">
          <div className="touch-stick" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); unlockAudio(); stickMove(e); }} onPointerMove={stickMove} onPointerUp={stickEnd} onPointerCancel={stickEnd}>
            <div className="touch-knob" style={{ transform: `translateX(${stick * 34}px)` }} />
          </div>
          <div className="touch-buttons">
            <button className="touch-btn touch-btn-b" aria-label="Run and shoot" {...hold("run")} onPointerDown={(e) => { e.preventDefault(); unlockAudio(); touch.run = true; touch.shoot = true; }} onPointerUp={() => { touch.run = false; touch.shoot = false; }} onPointerLeave={() => { touch.run = false; touch.shoot = false; }}>B</button>
            <button className="touch-btn touch-btn-a" aria-label="Jump" {...hold("jump")}>A</button>
          </div>
        </div>

        <div className="rotate-overlay">
          <div className="rotate-icon">⟳</div>
          <p>Putar perangkat ke landscape</p>
          <span>Rotate your device to play</span>
        </div>
      </div>

      <div className="game-footer">
        <span><i className="dot" /> BRIGHTBOUND <em>/</em> ADVENTURE MODE</span>
        <div className="game-footer-actions">
          <button onClick={() => { unlockAudio(); setMuted(!muted); }}>{muted ? "SOUND OFF" : "SOUND ON"}</button>
          <button onClick={fullscreen}>FULLSCREEN ⛶</button>
        </div>
      </div>
    </div>
  );
}
