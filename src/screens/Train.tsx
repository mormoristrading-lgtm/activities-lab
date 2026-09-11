import Screen from '../components/Screen'
import SegmentedControl, { type Segment } from '../components/SegmentedControl'
import Program from './train/Program'
import Library from './train/Library'
import SessionLogger from './train/SessionLogger'

export type TrainSegment = 'program' | 'session' | 'library'

const SEGMENTS: Segment<TrainSegment>[] = [
  { key: 'program', label: 'Program' },
  { key: 'session', label: 'Session' },
  { key: 'library', label: 'Library' },
]

export default function Train({
  segment,
  onSegmentChange,
}: {
  segment: TrainSegment
  onSegmentChange: (s: TrainSegment) => void
}) {
  return (
    <Screen eyebrow="Train" title="Train">
      <SegmentedControl
        ariaLabel="Train section"
        segments={SEGMENTS}
        value={segment}
        onChange={onSegmentChange}
      />

      <div className="mt-4">
        {segment === 'program' && <Program />}
        {segment === 'session' && <SessionLogger />}
        {segment === 'library' && <Library />}
      </div>
    </Screen>
  )
}
