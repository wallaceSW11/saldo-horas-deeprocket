import { describe, expect, it } from "vitest"
import { parseWorkDataFromText } from "../src/parsing/pageParser"

describe("parseWorkDataFromText", () => {
  it("extracts period and daily totals from plain text", () => {
    const data = parseWorkDataFromText(
      `
      Competencia 06/2026
      01/06/2026 Total 08:00
      02/06/2026 Total 03:20
      `
    )

    expect(data.period).toEqual({ year: 2026, month: 6 })
    expect(data.entries).toEqual([
      { date: "2026-06-01", workedMinutes: 480 },
      { date: "2026-06-02", workedMinutes: 200 }
    ])
  })

  it("deduplicates by date using the last found value", () => {
    const data = parseWorkDataFromText(
      `
      01/06/2026 Total 02:00
      01/06/2026 Total 03:00
      `
    )

    expect(data.entries).toEqual([{ date: "2026-06-01", workedMinutes: 180 }])
  })

  it("extracts the current site format with Portuguese month and hour labels", () => {
    const data = parseWorkDataFromText(
      `
      Selecionar Periodo: Maio de 2026 (Atual)
      Registro de Horas
      Maio 2026
      40h trabalhadas
      1 sex. 01/05/2026 7h 35min
      2 sab. 02/05/2026 2h
      3 dom. 03/05/2026
      4 seg. 04/05/2026 4h 30min
      `
    )

    expect(data.period).toEqual({ year: 2026, month: 5 })
    expect(data.entries).toEqual([
      { date: "2026-05-01", workedMinutes: 455 },
      { date: "2026-05-02", workedMinutes: 120 },
      { date: "2026-05-04", workedMinutes: 270 }
    ])
  })

  it("includes minute-only entries from the current site format", () => {
    const data = parseWorkDataFromText(
      `
      Selecionar Periodo: Maio de 2026 (Atual)
      1 sex. 01/05/2026 7h 35min
      2 sáb. 02/05/2026 2h
      3 dom. 03/05/2026
      4 seg. 04/05/2026 4h 30min
      5 ter. 05/05/2026 1h 55min
      6 qua. 06/05/2026 2h 45min
      7 qui. 07/05/2026 3h
      8 sex. 08/05/2026 1h 35min
      9 sáb. 09/05/2026 1h 45min
      10 dom. 10/05/2026
      11 seg. 11/05/2026
      12 ter. 12/05/2026 1h 25min
      13 qua. 13/05/2026 1h 5min
      14 qui. 14/05/2026 3h 15min
      15 sex. 15/05/2026 4h 20min
      16 sáb. 16/05/2026 3h 50min
      17 dom. 17/05/2026
      18 seg. 18/05/2026 4h 50min
      19 ter. 19/05/2026 1h
      20 qua. 20/05/2026 1h 30min
      21 qui. 21/05/2026 1h 45min
      22 sex. 22/05/2026 2h 55min
      23 sáb. 23/05/2026 2h
      24 dom. 24/05/2026
      25 seg. 25/05/2026 2h 5min
      26 ter. 26/05/2026
      27 qua. 27/05/2026 2h 15min
      28 qui. 28/05/2026 Hoje 45min
      29 sex. 29/05/2026
      30 sáb. 30/05/2026
      31 dom. 31/05/2026
      `
    )

    expect(data.entries.reduce((sum, entry) => sum + entry.workedMinutes, 0)).toBe(58 * 60 + 5)
    expect(data.entries).toContainEqual({ date: "2026-05-28", workedMinutes: 45 })
  })
})
