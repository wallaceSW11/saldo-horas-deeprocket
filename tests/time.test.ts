import { describe, expect, it } from "vitest"
import { formatMinutes, parseTimeToMinutes } from "../src/domain/time"

describe("time helpers", () => {
  it("parses HH:mm values", () => {
    expect(parseTimeToMinutes("70:00")).toBe(4200)
    expect(parseTimeToMinutes("03:20")).toBe(200)
    expect(parseTimeToMinutes("8:00")).toBe(480)
  })

  it("parses textual hour values", () => {
    expect(parseTimeToMinutes("8h")).toBe(480)
    expect(parseTimeToMinutes("8h 30m")).toBe(510)
  })

  it("rejects invalid values", () => {
    expect(parseTimeToMinutes("8:90")).toBeNull()
    expect(parseTimeToMinutes("abc")).toBeNull()
  })

  it("formats minutes as HH:mm", () => {
    expect(formatMinutes(200)).toBe("03:20")
    expect(formatMinutes(4200)).toBe("70:00")
  })
})
