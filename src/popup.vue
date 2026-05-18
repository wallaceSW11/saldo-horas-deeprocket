<template>
  <main class="popup" :class="theme">
    <header class="header">
      <div>
        <p class="eyebrow">Saldo mensal</p>
        <h1>Horas trabalhadas</h1>
      </div>
      <div class="header-actions">
        <button class="icon-button" type="button" :title="themeLabel" @click="toggleTheme">
          {{ theme === "dark" ? "☀" : "☾" }}
        </button>
        <button class="icon-button" type="button" title="Atualizar" @click="refresh" :disabled="loading">
          ↻
        </button>
      </div>
    </header>

    <section class="settings">
      <label class="field">
        <span>Carga permitida</span>
        <input
          :value="monthlyLimit"
          inputmode="numeric"
          maxlength="6"
          pattern="\d{1,3}:[0-5]\d"
          placeholder="70:00"
          @blur="saveSettings"
          @input="updateMonthlyLimit"
        />
      </label>

      <label class="check">
        <input v-model="settings.includeSaturday" type="checkbox" @change="saveSettings" />
        <span>Considerar sábado</span>
      </label>

      <label class="check">
        <input v-model="settings.includeSunday" type="checkbox" @change="saveSettings" />
        <span>Considerar domingo</span>
      </label>
    </section>

    <p v-if="error" class="message error">{{ error }}</p>
    <p v-else-if="loading" class="message">Lendo lançamentos da página...</p>
    <p v-else-if="!summary" class="message">Nenhum dado encontrado na página atual.</p>

    <section v-if="summary" class="metrics">
      <article class="metric">
        <span>Já feito</span>
        <strong>{{ formatMinutes(summary.workedMinutes) }}</strong>
      </article>
      <article class="metric">
        <span>{{ summary.extraMinutes > 0 ? "Saldo positivo" : "Falta" }}</span>
        <strong :class="{ positive: summary.extraMinutes > 0 }">
          {{ summary.extraMinutes > 0 ? "+" + formatMinutes(summary.extraMinutes) : formatMinutes(summary.remainingMinutes) }}
        </strong>
      </article>
      <article class="metric">
        <span>Média por dia</span>
        <strong>{{ formatMinutes(summary.requiredDailyAverageMinutes) }}</strong>
      </article>
      <article class="metric">
        <span>Dias restantes</span>
        <strong>{{ summary.remainingDays }}</strong>
      </article>
    </section>

    <footer v-if="periodLabel" class="footer">
      Competência {{ periodLabel }}
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

type Theme = "dark" | "light"

const storage = new Storage()
const DEFAULT_SETTINGS: UserSettings = {
  monthlyLimitMinutes: 70 * 60,
  includeSaturday: false,
  includeSunday: false
}
const DEFAULT_THEME: Theme = "dark"
const MAX_MONTHLY_LIMIT_MINUTES = 200 * 60

const settings = reactive<UserSettings>({ ...DEFAULT_SETTINGS })
const monthlyLimit = ref(formatMinutes(DEFAULT_SETTINGS.monthlyLimitMinutes))
const theme = ref<Theme>(DEFAULT_THEME)
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

const themeLabel = computed(() => theme.value === "dark" ? "Usar tema claro" : "Usar tema escuro")

onMounted(async () => {
  await loadTheme()
  await loadSettings()
  await refresh()
})

async function loadTheme() {
  const saved = await storage.get<Theme>("theme")
  theme.value = saved === "light" ? "light" : DEFAULT_THEME
}

async function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark"
  await storage.set("theme", theme.value)
}

async function loadSettings() {
  const saved = await storage.get<UserSettings>("settings")
  Object.assign(settings, DEFAULT_SETTINGS, saved)
  monthlyLimit.value = formatMinutes(settings.monthlyLimitMinutes)
}

async function saveSettings() {
  const parsedLimit = parseMonthlyLimit(monthlyLimit.value)
  if (parsedLimit === null) {
    monthlyLimit.value = formatMinutes(settings.monthlyLimitMinutes)
    return
  }

  settings.monthlyLimitMinutes = parsedLimit
  monthlyLimit.value = formatMinutes(parsedLimit)
  await storage.set("settings", { ...settings })
}

function updateMonthlyLimit(event: Event) {
  const input = event.target as HTMLInputElement
  monthlyLimit.value = maskMonthlyLimit(input.value)
  input.value = monthlyLimit.value
}

function maskMonthlyLimit(value: string) {
  const [rawHours = "", rawMinutes = ""] = value.replace(/[^\d:]/g, "").split(":", 2)
  const hoursText = rawHours.replace(/\D/g, "").slice(0, 3)
  const hasSeparator = value.includes(":")
  let minutesText = rawMinutes.replace(/\D/g, "").slice(0, 2)

  if (minutesText.length > 0 && Number(minutesText[0]) > 5) {
    minutesText = `5${minutesText.slice(1)}`
  }

  if (hoursText === "") {
    return ""
  }

  const hours = Math.min(Number(hoursText), 200)
  const normalizedHours = String(hours)

  if (hours === 200) {
    return hasSeparator ? "200:00" : "200"
  }

  if (!hasSeparator) {
    return normalizedHours
  }

  return `${normalizedHours}:${minutesText}`
}

function parseMonthlyLimit(value: string) {
  if (!/^\d{1,3}:[0-5]\d$/.test(value)) {
    return null
  }

  const parsedLimit = parseTimeToMinutes(value)

  if (parsedLimit === null || parsedLimit <= 0 || parsedLimit > MAX_MONTHLY_LIMIT_MINUTES) {
    return null
  }

  return parsedLimit
}

async function refresh() {
  loading.value = true
  error.value = ""

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      throw new Error("Não foi possível identificar a aba ativa.")
    }

    extractedData.value = await chrome.tabs.sendMessage(tab.id, { type: "READ_WORK_ENTRIES" })
  } catch {
    extractedData.value = null
    error.value = "Não consegui ler a página atual. Recarregue a página e tente novamente."
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
  --color-background: #111820;
  --color-surface: #18212b;
  --color-surface-strong: #202c38;
  --color-border: #334353;
  --color-text: #edf2f7;
  --color-text-muted: #a8b3c2;
  --color-text-soft: #c6d0dc;
  --color-positive: #4fd18b;
  --color-error-border: #8c3f3b;
  --color-error-text: #ffd0cd;
  --color-error-background: #321b1d;

  width: 360px;
  min-height: 440px;
  box-sizing: border-box;
  padding: 18px;
  color: var(--color-text);
  background: var(--color-background);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.popup.light {
  --color-background: #f7f8fa;
  --color-surface: #ffffff;
  --color-surface-strong: #ffffff;
  --color-border: #c8d1dc;
  --color-text: #17202a;
  --color-text-muted: #5d6d7e;
  --color-text-soft: #34495e;
  --color-positive: #137a45;
  --color-error-border: #f2b8b5;
  --color-error-text: #8a1f17;
  --color-error-background: #fff5f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--color-text-muted);
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  background: var(--color-surface);
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
  color: var(--color-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.field input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--color-text);
  background: var(--color-surface);
  font-size: 16px;
}

.check {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-soft);
  font-size: 14px;
}

.check input {
  width: 16px;
  height: 16px;
}

.message {
  margin: 14px 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  color: var(--color-text-soft);
  background: var(--color-surface);
  font-size: 14px;
}

.error {
  border-color: var(--color-error-border);
  color: var(--color-error-text);
  background: var(--color-error-background);
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--color-surface-strong);
}

.metric span {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.metric strong {
  align-self: end;
  color: var(--color-text);
  font-size: 24px;
  line-height: 1;
}

.metric strong.positive {
  color: var(--color-positive);
}

.footer {
  margin-top: 14px;
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}
</style>
