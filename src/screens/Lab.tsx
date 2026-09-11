import Screen from '../components/Screen'
import Standards from './lab/Standards'
import WeeklyReview from './lab/WeeklyReview'
import Goals from './lab/Goals'
import StrengthReport from './lab/StrengthReport'
import Journal from './lab/Journal'
import Principles from './lab/Principles'
import Settings from './lab/Settings'
import StravaSync from './lab/StravaSync'
import Reminders from './lab/Reminders'
import MotivationEditor from './lab/MotivationEditor'

export default function Lab() {
  return (
    <Screen eyebrow="Lab" title="Lab">
      <div className="space-y-4">
        <Standards />
        <Goals />
        <StrengthReport />
        <WeeklyReview />
        <Journal />
        <Principles />
        <Reminders />
        <MotivationEditor />
        <Settings />
        <StravaSync />
      </div>
    </Screen>
  )
}
