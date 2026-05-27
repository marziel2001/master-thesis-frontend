import { apiClient } from './api'
import type {
    NormalizeTextApiResponse,
    NormalizeTextRequest,
} from './normalizeText.types'

export async function normalizeText({
    text,
}: NormalizeTextRequest): Promise<string> {
    const response = await apiClient.post<NormalizeTextApiResponse>(
        '/api/normalize-text',
        { text }
    )

    return typeof response.data?.text === 'string' ? response.data.text : text
}
