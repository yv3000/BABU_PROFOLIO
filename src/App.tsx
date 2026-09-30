import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'

// Classic pixel-art icons (SVG) instead of emoji for the two most recognisable bits of chrome.
const DosIcon = () => (
  <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden="true" className="inline-block" shapeRendering="crispEdges">
    <rect x="1" y="3" width="30" height="26" fill="#c0c0c0" /><rect x="1" y="3" width="30" height="1" fill="#fff" /><rect x="1" y="28" width="30" height="1" fill="#404040" />
    <rect x="2" y="4" width="28" height="4" fill="#000080" /><rect x="26" y="5" width="3" height="2" fill="#c0c0c0" />
    <rect x="3" y="9" width="26" height="18" fill="#000" />
    <text x="4.5" y="21" fontFamily="monospace" fontSize="8" fontWeight="bold" fill="#c0c0c0">C:\&gt;</text><rect x="23" y="20" width="4" height="1.5" fill="#c0c0c0" />
  </svg>
)
const Flag = () => (
  <svg viewBox="0 0 20 18" width="18" height="16" aria-hidden="true" className="inline-block" shapeRendering="crispEdges">
    <path d="M2 3q4-2 8 0v6q-4-2-8 0z" fill="#ff2a00" /><path d="M11 3q4 2 8 0v6q-4 2-8 0z" fill="#16c60c" />
    <path d="M2 10q4-2 8 0v6q-4-2-8 0z" fill="#0078ff" /><path d="M11 10q4 2 8 0v6q-4 2-8 0z" fill="#ffd200" />
  </svg>
)
import { siGithub, siGmail } from 'simple-icons'
import { OS, PROFILE, CONTACT, PROJECTS, SKILLS, WALLPAPERS, preview, type Project } from './content'
import { sfx, sound, setSound } from './os/sound'
import { Minesweeper, Snake } from './os/Games'
import { TaskManager } from './os/TaskManager'

// Single source of truth: explorer + terminal both read this tree, built from content.ts.
type Node = { type: 'dir'; children: Record<string, Node> } | { type: 'file'; body: string; url?: string; app?: string; icon?: string }
const dir = (children: Record<string, Node>): Node => ({ type: 'dir', children })
const file = (body: string, extra: Omit<Extract<Node, { type: 'file' }>, 'type' | 'body'> = {}): Node => ({ type: 'file', body, ...extra })
const FS = dir({
  home: dir({
    aaryan: dir({
      projects: dir(Object.fromEntries(PROJECTS.map((p) => [p.slug, dir({
        'about.txt': file(`${p.name} — ${p.tagline}\n\n${p.about}\n\nTech stack: ${p.stack.join(', ')}`, { app: 'project:' + p.slug }),
        'preview.png': file('[binary image] use `open preview.png`', { app: 'project:' + p.slug, icon: '🖼️' }),
        'github.url': file(p.repo, { url: p.repo }),
      })]))),
      contact: dir({
        'linkedin.url': file(CONTACT.linkedin.handle, { url: CONTACT.linkedin.url }),
        'github.url': file(CONTACT.github.handle, { url: CONTACT.github.url }),
        'email.txt': file(CONTACT.email.handle, { url: CONTACT.email.url }),
      }),
      'resume.pdf': file('[PDF] use `open resume.pdf` or `resume`', { app: 'resume', icon: '📕' }),
      games: dir({ 'minesweeper.exe': file('[binary] run `mines`', { app: 'mines', icon: '💣' }), 'snake.exe': file('[binary] run `snake`', { app: 'snake', icon: '🐍' }) }),
    }),
  }),
  etc: dir({ motd: file(`Welcome to ${OS.name} ${OS.version}. Type \`help\`.`), passwd: file('root:x:0:0:nice try:/root:/bin/false\naaryan:x:1000:1000::/home/aaryan:/bin/sh') }),
})
const HOME = ['home', 'aaryan']
const get = (path: string[]) => path.reduce<Node | undefined>((n, k) => (n?.type === 'dir' ? n.children[k] : undefined), FS)
const resolve = (cwd: string[], p = ''): string[] | null => {
  const parts = p.startsWith('/') ? [] : p.startsWith('~') ? [...HOME] : [...cwd]
  for (const s of p.replace(/^~/, '').split('/').filter(Boolean)) s === '..' ? parts.pop() : s !== '.' && parts.push(s)
  return get(parts) ? parts : null
}
const show = (p: string[]) => { const s = '/' + p.join('/'); return s.startsWith('/home/aaryan') ? '~' + s.slice(12) : s }

// Tiny event bus so nested apps (explorer, terminal) can drive the shell.
type Cmd = { open?: string; close?: string; theme?: boolean; wallpaper?: true; bsod?: string }
const emit = (d: Cmd) => window.dispatchEvent(new CustomEvent<Cmd>('aaryx', { detail: d }))

const APPS: Record<string, { title: string; icon: ReactNode; w: number; h: number; desk?: boolean }> = {
  about: { title: 'About Me', icon: '👤', w: 440, h: 520, desk: true },
  explorer: { title: 'File Explorer', icon: '📁', w: 540, h: 380, desk: true },
  terminal: { title: 'Terminal', icon: <DosIcon />, w: 600, h: 380, desk: true },
  resume: { title: 'Resume.pdf', icon: '📕', w: 640, h: 600 },
  contact: { title: 'Contact', icon: '✉️', w: 380, h: 250, desk: true },
  mines: { title: 'Minesweeper', icon: '💣', w: 262, h: 370 },
  snake: { title: 'Snake', icon: '🐍', w: 300, h: 400 },
  settings: { title: 'Settings', icon: '⚙️', w: 340, h: 380, desk: true },
  taskmgr: { title: 'Task Manager', icon: '📊', w: 440, h: 500 },
}
const meta = (id: string) => {
  const p = PROJECTS.find((x) => 'project:' + x.slug === id)
  return p ? { title: p.name, icon: '📂', w: 500, h: 480 } : APPS[id]
}
const SIZES = { desktop: '100%', tablet: '820px', phone: '390px' } as const
type Size = keyof typeof SIZES
type Win = { id: string; x: number; y: number; z: number; min: boolean; w?: number; h?: number }
const btnRow = 'w-full flex items-center gap-3 px-2 py-1.5 text-left hover:bg-[#000080] hover:text-white'

export default function Root() {
  const [booting, setBooting] = useState(true)
  const [off, setOff] = useState(false)
  const [bsod, setBsod] = useState<string | null>(null)
  const [wins, setWins] = useState<Win[]>([])
  const [start, setStart] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [dark, setDark] = useState(() => localStorage.getItem('dark') === '1')
  const [size, setSize] = useState<Size>('desktop')
  const [snd, setSnd] = useState(sound.on)
  const [wall, setWall] = useState(() => { const w = localStorage.getItem('wall') ?? ''; return w in WALLPAPERS ? w : '' })
  const [now, setNow] = useState(new Date())
  const z = useRef(10)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', dark ? '1' : '0') }, [dark])
  useEffect(() => { localStorage.setItem('wall', wall) }, [wall])
  useEffect(() => { if (!booting) return; const t = setTimeout(() => { setBooting(false); sfx.startup() }, innerWidth < 640 ? 1000 : 1800); return () => clearTimeout(t) }, [booting])
  const power = (to: 'off' | 'restart') => { sfx.close(); setWins([]); setStart(false); setMenu(null); to === 'off' ? setOff(true) : setBooting(true) }

  const open = (id: string) => {
    if (!meta(id)) return
    setStart(false); setMenu(null); sfx.open()
    setWins((w) => {
      const top = ++z.current
      if (w.some((x) => x.id === id)) return w.map((x) => (x.id === id ? { ...x, z: top, min: false } : x))
      const n = w.length % 8
      return [...w, { id, x: 110 + n * 28, y: 24 + n * 24, z: top, min: false }]
    })
  }
  const patch = (id: string, p: Partial<Win>) => setWins((w) => w.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const close = (id: string) => { sfx.close(); setWins((w) => w.filter((x) => x.id !== id)) }
  const shuffle = () => { const pool = Object.keys(WALLPAPERS).filter((u) => u !== wall); setWall(pool[Math.floor(Math.random() * pool.length)]); setMenu(null) }

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<Cmd>).detail
      if (d.open) open(d.open)
      if (d.close) close(d.close)
      if (d.theme !== undefined) setDark(d.theme)
      if (d.wallpaper) shuffle()
      if (d.bsod) { sfx.error(); setBsod(d.bsod) }
    }
    window.addEventListener('aaryx', h); return () => window.removeEventListener('aaryx', h)
  })

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (bsod) return setBsod(null)
      if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); open('taskmgr') }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  const topId = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0]?.id
  const narrow = size === 'phone' || innerWidth < 640

  const body = (id: string) => {
    const p = PROJECTS.find((x) => 'project:' + x.slug === id)
    if (p) return <ProjectView p={p} />
    switch (id) {
      case 'about': return <About />
      case 'explorer': return <Explorer />
      case 'terminal': return <Terminal />
      case 'resume': return <Resume />
      case 'contact': return <Contact />
      case 'mines': return <Minesweeper />
      case 'snake': return <Snake />
      case 'taskmgr': return <TaskManager procs={wins.map((w) => ({ id: w.id, ...meta(w.id) }))} onEnd={close} />
      case 'settings': return <Settings {...{ dark, setDark, size, setSize, snd, wall }}
        setSnd={(v) => { setSound(v); setSnd(v); sfx.click() }} shuffle={shuffle} solid={() => setWall('')} />
    }
  }

  const ctx = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).closest('[data-desk]')) return
    e.preventDefault()
    const r = frame.current!.getBoundingClientRect()
    setStart(false); setMenu({ x: Math.min(e.clientX - r.left, r.width - 190), y: Math.min(e.clientY - r.top, r.height - 170) })
  }

  return (
    <div className="min-h-screen flex justify-center bg-black" onPointerDownCapture={(e) => (e.target as HTMLElement).closest('button,a,input') && sfx.click()}>
      <div ref={frame} className="relative h-screen overflow-hidden transition-[width] duration-500 ease-out bg-cover bg-center"
        style={{ width: SIZES[size], backgroundColor: 'var(--desk)', backgroundImage: WALLPAPERS[wall] }}
        onContextMenu={ctx} onPointerDown={(e) => { if (e.target === e.currentTarget) { setStart(false); setMenu(null) } }}>
        {booting && <Boot />}
        {off && <PowerOff onOn={() => { setOff(false); setBooting(true) }} />}
        {bsod && <Bsod code={bsod} onDone={() => setBsod(null)} />}

        <div data-desk className="absolute top-3 left-2 grid grid-flow-col grid-rows-[repeat(auto-fill,84px)] max-h-[calc(100%-56px)] gap-1"
          onPointerDown={() => { setStart(false); setMenu(null) }}>
          {Object.entries(APPS).filter(([, a]) => a.desk).map(([id, a]) => (
            <button key={id} onDoubleClick={() => open(id)} onClick={() => narrow && open(id)} onKeyDown={(e) => e.key === 'Enter' && open(id)}
              className="group w-20 flex flex-col items-center gap-1 p-1 text-white focus:outline-none">
              <span className="text-3xl drop-shadow-[1px_1px_0_#000]">{a.icon}</span>
              <span className="px-1 text-xs [text-shadow:1px_1px_#000] group-focus:bg-[#000080] group-focus:[text-shadow:none] group-focus:outline-1 group-focus:outline-dotted group-focus:outline-white">{a.title}</span>
            </button>
          ))}
        </div>
        <p className="absolute right-4 bottom-12 text-right text-white/40 [text-shadow:1px_1px_#0006] px text-2xl select-none pointer-events-none">{OS.name}<sup>{OS.version}</sup></p>

        {wins.map((w) => (
          <Window key={w.id} win={w} active={w.id === topId} narrow={narrow} onFocus={() => patch(w.id, { z: ++z.current })}
            onMove={(x, y) => patch(w.id, { x, y })} onResize={(ww, hh) => patch(w.id, { w: ww, h: hh })} onMin={() => patch(w.id, { min: true })} onClose={() => close(w.id)}>
            {body(w.id)}
          </Window>
        ))}

        {menu && (
          <ul role="menu" className="rise out absolute z-[9999] w-48 p-0.5" style={{ left: menu.x, top: menu.y }}>
            <li><button role="menuitem" className={btnRow} onClick={() => setMenu(null)}>Refresh</button></li>
            <li><button role="menuitem" className={btnRow} onClick={shuffle}>🖼️ Change wallpaper</button></li>
            <li><button role="menuitem" className={btnRow} onClick={() => { setWall(''); setMenu(null) }}>Classic teal</button></li>
            <li className="my-1 mx-1 border-t border-[var(--lo)]" />
            <li><button role="menuitem" className={btnRow} onClick={() => open('taskmgr')}>Task Manager</button></li>
            <li><button role="menuitem" className={btnRow} onClick={() => open('settings')}>Properties</button></li>
          </ul>
        )}

        {start && (
          <div className="rise out absolute bottom-9 left-0.5 z-[9999] flex w-60 p-0.5">
            <div className="w-7 flex items-end justify-center pb-2" style={{ background: 'linear-gradient(#000080,#1084d0)' }}>
              <span className="px text-white text-lg font-semibold [writing-mode:vertical-rl] rotate-180 tracking-wide">{OS.name}<span className="font-normal"> {OS.version}</span></span>
            </div>
            <ul className="flex-1 py-0.5">
              {Object.entries(APPS).map(([id, a]) => (
                <li key={id}><button onClick={() => open(id)} className={btnRow}><span className="text-xl">{a.icon}</span>{a.title}</button></li>
              ))}
              <li className="my-1 mx-1 border-t border-[var(--lo)]" />
              <li><button onClick={() => power('restart')} className={btnRow}><span className="text-xl">🔄</span>Restart</button></li>
              <li><button onClick={() => power('off')} className={btnRow}><span className="text-xl">⏻</span>Shut Down</button></li>
              <li><button onClick={() => { setStart(false); emit({ bsod: '0E : 0028 : C0011E36' }) }} className={btnRow}><span className="text-xl">⚠️</span>Don't click this</button></li>
            </ul>
          </div>
        )}

        <div className="out absolute bottom-0 inset-x-0 z-[9998] h-9 flex items-center gap-1 px-0.5"
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); open('taskmgr') }}>
          <button onClick={() => { setMenu(null); setStart((s) => !s) }} className={`out h-7 px-2 flex items-center gap-1 font-bold ${start ? 'pressed' : ''}`} aria-expanded={start}>
            <Flag />Start
          </button>
          <div className="flex-1 flex gap-1 overflow-hidden">
            {wins.map((w) => (
              <button key={w.id} onClick={() => (w.id === topId ? patch(w.id, { min: true }) : patch(w.id, { min: false, z: ++z.current }))}
                className={`out h-7 px-2 min-w-0 max-w-40 flex items-center gap-1 truncate text-left ${w.id === topId ? 'pressed font-bold' : ''}`}>
                <span>{meta(w.id).icon}</span><span className="truncate">{narrow ? '' : meta(w.id).title}</span>
              </button>
            ))}
          </div>
          <div className="in h-7 px-2 flex items-center gap-2 text-xs whitespace-nowrap" style={{ background: 'var(--face)' }}>
            <button onClick={() => open('taskmgr')} title="Task Manager" aria-label="Open Task Manager">📊</button>
            <button onClick={() => { setSound(!snd); setSnd(!snd) }} title="Sound" aria-label={snd ? 'Mute sounds' : 'Unmute sounds'}>{snd ? '🔊' : '🔇'}</button>
            <button onClick={() => setDark((d) => !d)} title="Toggle theme" aria-label="Toggle dark mode">{dark ? '🌙' : '☀️'}</button>
            <time dateTime={now.toISOString()} className="text-center leading-tight">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {!narrow && <><br />{now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</>}
            </time>
          </div>
        </div>
      </div>
    </div>
  )
}

function Boot() {
  return (
    <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center gap-6 text-white" role="status" aria-label={`Starting ${OS.name}`}>
      <div className="px text-6xl font-semibold tracking-wide">
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#ff3b30,#ffcc00,#34c759,#0a84ff)' }}>{OS.name}</span>
        <sup className="text-2xl text-white/70 ml-1">{OS.version}</sup>
      </div>
      <div className="w-56 h-4 border border-white/60 p-0.5 overflow-hidden">
        <div className="h-full w-1/3 boot-bar" style={{ background: 'repeating-linear-gradient(90deg,#0a84ff 0 10px,transparent 10px 13px)' }} />
      </div>
      <p className="text-xs text-white/50">Starting {OS.name}…</p>
    </div>
  )
}

function Window({ win, active, narrow, children, onFocus, onMove, onResize, onMin, onClose }: {
  win: Win; active: boolean; narrow: boolean; children: ReactNode; onFocus: () => void; onMove: (x: number, y: number) => void; onResize: (w: number, h: number) => void; onMin: () => void; onClose: () => void
}) {
  const a = meta(win.id)
  const [max, setMax] = useState(false)
  const full = max || narrow
  const drag = (e: PointerEvent) => {
    if (full || (e.target as HTMLElement).closest('button')) return
    const ox = e.clientX - win.x, oy = e.clientY - win.y
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const mv = (ev: globalThis.PointerEvent) => onMove(ev.clientX - ox, Math.max(0, ev.clientY - oy))
    el.addEventListener('pointermove', mv)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', mv), { once: true })
  }
  const grow = (e: PointerEvent) => {
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement, box = el.parentElement!.getBoundingClientRect()
    const sx = e.clientX - box.width, sy = e.clientY - box.height
    el.setPointerCapture(e.pointerId)
    const mv = (ev: globalThis.PointerEvent) => onResize(Math.max(220, ev.clientX - sx), Math.max(160, ev.clientY - sy))
    el.addEventListener('pointermove', mv)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', mv), { once: true })
  }
  return (
    <section role="dialog" aria-label={a.title} onPointerDown={onFocus}
      className={`pop out absolute flex flex-col p-[3px] ${win.min ? 'hidden' : ''}`}
      style={full ? { inset: '0 0 36px 0', zIndex: win.z } : { left: win.x, top: win.y, width: `min(${win.w ?? a.w}px, calc(100% - 16px))`, height: `min(${win.h ?? a.h}px, calc(100% - 50px))`, zIndex: win.z }}>
      <header onPointerDown={drag} onDoubleClick={() => !narrow && setMax((m) => !m)}
        className={`h-[22px] flex items-center gap-1 pl-1 pr-0.5 text-white font-bold select-none touch-none ${full ? '' : 'cursor-move'}`}
        style={{ background: active ? 'var(--title)' : 'linear-gradient(90deg,#808080,#b5b5b5)' }}>
        <span className="text-sm">{a.icon}</span><span className="flex-1 truncate">{a.title}</span>
        {([['_', 'Minimize', onMin], ...(narrow ? [] : [[max ? '❐' : '□', 'Maximize', () => setMax((m) => !m)]]), ['✕', 'Close', onClose]] as [string, string, () => void][]).map(([g, l, f]) => (
          <button key={l} aria-label={l} onClick={f} className={`out w-4 h-3.5 text-[10px] leading-none text-[var(--ink)] flex items-center justify-center ${l === 'Close' ? 'ml-0.5' : ''}`}>{g}</button>
        ))}
      </header>
      <div className="flex-1 min-h-0 mt-[2px] overflow-auto">{children}</div>
      {!full && <div onPointerDown={grow} aria-hidden="true" className="absolute right-0.5 bottom-0.5 w-3.5 h-3.5 cursor-nwse-resize touch-none"
        style={{ background: 'linear-gradient(135deg,transparent 45%,var(--dk) 45% 52%,var(--hi) 52% 60%,transparent 60% 68%,var(--dk) 68% 75%,var(--hi) 75% 83%,transparent 83%)' }} />}
    </section>
  )
}

const rich = (s: string) => s.split(/\*\*(.+?)\*\*/).map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))

function About() {
  return (
    <div className="p-4 flex flex-col items-center text-center gap-3">
      <div className="in p-1 bg-[var(--lo)]"><img src={PROFILE.photo} alt={`Portrait of ${PROFILE.name}`} className="w-40 h-40 object-cover block" /></div>
      <div>
        <h1 className="px text-3xl font-semibold tracking-wide">{PROFILE.name}</h1>
        <p className="text-xs uppercase tracking-[.2em] opacity-70">{PROFILE.role}</p>
      </div>
      <p className="in p-3 text-left leading-relaxed">{rich(PROFILE.bio)}</p>
      <div className="flex flex-wrap justify-center gap-1">{SKILLS.map((s) => <span key={s} className="out px-1.5 text-xs">{s}</span>)}</div>
      <button className="out px-4 py-1" onClick={() => emit({ open: 'resume' })}>📕 View resume</button>
    </div>
  )
}

function Resume() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 p-1">
        <a className="out px-2 py-0.5" href={PROFILE.resume} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
        <a className="out px-2 py-0.5" href={PROFILE.resume} download>⬇ Download</a>
      </div>
      {/* ponytail: pre-rendered PNG of the PDF (pdftoppm) so no browser PDF toolbar; re-render when resume.pdf changes. */}
      <div className="in flex-1 m-1 mt-0 overflow-auto bg-[var(--lo)] p-2"><img src="/resume.png" alt={`Resume of ${PROFILE.name}`} className="w-full block bg-white shadow" /></div>
    </div>
  )
}

function ProjectView({ p }: { p: Project }) {
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="in p-1 bg-[var(--lo)]"><img src={preview(p)} alt={`${p.name} preview`} className="w-full block aspect-[2/1] object-cover bg-white" /></div>
      <div><h2 className="px text-2xl font-semibold">{p.name}</h2><p className="text-xs opacity-70">{p.tagline}</p></div>
      <p className="leading-relaxed">{p.about}</p>
      <fieldset className="border border-[var(--lo)] p-2 pt-1"><legend className="px-1">Tech stack</legend>
        <div className="flex flex-wrap gap-1">{p.stack.map((s) => <span key={s} className="out px-1.5 text-xs">{s}</span>)}</div>
      </fieldset>
      <a className="out self-start px-3 py-1 flex items-center gap-2" href={p.repo} target="_blank" rel="noopener noreferrer"><Logo path={siGithub.path} />View on GitHub</a>
    </div>
  )
}

const openNode = (n: Node) => {
  if (n.type !== 'file') return false
  if (n.app) emit({ open: n.app })
  else if (n.url) window.open(n.url, '_blank', 'noopener')
  else return false
  return true
}
const nodeIcon = (k: string, n: Node) => (n.type === 'dir' ? (k.endsWith('projects') || k === 'games' ? '🗂️' : '📁') : n.icon ?? (n.url ? '🔗' : '📄'))

function Explorer() {
  const [path, setPath] = useState<string[]>(HOME)
  const node = get(path)!
  const items = node.type === 'dir' ? Object.entries(node.children) : []
  const go = (k: string, n: Node) => (n.type === 'dir' ? setPath([...path, k]) : openNode(n))
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 p-1">
        <button className="out px-2 py-0.5 disabled:opacity-50" disabled={!path.length} onClick={() => setPath(path.slice(0, -1))}>⬆ Up</button>
        <div className="in flex-1 px-2 py-0.5 truncate">C:\{path.join('\\')}</div>
      </div>
      <div className="in flex-1 m-1 mt-0 p-2 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] content-start gap-2">
        {items.map(([k, n]) => (
          <button key={k} onDoubleClick={() => go(k, n)} onKeyDown={(e) => e.key === 'Enter' && go(k, n)}
            onClick={() => matchMedia('(pointer:coarse)').matches && go(k, n)}
            className="group flex flex-col items-center gap-1 p-1 focus:outline-none">
            <span className="text-3xl">{nodeIcon(k, n)}</span>
            <span className="text-xs break-all px-0.5 group-focus:bg-[#000080] group-focus:text-white">{k}</span>
          </button>
        ))}
      </div>
      <p className="px-2 pb-1 text-xs opacity-70">{items.length} object(s) · double-click to open</p>
    </div>
  )
}

const HELP = `files     ls [dir]  cd <dir>  cat <file>  open <file>  pwd  tree
about     whoami  neofetch  resume  projects  contact  skills
apps      mines  snake  taskmgr  explorer
system    date  uname [-a]  echo <txt>  history  theme <light|dark>  wallpaper  bsod
          sound <on|off>  cowsay <txt>  sudo <cmd>  clear  exit
tips      Tab autocompletes · ↑/↓ recalls history`
const COMMANDS = ['help', 'ls', 'cd', 'cat', 'open', 'pwd', 'tree', 'whoami', 'neofetch', 'resume', 'projects', 'contact', 'skills', 'mines', 'snake', 'taskmgr', 'explorer', 'date', 'uname', 'echo', 'history', 'theme', 'wallpaper', 'sound', 'cowsay', 'sudo', 'clear', 'exit', 'bsod']

function Terminal() {
  const [cwd, setCwd] = useState<string[]>(HOME)
  const [lines, setLines] = useState<string[]>([`${OS.name} ${OS.version} [Version ${OS.version}.0.2026]`, 'Type `help` for commands.', ''])
  const [input, setInput] = useState('')
  const [hist, setHist] = useState<string[]>([])
  const [hi, setHi] = useState(-1)
  const end = useRef<HTMLDivElement>(null)
  const inp = useRef<HTMLInputElement>(null)
  useEffect(() => end.current?.scrollIntoView(), [lines])
  const prompt = `aaryan@aaryx:${show(cwd)}$ `

  const exec = (cmd: string, args: string[], sudo = false): string => {
    const arg = args[0] ?? ''
    const target = resolve(cwd, arg)
    const n = target ? get(target) : undefined
    switch (cmd) {
      case undefined: case '': return ''
      case 'help': return HELP
      case 'pwd': return '/' + cwd.join('/')
      case 'whoami': return sudo ? 'root (for about 0.3 seconds)' : `aaryan — ${PROFILE.role}, full-stack & security`
      case 'ls': return n?.type === 'dir' ? Object.entries(n.children).map(([k, v]) => (v.type === 'dir' ? k + '/' : k)).join('   ') : `ls: ${arg}: no such directory`
      case 'cd': { const p = arg ? target : HOME; if (p && get(p)?.type === 'dir') { setCwd(p); return '' } return `cd: ${arg}: no such directory` }
      case 'cat': return n?.type === 'file' ? n.body : `cat: ${arg || '(missing)'}: not a file`
      case 'open': return n && openNode(n) ? `opening ${arg}…` : `open: ${arg || '(missing)'}: nothing to open`
      case 'tree': { const walk = (m: Node, pad: string): string[] => m.type === 'dir' ? Object.entries(m.children).flatMap(([k, v]) => [pad + '├─ ' + k + (v.type === 'dir' ? '/' : ''), ...walk(v, pad + '│  ')]) : []; return walk(get(cwd)!, '').join('\n') }
      case 'resume': emit({ open: 'resume' }); return 'opening resume.pdf…'
      case 'projects': return PROJECTS.map((p) => `${p.slug.padEnd(14)} ${p.tagline}  [${p.stack.join(', ')}]`).join('\n') + '\n→ cd ~/projects/<name>'
      case 'contact': return Object.values(CONTACT).map((c) => `${c.label.padEnd(9)} ${c.handle}`).join('\n')
      case 'skills': return SKILLS.join(' · ')
      case 'mines': case 'snake': case 'taskmgr': case 'explorer': emit({ open: cmd }); return `starting ${cmd}…`
      case 'date': return new Date().toString()
      case 'uname': return arg === '-a' ? `${OS.name} aaryx ${OS.version}.0-web #1 SMP ${navigator.platform || 'web'} JavaScript/React` : OS.name
      case 'echo': return args.join(' ')
      case 'history': return hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n')
      case 'theme': if (arg === 'dark' || arg === 'light') { emit({ theme: arg === 'dark' }); return `theme → ${arg}` } return 'usage: theme <light|dark>'
      case 'wallpaper': emit({ wallpaper: true }); return 'fetching a new masterpiece…'
      case 'sound': if (arg === 'on' || arg === 'off') { setSound(arg === 'on'); return `sound ${arg} (tray icon updates on next toggle)` } return `sound is ${sound.on ? 'on' : 'off'}`
      case 'cowsay': { const t = args.join(' ') || 'moo'; return ` ${'_'.repeat(t.length + 2)}\n< ${t} >\n ${'-'.repeat(t.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||` }
      case 'neofetch': return [
        `   █████╗      aaryan@aaryx`, `  ██╔══██╗     ------------`, `  ███████║     OS: ${OS.name} ${OS.version}`,
        `  ██╔══██║     Host: ${PROFILE.name}`, `  ██║  ██║     Role: ${PROFILE.role}`, `  ╚═╝  ╚═╝     Shell: aaryx-sh`,
        `                Projects: ${PROJECTS.length}`, `                Uptime: ${Math.round(performance.now() / 60000)} min`, `                CPU: ${navigator.hardwareConcurrency ?? '?'} threads`,
      ].join('\n')
      case 'bsod': case 'crash': emit({ bsod: '0E : 0028 : C0011E36' }); return ''
      case 'exit': emit({ close: 'terminal' }); return ''
      case 'sudo': {
        if (!args.length) return 'usage: sudo <command>'
        if (args.join(' ').match(/^rm\s+-rf\s+\/?\*?$/)) { setTimeout(() => emit({ bsod: '0D : DEAD : BEEF0000' }), 700); return 'rm: deleting /home/aaryan… /bin… /boot…' }
        if (sudo) return 'already root. calm down.'
        return `[sudo] password for aaryan: ********\n` + (['apt', 'pacman', 'hack', 'shutdown', 'reboot'].includes(args[0]) ? `aaryan is not in the sudoers file. This incident will be reported.` : exec(args[0], args.slice(1), true))
      }
      case 'rm': case 'mv': case 'touch': case 'mkdir': return `${cmd}: read-only file system`
      default: sfx.error(); return `${cmd}: command not found — try \`help\``
    }
  }

  const run = (raw: string) => {
    const [cmd, ...args] = raw.trim().split(/\s+/)
    if (raw.trim()) setHist((h) => [...h, raw.trim()])
    setHi(-1)
    if (cmd === 'clear') return setLines([])
    const res = exec(cmd, args)
    setLines((l) => [...l, prompt + raw, ...(res ? res.split('\n') : [])])
  }
  const complete = () => {
    const parts = input.split(' ')
    const last = parts.at(-1) ?? ''
    let pool: string[]
    if (parts.length === 1) pool = COMMANDS
    else {
      const slash = last.lastIndexOf('/'), base = last.slice(0, slash + 1)
      const d = resolve(cwd, base || '.'), dn = d && get(d)
      pool = dn?.type === 'dir' ? Object.entries(dn.children).map(([k, v]) => base + k + (v.type === 'dir' ? '/' : '')) : []
    }
    const m = pool.filter((c) => c.startsWith(last))
    if (m.length === 1) setInput([...parts.slice(0, -1), m[0]].join(' ') + (m[0].endsWith('/') ? '' : ' '))
    else if (m.length) setLines((l) => [...l, prompt + input, m.join('   ')])
  }

  return (
    <div className="h-full bg-black text-[#33ff66] p-2 text-[18px] leading-tight overflow-auto" style={{ fontFamily: 'VT323, monospace' }} onClick={() => inp.current?.focus()}>
      {lines.map((l, i) => <div key={i} className="whitespace-pre-wrap">{l || '\u00a0'}</div>)}
      <form className="flex" onSubmit={(e) => { e.preventDefault(); run(input); setInput('') }}>
        <label htmlFor="term-in" className="whitespace-pre">{prompt}</label>
        <input id="term-in" ref={inp} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') { e.preventDefault(); complete() }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const i = e.key === 'ArrowUp' ? (hi < 0 ? hist.length - 1 : Math.max(0, hi - 1)) : hi < 0 ? -1 : hi + 1
              const v = i >= 0 && i < hist.length ? i : -1
              setHi(v); setInput(v < 0 ? '' : hist[v])
            }
          }}
          className="flex-1 bg-transparent outline-none caret-[#33ff66]" />
      </form>
      <div ref={end} />
    </div>
  )
}

const Logo = ({ path, color = 'currentColor' }: { path: string; color?: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={color}><path d={path} /></svg>
)
// ponytail: simple-icons dropped LinkedIn at LinkedIn's request, so this is the official "in" mark drawn by hand.
const LinkedIn = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect width="24" height="24" rx="3" fill="#0A66C2" />
    <path fill="#fff" d="M5.3 9.2h2.9V19H5.3zM6.8 4.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10 9.2h2.8v1.3c.4-.8 1.4-1.6 2.9-1.6 3 0 3.6 2 3.6 4.6V19h-2.9v-4.8c0-1.1 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V19H10z" />
  </svg>
)

function Contact() {
  const rows = [
    [<LinkedIn />, CONTACT.linkedin],
    [<Logo path={siGithub.path} color={`#${siGithub.hex}`} />, CONTACT.github],
    [<Logo path={siGmail.path} color={`#${siGmail.hex}`} />, CONTACT.email],
  ] as const
  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="px text-lg">Say hello 👋</p>
      {rows.map(([icon, c]) => (
        <a key={c.label} href={c.url} target="_blank" rel="noopener noreferrer" className="out btn flex items-center gap-3 px-3 py-2">
          <span className="w-5 flex justify-center [&_svg]:dark:brightness-150">{icon}</span><span className="w-16 font-bold">{c.label}</span><span className="truncate opacity-80">{c.handle}</span>
        </a>
      ))}
    </div>
  )
}

function Settings({ dark, setDark, size, setSize, snd, setSnd, wall, shuffle, solid }: {
  dark: boolean; setDark: (d: boolean) => void; size: Size; setSize: (s: Size) => void; snd: boolean; setSnd: (v: boolean) => void; wall: string; shuffle: () => void; solid: () => void
}) {
  return (
    <div className="p-3 flex flex-col gap-3">
      <fieldset className="border border-[var(--lo)] p-2 pt-1">
        <legend className="px-1">Screen resolution</legend>
        {(Object.keys(SIZES) as Size[]).map((s) => (
          <label key={s} className="flex items-center gap-2 py-0.5 capitalize">
            <input type="radio" name="size" checked={size === s} onChange={() => setSize(s)} />{s} <span className="opacity-60 normal-case">({SIZES[s] === '100%' ? 'full width' : SIZES[s]})</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="border border-[var(--lo)] p-2 pt-1">
        <legend className="px-1">Appearance</legend>
        {([['Light', false], ['Dark', true]] as const).map(([l, v]) => (
          <label key={l} className="flex items-center gap-2 py-0.5"><input type="radio" name="theme" checked={dark === v} onChange={() => setDark(v)} />{l} mode</label>
        ))}
        <div className="flex gap-1 mt-1">
          <button className="out px-2 py-0.5" onClick={shuffle}>Random wallpaper</button>
          <button className="out px-2 py-0.5 disabled:opacity-50" disabled={!wall} onClick={solid}>Classic teal</button>
        </div>
      </fieldset>
      <p className="text-xs opacity-70 -mt-2">Wallpaper: {wall || 'Classic teal'}</p>
      <fieldset className="border border-[var(--lo)] p-2 pt-1">
        <legend className="px-1">Sound</legend>
        <label className="flex items-center gap-2 py-0.5"><input type="checkbox" checked={snd} onChange={(e) => setSnd(e.target.checked)} />Clicks & system sounds</label>
      </fieldset>
    </div>
  )
}

function Bsod({ code, onDone }: { code: string; onDone: () => void }) {
  useEffect(() => { document.querySelector<HTMLElement>('[data-bsod]')?.focus() }, [])
  return (
    <div data-bsod tabIndex={-1} role="alertdialog" aria-label="Fatal exception. Press any key to continue." onClick={onDone}
      className="absolute inset-0 z-[10001] bg-[#0000aa] text-[#aaaaaa] flex items-center justify-center p-6 outline-none cursor-none" style={{ fontFamily: 'VT323, monospace' }}>
      <div className="max-w-xl text-xl leading-snug">
        <p className="text-center mb-5"><span className="bg-[#aaaaaa] text-[#0000aa] px-2">{OS.name} {OS.version}</span></p>
        <p>A fatal exception {code} has occurred at 0028:C0034B23 in VXD AARYX(01). The current application will be terminated.</p>
        <p className="mt-4">*  Press any key to terminate the current application.<br />*  Relax — nothing actually broke. This portfolio is read-only.</p>
        <p className="text-center mt-6">Press any key to continue <span className="animate-pulse">_</span></p>
      </div>
    </div>
  )
}

function PowerOff({ onOn }: { onOn: () => void }) {
  return (
    <div className="pop absolute inset-0 z-[10002] bg-black flex flex-col items-center justify-center gap-8 text-center p-6">
      <p className="px text-4xl sm:text-5xl text-[#ffa500] leading-tight">Thank you for visiting.</p>
      <p className="text-white/50 text-sm">It's now safe to close this tab — or turn {OS.name} back on.</p>
      <button onClick={onOn} autoFocus aria-label={`Power on ${OS.name}`}
        className="w-16 h-16 rounded-full border-2 border-white/40 text-3xl text-white/80 hover:text-[#33ff66] hover:border-[#33ff66] focus-visible:outline-2 focus-visible:outline-[#33ff66] transition-colors">⏻</button>
    </div>
  )
}
