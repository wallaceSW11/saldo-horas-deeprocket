import { describe, expect, it } from "vitest"
import { calculateWorkSummary } from "../src/domain/calculations"
import type { UserSettings, WorkEntry, WorkPeriod } from "../src/types"

const period: WorkPeriod = { year: 2026, month: 6 }
const settings: UserSettings = {
  monthlyLimitMinutes: 70 * 60,
  includeSaturday: false,
  includeSunday: false
}

describe("calculateWorkSummary", () => {
  it("calculates remaining average for business days", () => {
    const summary = calculateWorkSummary([], period, settings, new Date(2026, 5, 1))

    expect(summary.remainingDays).toBe(22)
    expect(summary.requiredDailyAverageMinutes).toBe(191)
  })

  it("reduces the average when a long day is already worked", () => {
    const entries: WorkEntry[] = [{ date: "2026-06-01", workedMinutes: 8 * 60 }]
    const summary = calculateWorkSummary(entries, period, settings, new Date(2026, 5, 2))

    expect(summary.workedMinutes).toBe(480)
    expect(summary.remainingMinutes).toBe(3720)
    expect(summary.remainingDays).toBe(21)
    expect(summary.requiredDailyAverageMinutes).toBe(178)
  })

  it("shows positive balance after exceeding the target", () => {
    const entries: WorkEntry[] = [{ date: "2026-06-01", workedMinutes: 72 * 60 }]
    const summary = calculateWorkSummary(entries, period, settings, new Date(2026, 5, 30))

    expect(summary.remainingMinutes).toBe(0)
    expect(summary.extraMinutes).toBe(120)
    expect(summary.requiredDailyAverageMinutes).toBe(0)
  })

  it("includes weekend days only when enabled", () => {
    const weekendSettings = { ...settings, includeSaturday: true, includeSunday: true }
    const summary = calculateWorkSummary([], period, weekendSettings, new Date(2026, 5, 1))

    expect(summary.remainingDays).toBe(30)
  })

  it("counts today when it has no entry yet", () => {
    const mayPeriod: WorkPeriod = { year: 2026, month: 5 }
    const saturdaySettings = { ...settings, includeSaturday: true }
    const summary = calculateWorkSummary([], mayPeriod, saturdaySettings, new Date(2026, 4, 18))

    expect(summary.remainingDays).toBe(12)
  })

  it("does not count today when it already has an entry", () => {
    const mayPeriod: WorkPeriod = { year: 2026, month: 5 }
    const saturdaySettings = { ...settings, includeSaturday: true }
    const entries: WorkEntry[] = [{ date: "2026-05-18", workedMinutes: 8 * 60 }]
    const summary = calculateWorkSummary(entries, mayPeriod, saturdaySettings, new Date(2026, 4, 18))

    expect(summary.remainingDays).toBe(11)
  })
})
