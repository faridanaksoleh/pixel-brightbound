// Tiny Web Audio synth: SFX + looping chiptune. Starts only after a user gesture.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: number | null = null;
let muted = false;
const listeners = new Set<(m: boolean) => void>();

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

export const isMuted = () => muted;
export function onMuteChange(fn: (m: boolean) => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.35;
  listeners.forEach((f) => f(m));
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.3, slide = 0, when = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  jump: () => tone(320, 0.18, "square", 0.2, 500),
  coin: () => { tone(988, 0.08, "square", 0.18); tone(1319, 0.25, "square", 0.18, 0, 0.08); },
  shoot: () => tone(800, 0.12, "sawtooth", 0.12, -600),
  hurt: () => tone(300, 0.35, "sawtooth", 0.25, -220),
  stomp: () => tone(200, 0.15, "square", 0.25, -120),
  bump: () => tone(140, 0.1, "triangle", 0.3),
  breakb: () => tone(100, 0.2, "sawtooth", 0.2, -50),
  powerup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.18, 0, i * 0.07)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.2, "square", 0.2, 0, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "triangle", 0.25, 0, i * 0.2)),
};

const MEL = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74];
const BASS = [48, 48, 53, 53, 48, 48, 55, 55];
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function startMusic() {
  if (!ctx || musicTimer !== null) return;
  let step = 0;
  musicTimer = window.setInterval(() => {
    tone(mtof(MEL[step % 16]!), 0.18, "square", 0.06);
    if (step % 2 === 0) tone(mtof(BASS[(step / 2) % 8]!), 0.3, "triangle", 0.12);
    step++;
  }, 190);
}
export function stopMusic() {
  if (musicTimer !== null) clearInterval(musicTimer);
  musicTimer = null;
}

// Shared touch input written by the React overlay, read by the game.
export const touch = { left: false, right: false, jump: false, run: false, shoot: false };
