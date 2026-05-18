export type WorkEntry = {
  date: string
  workedMinutes: number
}

export type WorkPeriod = {
  year: number
  month: number
}

export type ExtractedWorkData = {
  period: WorkPeriod | null
  entries: WorkEntry[]
}

export type UserSettings = {
  monthlyLimitMinutes: number
  includeSaturday: boolean
  includeSunday: boolean
}

export type WorkSummary = {
  workedMinutes: number
  targetMinutes: number
  remainingMinutes: number
  extraMinutes: number
  remainingDays: number
  requiredDailyAverageMinutes: number
}
