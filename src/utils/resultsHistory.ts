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

export function formatRunLabel(run: StoredRun): string {
    const date = new Date(run.createdAt)
    if (Number.isNaN(date.getTime())) {
        return run.createdAt
    }

    return date.toISOString().replace('T', ' ').replace('Z', '')
}
