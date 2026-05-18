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
})
