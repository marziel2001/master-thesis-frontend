import { apiClient } from './api'

export type MetricsResult = {
    wer: number | null
    cer: number | null
}

type MetricsApiResponse = {
    wer?: unknown
    cer?: unknown
}

type MetricsRequest = {
    referenceText: string
    hypothesisText: string
    normalize?: boolean
}

export async function getMetrics({
    referenceText,
    hypothesisText,
    normalize = true,
}: MetricsRequest): Promise<MetricsResult> {
    const response = await apiClient.post<MetricsApiResponse>('/api/metrics', {
        reference_text: referenceText,
        hypothesis_text: hypothesisText,
        normalize,
    })

    const wer =
        typeof response.data?.wer === 'number' ? response.data.wer : null
    const cer =
        typeof response.data?.cer === 'number' ? response.data.cer : null

    return { wer, cer }
}
