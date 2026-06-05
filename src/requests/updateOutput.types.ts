export type UpdateOutputRequest = {
    outputFile: string
    wer: number | null
    cer: number | null
    referenceText: string
}

export type UpdateOutputApiResponse = {
    output_file?: unknown
}
