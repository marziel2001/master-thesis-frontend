export type StoredResult = {
    model: string
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
}

export type StoredRun = {
    id: string
    createdAt: string
    referenceText: string
    results: StoredResult[]
}
