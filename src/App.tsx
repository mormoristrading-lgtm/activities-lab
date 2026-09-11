import { lazy, Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { applyTheme, applyZoom, DEFAULT_ZOOM, isThemeName } from './lib/theme'
import BottomNav, { type TabKey } from './components/BottomNav'
import LockGate from './components/LockGate'
import PWAUpdater from './components/PWAUpdater'
import SettingsLauncher from './components/SettingsLauncher'
import Today from './screens/Today'
import Train, { type TrainSegment } from './screens/Train'
import Fuel from './screens/Fuel'

// Progress (Recharts) and Lab (react-markdown) are heavy — load on demand.
const Progress = lazy(() => import('./screens/Progress'))
const Lab = lazy(() => import('./screens/Lab'))

export default function App() {
  const [tab, setTab] = useState<TabKey>('today')
  const [trainSegment, setTrainSegment] = useState<TrainSegment>('program')

  // Live-apply theme + zoom whenever the user changes them in Settings.
  const themeSetting = useLiveQuery(() => db.settings.get('theme'), [])
  const zoomSetting = useLiveQuery(() => db.settings.get('zoomPercent'), [])
  useEffect(() => {
    const v = themeSetting?.value
    applyTheme(isThemeName(v) ? v : 'terra')
  }, [themeSetting])
  useEffect(() => {
    const v = zoomSetting?.value
    applyZoom(typeof v === 'number' ? v : DEFAULT_ZOOM)
  }, [zoomSetting])

  function goToSession() {
    setTrainSegment('session')
    setTab('train')
  }

  return (
    <LockGate>
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <PWAUpdater />
      <SettingsLauncher />
      <main
        className="px-4"
        style={{
          paddingTop: 'calc(var(--safe-top) + 1.25rem)',
          paddingBottom: 'calc(var(--safe-bottom) + 5.5rem)',
        }}
      >
        {tab === 'today' && <Today onStartSession={goToSession} />}
        {tab === 'train' && <Train segment={trainSegment} onSegmentChange={setTrainSegment} />}
        {tab === 'fuel' && <Fuel />}
        {tab === 'progress' && (
          <Suspense fallback={<p className="mx-auto max-w-xl" style={{ color: 'var(--muted)' }}>Loading…</p>}>
            <Progress />
          </Suspense>
        )}
        {tab === 'lab' && (
          <Suspense fallback={<p className="mx-auto max-w-xl" style={{ color: 'var(--muted)' }}>Loading…</p>}>
            <Lab />
          </Suspense>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
    </LockGate>
  )
}
