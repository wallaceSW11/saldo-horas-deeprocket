import type { UserSettings, WorkEntry, WorkPeriod, WorkSummary } from "~/types"
import { getRemainingWorkDays } from "~/domain/calendar"

export function calculateWorkSummary(
  entries: WorkEntry[],
  period: WorkPeriod,
  settings: UserSettings,
  today = new Date()
): WorkSummary {
  const workedMinutes = entries.reduce((sum, entry) => sum + entry.workedMinutes, 0)
  const balanceMinutes = settings.monthlyLimitMinutes - workedMinutes
  const remainingMinutes = Math.max(balanceMinutes, 0)
  const extraMinutes = Math.max(-balanceMinutes, 0)
  const remainingDays = getRemainingWorkDays({
    period,
    entries,
    includeSaturday: settings.includeSaturday,
    includeSunday: settings.includeSunday,
    today
  })
  const requiredDailyAverageMinutes =
    remainingMinutes > 0 && remainingDays > 0 ? Math.ceil(remainingMinutes / remainingDays) : 0

  return {
    workedMinutes,
    targetMinutes: settings.monthlyLimitMinutes,
    remainingMinutes,
    extraMinutes,
    remainingDays,
    requiredDailyAverageMinutes
  }
}
