export type EntryMetrics = {
    wer: number | null
    cer: number | null
    rtTime: number | null
}

export type EntryStatus = 'idle' | 'loading' | 'success' | 'error'

export type CompareEntry = {
    id: string
    modelId: string
    modelVersion?: string
    text: string
    metrics: EntryMetrics
    status: EntryStatus
}
