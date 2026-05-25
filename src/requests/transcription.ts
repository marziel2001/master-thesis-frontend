import { apiClient } from './api'
import type {
    TranscriptionApiResponse,
    TranscriptionResult,
} from './transcription.types'

export type { TranscriptionResult } from './transcription.types'

export async function transcribeAudio(
    model: string,
    file: File,
    referenceText?: string,
    modelVariant?: string
): Promise<TranscriptionResult> {
    const formData = new FormData()
    formData.append('file', file)
    if (referenceText && referenceText.trim().length > 0) {
        formData.append('reference_text', referenceText)
    }
    if (modelVariant && modelVariant.trim().length > 0) {
        formData.append('model_variant', modelVariant)
    }

    const requestPath = `/api/transcribe/${model}`

    console.log('[backend] sending transcription request', {
        baseURL: apiClient.defaults.baseURL,
        requestPath,
        fileName: file.name,
        model,
    })

    let response
    try {
        response = await apiClient.post<TranscriptionApiResponse>(
            requestPath,
            formData
        )
    } catch (error) {
        console.error('[backend] transcription request failed', {
            baseURL: apiClient.defaults.baseURL,
            requestPath,
            model,
            error,
        })
        throw error
    }

    console.log('[backend] transcription request succeeded', {
        baseURL: apiClient.defaults.baseURL,
        requestPath,
        model,
        status: response.status,
    })

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
    const audioDuration =
        typeof response.data?.audio_duration === 'number'
            ? response.data.audio_duration
            : null
    const modelName =
        typeof response.data?.model_name === 'string'
            ? response.data.model_name
            : ''
    const modelVersion =
        typeof response.data?.model_version === 'string'
            ? response.data.model_version
            : ''
    const computeTime =
        typeof response.data?.compute_time === 'number'
            ? response.data.compute_time
            : null
    const outputFile =
        typeof response.data?.output_file === 'string'
            ? response.data.output_file
            : null

    return {
        transcription,
        wer,
        cer,
        rtTime,
        audioDuration,
        modelName,
        modelVersion,
        computeTime,
        outputFile,
    }
}
