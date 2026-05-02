export type EntryMetrics = {
    wer: number | null
    cer: number | null
}

export type EntryStatus = 'idle' | 'loading' | 'success' | 'error'

export type CompareEntry = {
    id: string
    model: string
    text: string
    metrics: EntryMetrics
    status: EntryStatus
}
