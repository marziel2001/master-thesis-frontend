export type RunResult = {
    model: string
    modelVersion?: string
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf?: number | null
    audioDuration?: number | null
    outputFile?: string | null
}

export type RunData = {
    id: string
    createdAt: string
    name?: string
    referenceText: string
    audioFileName?: string | null
    results: RunResult[]
}

export type CreateRunRequest = {
    name?: string
    referenceText: string
    audioFileName?: string | null
    results: RunResult[]
}

export type RunApiResult = {
    model?: unknown
    model_version?: unknown
    transcription?: unknown
    wer?: unknown
    cer?: unknown
    rt_time?: unknown
    rtf?: unknown
    audio_duration?: unknown
    output_file?: unknown
}

export type RunApiResponse = {
    id?: unknown
    created_at?: unknown
    name?: unknown
    reference_text?: unknown
    audio_filename?: unknown
    results?: unknown
}
