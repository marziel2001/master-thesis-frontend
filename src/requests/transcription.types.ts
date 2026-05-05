export type TranscriptionResult = {
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    modelName: string
    modelVersion: string
    computeTime: number | null
    outputFile: string | null
}

export type TranscriptionApiResponse = {
    transcription?: unknown
    wer?: unknown
    cer?: unknown
    rt_time?: unknown
    model_name?: unknown
    model_version?: unknown
    compute_time?: unknown
    output_file?: unknown
}
