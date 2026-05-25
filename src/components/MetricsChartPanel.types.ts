export type MetricsChartPanelProps = {
    metricsByModel: Record<
        string,
        {
            wer: number | null
            cer: number | null
            rtTime: number | null
            rtf: number | null
        }
    >
    title?: string
    emptyTitle?: string
    emptyDescription?: string
}

export type MetricPoint = {
    model: string
    value: number
}

export type MetricChartProps = {
    title: string
    items: MetricPoint[]
    valueLabel?: string
    useRelativeScale?: boolean
}
