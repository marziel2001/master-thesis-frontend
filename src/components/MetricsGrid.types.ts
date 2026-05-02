export type MetricsGridProps = {
    metrics: {
        wer: number | null
        cer: number | null
        rtTime?: number | null
    }
    showTime?: boolean
}
