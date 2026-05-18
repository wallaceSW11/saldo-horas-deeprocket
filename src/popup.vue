<template>
  <main class="popup">
    <header class="header">
      <div>
        <p class="eyebrow">Saldo mensal</p>
        <h1>Horas trabalhadas</h1>
      </div>
      <button class="icon-button" type="button" title="Atualizar" @click="refresh" :disabled="loading">
        ↻
      </button>
    </header>

    <section class="settings">
      <label class="field">
        <span>Carga permitida</span>
        <input v-model="monthlyLimit" inputmode="numeric" placeholder="70:00" @change="saveSettings" />
      </label>

      <label class="check">
        <input v-model="settings.includeSaturday" type="checkbox" @change="saveSettings" />
        <span>Considerar sabado</span>
      </label>

      <label class="check">
        <input v-model="settings.includeSunday" type="checkbox" @change="saveSettings" />
        <span>Considerar domingo</span>
      </label>
    </section>

    <p v-if="error" class="message error">{{ error }}</p>
    <p v-else-if="loading" class="message">Lendo lancamentos da pagina...</p>
    <p v-else-if="!summary" class="message">Nenhum dado encontrado na pagina atual.</p>

    <section v-if="summary" class="metrics">
      <article class="metric">
        <span>Ja feito</span>
        <strong>{{ formatMinutes(summary.workedMinutes) }}</strong>
      </article>
      <article class="metric">
        <span>{{ summary.extraMinutes > 0 ? "Saldo positivo" : "Falta" }}</span>
        <strong :class="{ positive: summary.extraMinutes > 0 }">
          {{ summary.extraMinutes > 0 ? "+" + formatMinutes(summary.extraMinutes) : formatMinutes(summary.remainingMinutes) }}
        </strong>
      </article>
      <article class="metric">
        <span>Media por dia</span>
        <strong>{{ formatMinutes(summary.requiredDailyAverageMinutes) }}</strong>
      </article>
      <article class="metric">
        <span>Dias restantes</span>
        <strong>{{ summary.remainingDays }}</strong>
      </article>
    </section>

    <footer v-if="periodLabel" class="footer">
      Competencia {{ periodLabel }}
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import { Storage } from "@plasmohq/storage"
import { calculateWorkSummary } from "~/domain/calculations"
import { inferPeriodFromEntries } from "~/domain/calendar"
import { formatMinutes, parseTimeToMinutes } from "~/domain/time"
import type { ExtractedWorkData, UserSettings, WorkSummary } from "~/types"

const storage = new Storage()
const DEFAULT_SETTINGS: UserSettings = {
  monthlyLimitMinutes: 70 * 60,
  includeSaturday: false,
  includeSunday: false
}

const settings = reactive<UserSettings>({ ...DEFAULT_SETTINGS })
const monthlyLimit = ref(formatMinutes(DEFAULT_SETTINGS.monthlyLimitMinutes))
const extractedData = ref<ExtractedWorkData | null>(null)
const loading = ref(false)
const error = ref("")

const summary = computed<WorkSummary | null>(() => {
  const data = extractedData.value
  const period = data?.period ?? inferPeriodFromEntries(data?.entries ?? [])

  if (!data || !period || data.entries.length === 0) {
    return null
  }

  return calculateWorkSummary(data.entries, period, settings)
})

const periodLabel = computed(() => {
  const period = extractedData.value?.period ?? inferPeriodFromEntries(extractedData.value?.entries ?? [])
  return period ? `${String(period.month).padStart(2, "0")}/${period.year}` : ""
})

onMounted(async () => {
  await loadSettings()
  await refresh()
})

async function loadSettings() {
  const saved = await storage.get<UserSettings>("settings")
  Object.assign(settings, DEFAULT_SETTINGS, saved)
  monthlyLimit.value = formatMinutes(settings.monthlyLimitMinutes)
}

async function saveSettings() {
  const parsedLimit = parseTimeToMinutes(monthlyLimit.value)
  if (parsedLimit === null || parsedLimit <= 0) {
    monthlyLimit.value = formatMinutes(settings.monthlyLimitMinutes)
    return
  }

  settings.monthlyLimitMinutes = parsedLimit
  monthlyLimit.value = formatMinutes(parsedLimit)
  await storage.set("settings", { ...settings })
}

async function refresh() {
  loading.value = true
  error.value = ""

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      throw new Error("Nao foi possivel identificar a aba ativa.")
    }

    extractedData.value = await chrome.tabs.sendMessage(tab.id, { type: "READ_WORK_ENTRIES" })
  } catch {
    extractedData.value = null
    error.value = "Nao consegui ler a pagina atual. Recarregue a pagina e tente novamente."
  } finally {
    loading.value = false
  }
}
</script>

<style>
body {
  margin: 0;
}
</style>

<style scoped>
.popup {
  width: 360px;
  min-height: 440px;
  box-sizing: border-box;
  padding: 18px;
  color: #17202a;
  background: #f7f8fa;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #5d6d7e;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.icon-button {
  width: 36px;
  height: 36px;
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  color: #17202a;
  background: #ffffff;
  cursor: pointer;
  font-size: 18px;
}

.icon-button:disabled {
  cursor: progress;
  opacity: 0.6;
}

.settings {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.field {
  display: grid;
  gap: 6px;
  color: #34495e;
  font-size: 13px;
  font-weight: 700;
}

.field input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  padding: 10px 12px;
  color: #17202a;
  background: #ffffff;
  font-size: 16px;
}

.check {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #2c3e50;
  font-size: 14px;
}

.check input {
  width: 16px;
  height: 16px;
}

.message {
  margin: 14px 0;
  border: 1px solid #d8dee6;
  border-radius: 8px;
  padding: 12px;
  color: #415164;
  background: #ffffff;
  font-size: 14px;
}

.error {
  border-color: #f2b8b5;
  color: #8a1f17;
  background: #fff5f5;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metric {
  display: grid;
  gap: 8px;
  min-height: 82px;
  box-sizing: border-box;
  border: 1px solid #d8dee6;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.metric span {
  color: #5d6d7e;
  font-size: 12px;
  font-weight: 700;
}

.metric strong {
  align-self: end;
  color: #17202a;
  font-size: 24px;
  line-height: 1;
}

.metric strong.positive {
  color: #137a45;
}

.footer {
  margin-top: 14px;
  color: #5d6d7e;
  font-size: 12px;
  text-align: center;
}
</style>
