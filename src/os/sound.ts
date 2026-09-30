// Synthesized with WebAudio — no audio assets to ship.
let ctx: AudioContext | undefined
export const sound = { on: localStorage.getItem('sound') !== 'off' }
export const setSound = (on: boolean) => { sound.on = on; localStorage.setItem('sound', on ? 'on' : 'off') }

const tone = (freq: number, at: number, dur: number, type: OscillatorType = 'square', vol = 0.04) => {
  if (!sound.on) return
  ctx ??= new AudioContext()
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur)
}
export const sfx = {
  click: () => tone(1800, 0, 0.018, 'square', 0.025),
  open: () => { tone(660, 0, 0.06, 'triangle', 0.05); tone(990, 0.05, 0.08, 'triangle', 0.05) },
  close: () => { tone(880, 0, 0.05, 'triangle', 0.05); tone(520, 0.04, 0.08, 'triangle', 0.05) },
  error: () => { tone(220, 0, 0.18, 'square', 0.05); tone(180, 0.12, 0.2, 'square', 0.05) },
  boom: () => tone(70, 0, 0.5, 'sawtooth', 0.08),
  eat: () => tone(1320, 0, 0.05, 'square', 0.03),
  startup: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.16, 0.5, 'sine', 0.06)),
}
