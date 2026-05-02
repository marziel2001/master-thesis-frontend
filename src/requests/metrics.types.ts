export type MetricsResult = {
    wer: number | null
    cer: number | null
}

export type MetricsApiResponse = {
    wer?: unknown
    cer?: unknown
}

export type MetricsRequest = {
    referenceText: string
    hypothesisText: string
    normalize?: boolean
}
