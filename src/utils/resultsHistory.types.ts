export type StoredResult = {
    model: string
    modelVersion?: string
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf?: number | null
    audioDuration?: number | null
}

export type StoredRun = {
    id: string
    createdAt: string
    name?: string
    referenceText: string
    results: StoredResult[]
}
