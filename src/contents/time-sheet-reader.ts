import type { PlasmoCSConfig } from "plasmo"
import { parseWorkDataFromDocument } from "~/parsing/pageParser"

export const config: PlasmoCSConfig = {
  matches: ["https://backoffice.deeprocket.com.br/*"]
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "READ_WORK_ENTRIES") {
    return false
  }

  sendResponse(parseWorkDataFromDocument(document))
  return true
})
