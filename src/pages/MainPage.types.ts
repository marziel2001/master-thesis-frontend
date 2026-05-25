export type ModelMetrics = {
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf: number | null
}

export type ModelStatus = 'idle' | 'loading' | 'success' | 'error'
