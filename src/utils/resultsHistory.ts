import type { StoredRun } from './resultsHistory.types'

export type { StoredResult, StoredRun } from './resultsHistory.types'

const STORAGE_KEY = 'transcriptionHistoryV1'
const STORAGE_LIMIT = 10

export function loadHistory(): StoredRun[] {
    if (typeof window === 'undefined') {
        return []
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return []
        }

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
            return []
        }

        return parsed as StoredRun[]
    } catch {
        return []
    }
}

export function saveRun(run: StoredRun, limit = STORAGE_LIMIT): StoredRun[] {
    if (typeof window === 'undefined') {
        return []
    }

    const current = loadHistory()
    const next = [run, ...current].slice(0, limit)

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

    return next
}

export type SaveRunResult = {
    ok: boolean
    error?: string
}

export function saveRunSafe(
    run: StoredRun,
    limit = STORAGE_LIMIT
): SaveRunResult {
    if (typeof window === 'undefined') {
        return { ok: false, error: 'Storage is unavailable.' }
    }

    try {
        saveRun(run, limit)
        return { ok: true }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Failed to save history.'
        return { ok: false, error: message }
    }
}

export function formatRunLabel(run: StoredRun): string {
    const date = new Date(run.createdAt)
    const dateLabel = Number.isNaN(date.getTime())
        ? run.createdAt
        : date.toLocaleString('pl-PL', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
          })

    if (run.name?.trim()) {
        return `${run.name.trim()} · ${dateLabel}`
    }

    if (Number.isNaN(date.getTime())) {
        return run.createdAt
    }

    return dateLabel
}
