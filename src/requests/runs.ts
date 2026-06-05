import { apiClient } from './api'
import type {
    CreateRunRequest,
    RunApiResponse,
    RunApiResult,
    RunData,
    RunResult,
} from './runs.types'

const parseRunResult = (entry: RunApiResult): RunResult => ({
    model: typeof entry.model === 'string' ? entry.model : '',
    modelVersion:
        typeof entry.model_version === 'string'
            ? entry.model_version
            : undefined,
    transcription:
        typeof entry.transcription === 'string' ? entry.transcription : '',
    wer: typeof entry.wer === 'number' ? entry.wer : null,
    cer: typeof entry.cer === 'number' ? entry.cer : null,
    rtTime: typeof entry.rt_time === 'number' ? entry.rt_time : null,
    rtf: typeof entry.rtf === 'number' ? entry.rtf : null,
    audioDuration:
        typeof entry.audio_duration === 'number' ? entry.audio_duration : null,
    outputFile:
        typeof entry.output_file === 'string' ? entry.output_file : null,
})

const parseRun = (entry: RunApiResponse): RunData | null => {
    if (typeof entry.id !== 'string' || typeof entry.created_at !== 'string') {
        return null
    }

    const resultsRaw = Array.isArray(entry.results) ? entry.results : []

    return {
        id: entry.id,
        createdAt: entry.created_at,
        name: typeof entry.name === 'string' ? entry.name : undefined,
        referenceText:
            typeof entry.reference_text === 'string'
                ? entry.reference_text
                : '',
        audioFileName:
            typeof entry.audio_filename === 'string'
                ? entry.audio_filename
                : null,
        results: resultsRaw.map(parseRunResult),
    }
}

export async function listRuns(): Promise<RunData[]> {
    const response = await apiClient.get<RunApiResponse[]>('/api/runs')
    const payload = Array.isArray(response.data) ? response.data : []
    return payload
        .map(parseRun)
        .filter((entry): entry is RunData => Boolean(entry))
}

export async function createRun(payload: CreateRunRequest): Promise<RunData> {
    const response = await apiClient.post<RunApiResponse>('/api/runs', {
        name: payload.name,
        reference_text: payload.referenceText,
        audio_filename: payload.audioFileName ?? null,
        results: payload.results.map((result) => ({
            model: result.model,
            model_version: result.modelVersion ?? null,
            transcription: result.transcription,
            wer: result.wer,
            cer: result.cer,
            rt_time: result.rtTime,
            rtf: result.rtf ?? null,
            audio_duration: result.audioDuration ?? null,
            output_file: result.outputFile ?? null,
        })),
    })

    const parsed = parseRun(response.data)
    if (!parsed) {
        throw new Error('Invalid run response.')
    }
    return parsed
}

export async function deleteRun(runId: string): Promise<void> {
    await apiClient.delete(`/api/runs/${runId}`)
}
