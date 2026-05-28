import type { ExtractedWorkData, WorkEntry, WorkPeriod } from "~/types"
import { inferPeriodFromEntries } from "~/domain/calendar"
import { parseTimeToMinutes } from "~/domain/time"

const DATE_PATTERN = /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/
const TIME_PATTERN =
  /\b(\d{1,4}:[0-5]\d|\d{1,4}\s*h(?:oras?)?(?:\s*\d{1,2}\s*m(?:in(?:utos?)?)?)?|\d{1,2}\s*m(?:in(?:utos?)?)?)\b/i
const MONTH_YEAR_PATTERN = /\b(?:compet[eê]ncia|periodo|per[ií]odo|m[eê]s)\D{0,20}(\d{1,2})[\/.-](\d{4})\b/i
const MONTH_NAME_YEAR_PATTERN =
  /\b(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/i
const MONTH_NAMES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  "março": 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12
}

const ROW_SELECTORS = [
  ".day-header",
  "[data-work-entry]",
  "[data-lancamento]",
  "[data-date]",
  "tr",
  ".lancamento",
  ".lancamento-horario",
  ".work-entry"
]

const TIME_SELECTORS = [
  ".day-summary .has-records span",
  ".day-summary span",
  ".has-records span",
  "[data-worked-time]",
  "[data-worked-minutes]",
  ".horas-trabalhadas",
  ".total-horas",
  ".worked-hours",
  ".total"
]

export function parseWorkDataFromDocument(documentRef: Document): ExtractedWorkData {
  const entries = dedupeEntries(parseRows(documentRef))
  const text = documentRef.body?.innerText ?? ""

  return {
    period: inferPeriodFromText(text) ?? inferPeriodFromEntries(entries),
    entries
  }
}

export function parseWorkDataFromText(text: string, defaultYear = new Date().getFullYear()): ExtractedWorkData {
  const entries = dedupeEntries(
    text
      .split(/\r?\n/)
      .map((line) => parseEntryFromText(line, defaultYear))
      .filter((entry): entry is WorkEntry => entry !== null)
  )

  return {
    period: inferPeriodFromText(text) ?? inferPeriodFromEntries(entries),
    entries
  }
}

function parseRows(documentRef: Document): WorkEntry[] {
  const rows = Array.from(documentRef.querySelectorAll(ROW_SELECTORS.join(",")))
  const currentYear = new Date().getFullYear()

  return rows
    .map((row) => parseEntryFromElement(row, currentYear))
    .filter((entry): entry is WorkEntry => entry !== null)
}

function parseEntryFromElement(element: Element, defaultYear: number): WorkEntry | null {
  const dateSource =
    element.getAttribute("data-work-date") ??
    element.getAttribute("data-date") ??
    element.querySelector(".day-date")?.textContent?.trim() ??
    element.textContent ??
    ""
  const date = parseDateToIso(dateSource, defaultYear)
  if (!date) {
    return null
  }

  const explicitMinutes = element.getAttribute("data-worked-minutes")
  if (explicitMinutes && /^\d+$/.test(explicitMinutes)) {
    return { date, workedMinutes: Number(explicitMinutes) }
  }

  const explicitTime =
    element.getAttribute("data-worked-time") ??
    TIME_SELECTORS.map((selector) => element.querySelector(selector)?.textContent?.trim()).find(Boolean)
  const workedMinutes = parseWorkedMinutes(explicitTime ?? element.textContent ?? "")

  return workedMinutes === null ? null : { date, workedMinutes }
}

function parseEntryFromText(text: string, defaultYear: number): WorkEntry | null {
  const date = parseDateToIso(text, defaultYear)
  const workedMinutes = parseWorkedMinutes(text)

  return date && workedMinutes !== null ? { date, workedMinutes } : null
}

function parseWorkedMinutes(text: string): number | null {
  const candidates = Array.from(text.matchAll(new RegExp(TIME_PATTERN, "gi"))).map((match) => match[1])

  for (const candidate of candidates.reverse()) {
    const minutes = parseTimeToMinutes(candidate)
    if (minutes !== null) {
      return minutes
    }
  }

  return null
}

function parseDateToIso(text: string, defaultYear: number): string | null {
  const match = text.match(DATE_PATTERN)
  if (!match) {
    return null
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const rawYear = match[3] ? Number(match[3]) : defaultYear
  const year = rawYear < 100 ? 2000 + rawYear : rawYear
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function inferPeriodFromText(text: string): WorkPeriod | null {
  const numericMatch = text.match(MONTH_YEAR_PATTERN)
  if (numericMatch) {
    const month = Number(numericMatch[1])
    const year = Number(numericMatch[2])

    return month >= 1 && month <= 12 ? { year, month } : null
  }

  const monthNameMatch = text.match(MONTH_NAME_YEAR_PATTERN)
  if (!monthNameMatch) {
    return null
  }

  const normalizedMonth = monthNameMatch[1].toLowerCase().normalize("NFC")
  const month = MONTH_NAMES[normalizedMonth]
  const year = Number(monthNameMatch[2])

  return month ? { year, month } : null
}

function dedupeEntries(entries: WorkEntry[]): WorkEntry[] {
  const byDate = new Map<string, WorkEntry>()

  for (const entry of entries) {
    byDate.set(entry.date, entry)
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}
