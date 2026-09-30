import type React from 'react'
import { useEffect, useState } from 'react'

// Browsers only expose a sandboxed slice of hardware info; each value is labeled with its real source.
type Nav = Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; downlink?: number; rtt?: number }; getBattery?: () => Promise<{ level: number; charging: boolean }> }
const nav = navigator as Nav
const gpu = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    return (ext && gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || 'Unavailable'
  } catch { return 'Unavailable' }
})()
const gb = (b: number) => (b / 1024 ** 3).toFixed(2) + ' GB'

export function TaskManager({ procs, onEnd }: { procs: { id: string; title: string; icon: React.ReactNode }[]; onEnd: (id: string) => void }) {
  const [tab, setTab] = useState<'perf' | 'apps'>('perf')
  const [cpu, setCpu] = useState<number[]>(Array(40).fill(0))
  const [store, setStore] = useState<{ usage?: number; quota?: number }>({})
  const [bat, setBat] = useState<string>()
  const [heap, setHeap] = useState<number>()
  const [fps, setFps] = useState<number>()

  useEffect(() => {
    navigator.storage?.estimate().then(setStore)
    nav.getBattery?.().then((b) => setBat(`${Math.round(b.level * 100)}%${b.charging ? ' (charging)' : ''}`))
    // No web API exposes CPU %. Real measurement instead: frames that overrun 50ms (the browser's
    // own "long task" threshold) = time this tab's main thread was blocked. No random noise.
    let raf = 0, prev = performance.now(), start = prev, frames = 0, busy = 0
    const tick = (now: number) => {
      const gap = now - prev; prev = now; frames++
      if (gap > 50) busy += gap - 16.7
      if (now - start >= 1000) {
        if (!document.hidden) {
          setCpu((c) => [...c.slice(1), Math.min(100, Math.round((busy / (now - start)) * 100))])
          setFps(Math.round((frames * 1000) / (now - start)))
        }
        start = now; frames = 0; busy = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const i = setInterval(() => {
      const m = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      if (m) setHeap(m.usedJSHeapSize)
    }, 1000)
    return () => { clearInterval(i); cancelAnimationFrame(raf) }
  }, [])

  const conn = nav.connection
  const rows: [string, string, string][] = [
    ['CPU', `${navigator.hardwareConcurrency ?? '?'} logical cores`, 'navigator.hardwareConcurrency'],
    ['RAM', nav.deviceMemory ? (nav.deviceMemory >= 8 ? '8 GB or more (browser caps the value at 8)' : `~${nav.deviceMemory} GB (rounded by browser)`) : 'Hidden by browser', 'navigator.deviceMemory'],
    ['Frame rate', fps ? `${fps} FPS` : 'Measuring…', 'requestAnimationFrame'],
    ['Tab memory', heap ? gb(heap) : 'Hidden by browser', 'performance.memory'],
    ['GPU', String(gpu), 'WebGL renderer'],
    ['Storage', store.quota ? `${gb(store.usage ?? 0)} used of ${gb(store.quota)} site quota` : 'Unavailable', 'navigator.storage'],
    ['Network', conn ? `${conn.effectiveType ?? '?'} · ${conn.downlink ?? '?'} Mbps · ${conn.rtt ?? '?'} ms` : navigator.onLine ? 'Online' : 'Offline', 'navigator.connection'],
    ['Battery', bat ?? 'Unavailable', 'navigator.getBattery'],
  ]
  const pts = cpu.map((v, i) => `${(i / 39) * 100},${100 - v}`).join(' ')

  return (
    <div className="h-full flex flex-col p-2 gap-2">
      <div role="tablist" className="flex gap-0.5 -mb-2 relative z-10">
        {([['perf', 'Performance'], ['apps', 'Applications']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`out px-3 py-1 ${tab === k ? 'pb-1.5 -mb-0.5' : 'mt-0.5'}`}>{l}</button>
        ))}
      </div>
      <div className="out flex-1 min-h-0 p-2 overflow-auto">
        {tab === 'perf' ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-stretch">
              <div className="in bg-black w-24 flex flex-col items-center justify-center text-[#00ff00]" style={{ fontFamily: 'VT323, monospace' }}>
                <span className="text-3xl">{cpu.at(-1)}%</span><span className="text-xs text-[#00ff00]/70">TAB LOAD</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="in bg-black flex-1 h-24"
                style={{ backgroundImage: 'linear-gradient(#008000 1px,transparent 1px),linear-gradient(90deg,#008000 1px,transparent 1px)', backgroundSize: '12px 12px' }}>
                <polyline points={pts} fill="none" stroke="#00ff00" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <table className="in w-full text-xs"><tbody>
              {rows.map(([k, v, src]) => (
                <tr key={k} className="border-b border-[var(--face)]"><td className="p-1.5 font-bold w-24 align-top">{k}</td><td className="p-1.5 break-words">{v}<div className="opacity-50">{src}</div></td></tr>
              ))}
            </tbody></table>
            <p className="text-[11px] opacity-70">All values are measured live in your browser. Load = how busy this tab is, not your whole PC. Websites can't read system-wide CPU/GPU %, total RAM, disk size or Wi-Fi name; browsers block that for privacy. Storage is this site's quota, not your disk.</p>
          </div>
        ) : (
          <ul className="in min-h-40">
            {procs.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-2 py-1 hover:bg-[#000080] hover:text-white">
                <span>{p.icon}</span><span className="flex-1">{p.title}</span><span className="text-xs opacity-70">Running</span>
                {p.id !== 'taskmgr' && <button className="out px-2 text-xs text-[var(--ink)]" onClick={() => onEnd(p.id)}>End Task</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
