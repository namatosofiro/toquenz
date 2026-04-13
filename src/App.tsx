import { useState } from 'react'
import { useSession } from './store/session'
import Chat from './components/Chat'
import MetricsDashboard from './components/MetricsDashboard'
import PolicyConfig from './components/PolicyConfig'
import Settings from './components/Settings'

type Tab = 'chat' | 'metrics' | 'policy' | 'settings'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'chat',     label: 'CHAT' },
  { id: 'metrics',  label: 'METRICS' },
  { id: 'policy',   label: 'POLICY' },
  { id: 'settings', label: 'SETTINGS' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('chat')
  const { metrics, policy, config, setPolicy, setConfig, clearSession, exportSession } = useSession()

  function handleExport() {
    const data = exportSession()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `toquenz-session-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalSaved = metrics.totalOriginalTokens - metrics.totalCompressedTokens

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-mono">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold text-sm tracking-widest">TOQUENZ</span>
          <span className="text-gray-700 text-xs">v0.1.0</span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-500">token optimizer</span>
        </div>

        {/* Live stats */}
        {metrics.turns.length > 0 && (
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-gray-500">
              saved <span className="text-green-400">{totalSaved.toLocaleString()}</span> tok
            </span>
            <span className="text-gray-500">
              <span className="text-green-400">{metrics.totalSavings.toFixed(1)}%</span> reduction
            </span>
            <span className="text-gray-500">
              CO₂ <span className="text-emerald-400">{metrics.totalCo2SavedGrams.toFixed(3)}g</span>
            </span>
            <span className="text-gray-500">
              H₂O <span className="text-blue-400">{metrics.totalWaterSavedMl.toFixed(3)}mL</span>
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="text-xs px-2 py-1 border border-gray-700 rounded text-gray-400
              hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            EXPORT JSON
          </button>
          <button
            onClick={clearSession}
            className="text-xs px-2 py-1 border border-gray-700 rounded text-gray-600
              hover:border-red-500/40 hover:text-red-400 transition-colors"
          >
            CLEAR
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-gray-800 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-xs font-semibold tracking-widest transition-colors border-b-2
              ${tab === t.id
                ? 'text-green-400 border-green-400'
                : 'text-gray-600 border-transparent hover:text-gray-400'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'chat' && <Chat />}

        {tab === 'metrics' && (
          <div className="h-full overflow-y-auto p-6">
            {metrics.turns.length === 0
              ? <div className="text-gray-600 text-sm">No turns yet. Start a conversation.</div>
              : <MetricsDashboard metrics={metrics} />
            }
          </div>
        )}

        {tab === 'policy' && (
          <div className="h-full overflow-y-auto p-6 max-w-xl">
            <PolicyConfig policy={policy} onChange={setPolicy} />
          </div>
        )}

        {tab === 'settings' && (
          <div className="h-full overflow-y-auto p-6 max-w-xl">
            <Settings config={config} onChange={setConfig} />
          </div>
        )}
      </main>
    </div>
  )
}
