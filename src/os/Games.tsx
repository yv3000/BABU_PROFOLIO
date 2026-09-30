import { useEffect, useRef, useState } from 'react'
import { sfx } from './sound'

const N = 9, MINES = 10
type Cell = { mine: boolean; open: boolean; flag: boolean; n: number }
const around = (i: number) => {
  const r = Math.floor(i / N), c = i % N, out: number[] = []
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc
    if ((dr || dc) && rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc)
  }
  return out
}
const board = (safe: number): Cell[] => {
  const mines = new Set<number>()
  while (mines.size < MINES) { const m = Math.floor(Math.random() * N * N); if (m !== safe && !around(safe).includes(m)) mines.add(m) }
  return Array.from({ length: N * N }, (_, i) => ({ mine: mines.has(i), open: false, flag: false, n: around(i).filter((j) => mines.has(j)).length }))
}
const COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080']

export function Minesweeper() {
  const [cells, setCells] = useState<Cell[] | null>(null)
  const [state, setState] = useState<'play' | 'won' | 'lost'>('play')
  const [t, setT] = useState(0)
  const [flagMode, setFlagMode] = useState(false)
  useEffect(() => { if (!cells || state !== 'play') return; const i = setInterval(() => setT((x) => Math.min(999, x + 1)), 1000); return () => clearInterval(i) }, [cells, state])

  const reset = () => { setCells(null); setState('play'); setT(0) }
  const reveal = (i: number) => {
    if (state !== 'play') return
    const b = (cells ?? board(i)).map((c) => ({ ...c }))
    if (b[i].flag || b[i].open) return
    if (b[i].mine) { b.forEach((c) => c.mine && (c.open = true)); setCells(b); setState('lost'); sfx.boom(); return }
    const stack = [i]
    while (stack.length) { const j = stack.pop()!; if (b[j].open || b[j].flag) continue; b[j].open = true; if (!b[j].n) stack.push(...around(j)) }
    setCells(b)
    if (b.filter((c) => !c.open).length === MINES) { setState('won'); sfx.startup() }
  }
  const flag = (i: number) => { if (!cells || cells[i].open || state !== 'play') return; setCells(cells.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c))) }
  const flags = cells?.filter((c) => c.flag).length ?? 0
  const lcd = (v: number) => <span className="bg-black text-[#ff2020] px-1 text-2xl leading-none tracking-wider" style={{ fontFamily: 'VT323, monospace' }}>{String(Math.max(0, v)).padStart(3, '0')}</span>

  return (
    <div className="p-2 flex flex-col items-center gap-2 select-none">
      <div className="in w-full flex items-center justify-between p-1.5" style={{ background: 'var(--face)' }}>
        {lcd(MINES - flags)}
        <button className="out w-8 h-8 text-lg" onClick={reset} aria-label="New game">{state === 'lost' ? '😵' : state === 'won' ? '😎' : '🙂'}</button>
        {lcd(t)}
      </div>
      <div className="in p-1.5" style={{ background: 'var(--face)' }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, 26px)` }} onContextMenu={(e) => e.preventDefault()}>
          {Array.from({ length: N * N }, (_, i) => {
            const c = cells?.[i]
            return c?.open ? (
              <div key={i} className="w-[26px] h-[26px] flex items-center justify-center font-bold border-[0.5px] border-[var(--lo)]"
                style={{ color: COLORS[c.n], background: c.mine && state === 'lost' ? '#ff4040' : undefined }}>{c.mine ? '💣' : c.n || ''}</div>
            ) : (
              <button key={i} className="out w-[26px] h-[26px] text-xs" aria-label={`Cell ${i + 1}`}
                onClick={() => (flagMode ? flag(i) : reveal(i))} onContextMenu={() => flag(i)}>{c?.flag ? '🚩' : ''}</button>
            )
          })}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={flagMode} onChange={(e) => setFlagMode(e.target.checked)} />Flag mode (for touch) · right-click also flags</label>
    </div>
  )
}

const G = 17
type P = [number, number]
export function Snake() {
  const [snake, setSnake] = useState<P[]>([[8, 8]])
  const [food, setFood] = useState<P>([12, 8])
  const [over, setOver] = useState(false)
  const [run, setRun] = useState(false)
  const [best, setBest] = useState(() => Number(localStorage.getItem('snake-best') ?? 0))
  const dir = useRef<P>([1, 0]), next = useRef<P>([1, 0])
  const box = useRef<HTMLDivElement>(null)

  const turn = (d: P) => { if (d[0] !== -dir.current[0] || d[1] !== -dir.current[1]) next.current = d; setRun(true) }
  const reset = () => { setSnake([[8, 8]]); setFood([12, 8]); dir.current = next.current = [1, 0]; setOver(false); setRun(false); box.current?.focus() }

  useEffect(() => {
    if (!run || over) return
    const i = setInterval(() => {
      setSnake((s) => {
        dir.current = next.current
        const h: P = [(s[0][0] + dir.current[0] + G) % G, (s[0][1] + dir.current[1] + G) % G]
        if (s.some(([x, y]) => x === h[0] && y === h[1])) { setOver(true); sfx.error(); return s }
        const ate = h[0] === food[0] && h[1] === food[1]
        if (ate) {
          sfx.eat()
          let f: P
          do f = [Math.floor(Math.random() * G), Math.floor(Math.random() * G)]; while (s.some(([x, y]) => x === f[0] && y === f[1]))
          setFood(f)
        }
        return [h, ...(ate ? s : s.slice(0, -1))]
      })
    }, Math.max(60, 140 - snake.length * 3))
    return () => clearInterval(i)
  }, [run, over, food, snake.length])
  useEffect(() => { const sc = snake.length - 1; if (sc > best) { setBest(sc); localStorage.setItem('snake-best', String(sc)) } }, [snake.length, best])

  const keys: Record<string, P> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }
  const touch = useRef<P | null>(null)
  return (
    <div className="p-2 flex flex-col items-center gap-2 select-none">
      <div className="w-full flex justify-between text-xs"><span>Score: <b>{snake.length - 1}</b></span><span>Best: <b>{best}</b></span></div>
      <div ref={box} tabIndex={0} autoFocus aria-label="Snake board, use arrow keys"
        onKeyDown={(e) => { const d = keys[e.key]; if (d) { e.preventDefault(); turn(d) } }}
        onTouchStart={(e) => (touch.current = [e.touches[0].clientX, e.touches[0].clientY])}
        onTouchEnd={(e) => { const s = touch.current; if (!s) return; const dx = e.changedTouches[0].clientX - s[0], dy = e.changedTouches[0].clientY - s[1]; if (Math.abs(dx) + Math.abs(dy) > 20) turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]) }}
        className="in relative bg-[#9bbc0f] outline-none touch-none" style={{ width: G * 16 + 4, height: G * 16 + 4, padding: 2 }}>
        {snake.map(([x, y], i) => <div key={i} className="absolute bg-[#0f380f]" style={{ left: 2 + x * 16 + 1, top: 2 + y * 16 + 1, width: 14, height: 14, opacity: i ? 0.85 : 1 }} />)}
        <div className="absolute bg-[#8b0000] rounded-full" style={{ left: 2 + food[0] * 16 + 3, top: 2 + food[1] * 16 + 3, width: 10, height: 10 }} />
        {(!run || over) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0f380f]/70 text-[#9bbc0f] text-center" style={{ fontFamily: 'VT323, monospace' }}>
            <p className="text-3xl">{over ? 'GAME OVER' : 'SNAKE'}</p>
            {over ? <button className="out px-3 py-1 text-[var(--ink)] text-sm" style={{ fontFamily: 'Tahoma' }} onClick={reset}>Play again</button>
              : <p className="text-lg">Press an arrow key or swipe</p>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 sm:hidden">
        {([['', null], ['▲', [0, -1]], ['', null], ['◀', [-1, 0]], ['▼', [0, 1]], ['▶', [1, 0]]] as [string, P | null][]).map(([g, d], i) =>
          d ? <button key={i} className="out w-10 h-9" onClick={() => turn(d)} aria-label={g}>{g}</button> : <span key={i} />)}
      </div>
    </div>
  )
}
