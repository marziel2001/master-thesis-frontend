export type Metrics = {
    wer: number | null
    cer: number | null
    rtTime: number | null
}

export type TranscriptionWidgetProps = {
    model: string
    checked: boolean
    loading: boolean
    status: 'idle' | 'loading' | 'success' | 'error'
    result: string
    metrics: Metrics
    referenceText: string
    onCheckedChange: (checked: boolean) => void
    onRerun: () => void
    canRerun: boolean
}
