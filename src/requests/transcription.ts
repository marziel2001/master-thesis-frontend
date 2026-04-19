import { apiClient } from './api'

export type TranscriptionResult = {
    transcription: string
    wer: number | null
    cer: number | null
}

type TranscriptionApiResponse = {
    transcription?: unknown
    wer?: unknown
    cer?: unknown
}

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

    return { transcription, wer, cer }
}
