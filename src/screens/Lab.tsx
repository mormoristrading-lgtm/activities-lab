import { useState } from 'react'
import Screen from '../components/Screen'
import SegmentedControl from '../components/SegmentedControl'
import Goals from './lab/Goals'
import StrengthReport from './lab/StrengthReport'
import WeeklyReview from './lab/WeeklyReview'
import Journal from './lab/Journal'
import Principles from './lab/Principles'
import StravaSync from './lab/StravaSync'
import Reminders from './lab/Reminders'
import MotivationEditor from './lab/MotivationEditor'

// Daily standards live on Today, and full Settings is one tap away from the
// gear icon on every screen — neither needs a second copy here.
type LabSegment = 'progress' | 'setup'

export default function Lab() {
  const [segment, setSegment] = useState<LabSegment>('progress')

  return (
    <Screen eyebrow="Lab" title="Lab">
      <div className="mb-4">
        <SegmentedControl
          ariaLabel="Lab section"
          segments={[
            { key: 'progress', label: 'Progress' },
            { key: 'setup', label: 'Setup' },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </div>

      {segment === 'progress' && (
        <div className="space-y-4">
          <Goals />
          <StrengthReport />
          <WeeklyReview />
          <Journal />
        </div>
      )}

      {segment === 'setup' && (
        <div className="space-y-4">
          <Principles />
          <Reminders />
          <MotivationEditor />
          <StravaSync />
        </div>
      )}
    </Screen>
  )
}
