import { apiClient } from './api'
import type {
    TranscriptionApiResponse,
    TranscriptionResult,
} from './transcription.types'

export type { TranscriptionResult } from './transcription.types'

export async function transcribeAudio(
    model: string,
    file: File,
    referenceText?: string
): Promise<TranscriptionResult> {
    const formData = new FormData()
    formData.append('file', file)
    if (referenceText && referenceText.trim().length > 0) {
        formData.append('reference_text', referenceText)
    }

    const response = await apiClient.post<TranscriptionApiResponse>(
        `/api/transcribe/${model}`,
        formData
    )

    const transcription =
        typeof response.data?.transcription === 'string'
            ? response.data.transcription
            : ''

    const wer =
        typeof response.data?.wer === 'number' ? response.data.wer : null
    const cer =
        typeof response.data?.cer === 'number' ? response.data.cer : null
    const rtTime =
        typeof response.data?.rt_time === 'number'
            ? response.data.rt_time
            : null

    return { transcription, wer, cer, rtTime }
}
