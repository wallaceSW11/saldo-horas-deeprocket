const HOUR_MINUTES = 60

export function parseTimeToMinutes(input: string): number | null {
  const normalized = input.trim().toLowerCase()

  const colonMatch = normalized.match(/^(\d{1,4}):([0-5]\d)$/)
  if (colonMatch) {
    return Number(colonMatch[1]) * HOUR_MINUTES + Number(colonMatch[2])
  }

  const hourTextMatch = normalized.match(/^(\d{1,4})\s*h(?:oras?)?(?:\s*(\d{1,2})\s*m(?:in(?:utos?)?)?)?$/)
  if (hourTextMatch) {
    const minutes = hourTextMatch[2] ? Number(hourTextMatch[2]) : 0
    if (minutes > 59) {
      return null
    }

    return Number(hourTextMatch[1]) * HOUR_MINUTES + minutes
  }

  const minuteTextMatch = normalized.match(/^(\d{1,2})\s*m(?:in(?:utos?)?)?$/)
  if (minuteTextMatch) {
    const minutes = Number(minuteTextMatch[1])
    return minutes <= 59 ? minutes : null
  }

  return null
}

export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : ""
  const absoluteMinutes = Math.abs(Math.round(totalMinutes))
  const hours = Math.floor(absoluteMinutes / HOUR_MINUTES)
  const minutes = absoluteMinutes % HOUR_MINUTES

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}
