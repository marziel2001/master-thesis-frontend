export const MODELS = [
    'openai',
    'whisperOffline',
    'googleStt',
    'azureStt',
    'amazonStt',
] as const

export type ModelName = (typeof MODELS)[number]

export type ModelMetrics = {
    wer: number | null
    cer: number | null
    rtTime: number | null
}

export type ModelStatus = 'idle' | 'loading' | 'success' | 'error'
