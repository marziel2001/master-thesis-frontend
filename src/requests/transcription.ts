import { apiClient } from './api'

type TranscriptionResponse = {
    transcription?: unknown
}

export async function transcribeAudio(
    model: string,
    file: File
): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<TranscriptionResponse>(
        `/api/transcribe/${model}`,
        formData
    )

    return typeof response.data?.transcription === 'string'
        ? response.data.transcription
        : ''
}
