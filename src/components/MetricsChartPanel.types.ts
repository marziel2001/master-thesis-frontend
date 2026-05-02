export type MetricsChartPanelProps = {
    metricsByModel: Record<
        string,
        {
            wer: number | null
            cer: number | null
        }
    >
    title?: string
}

export type MetricPoint = {
    model: string
    value: number
}

export type MetricChartProps = {
    title: string
    items: MetricPoint[]
}
