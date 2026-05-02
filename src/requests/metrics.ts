import { apiClient } from './api'
import type {
    MetricsApiResponse,
    MetricsRequest,
    MetricsResult,
} from './metrics.types'

export type { MetricsResult } from './metrics.types'

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
