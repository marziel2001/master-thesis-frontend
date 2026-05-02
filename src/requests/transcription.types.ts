export type TranscriptionResult = {
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
}

export type TranscriptionApiResponse = {
    transcription?: unknown
    wer?: unknown
    cer?: unknown
    rt_time?: unknown
}
