import type { WorkEntry, WorkPeriod } from "~/types"

export type RemainingDayOptions = {
  period: WorkPeriod
  includeSaturday: boolean
  includeSunday: boolean
  today?: Date
}

export function getRemainingWorkDays(options: RemainingDayOptions): number {
  const today = options.today ?? new Date()
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const periodMonthIndex = options.period.month - 1
  const endDate = new Date(options.period.year, periodMonthIndex + 1, 0)
  const isCurrentPeriod =
    todayAtMidnight.getFullYear() === options.period.year && todayAtMidnight.getMonth() === periodMonthIndex

  if (endDate < todayAtMidnight) {
    return 0
  }

  const startDate = isCurrentPeriod
    ? new Date(todayAtMidnight.getFullYear(), todayAtMidnight.getMonth(), todayAtMidnight.getDate() + 1)
    : new Date(options.period.year, periodMonthIndex, 1)

  if (startDate > endDate) {
    return 0
  }

  let count = 0
  for (const current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
    if (isAllowedWeekday(current, options.includeSaturday, options.includeSunday)) {
      count += 1
    }
  }

  return count
}

export function inferPeriodFromEntries(entries: WorkEntry[]): WorkPeriod | null {
  if (entries.length === 0) {
    return null
  }

  const [year, month] = entries[0].date.split("-").map(Number)
  if (!year || !month) {
    return null
  }

  return { year, month }
}

function isAllowedWeekday(date: Date, includeSaturday: boolean, includeSunday: boolean): boolean {
  const day = date.getDay()

  if (day === 0) {
    return includeSunday
  }

  if (day === 6) {
    return includeSaturday
  }

  return true
}
