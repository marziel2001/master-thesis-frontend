export type EntryMetrics = {
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf: number | null
}

export type EntryStatus = 'idle' | 'loading' | 'success' | 'error'

export type CompareEntry = {
    id: string
    modelId: string
    modelVersion?: string
    fileName: string
    text: string
    textVersion: number
    metrics: EntryMetrics
    metricsVersion: number
    metricsTextVersion: number
    audioDuration?: number | null
    status: EntryStatus
}
