import type {
    MetricChartProps,
    MetricPoint,
    MetricsChartPanelProps,
} from './MetricsChartPanel.types'

function clamp01(value: number) {
    if (Number.isNaN(value)) {
        return 0
    }
    return Math.max(0, Math.min(1, value))
}

function MetricChart({ title, items }: MetricChartProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                <p className="font-semibold text-gray-700">{title}</p>
                <p className="mt-2">No data yet.</p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-700">{title}</p>
            <div className="mt-2 space-y-2">
                {items.map((item) => {
                    const clamped = clamp01(item.value)
                    const percent = Math.round(clamped * 100)

                    return (
                        <div key={item.model} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-700">
                                    {item.model}
                                </span>
                                <span className="text-gray-500">
                                    {item.value.toFixed(4)}
                                </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-200">
                                <div
                                    className="h-2 rounded-full bg-blue-500"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function MetricsChartPanel({
    metricsByModel,
    title = 'Metrics overview',
}: MetricsChartPanelProps) {
    const entries = Object.entries(metricsByModel)

    const werItems: MetricPoint[] = entries
        .filter(([, metrics]) => typeof metrics.wer === 'number')
        .map(([model, metrics]) => ({
            model,
            value: metrics.wer as number,
        }))

    const cerItems: MetricPoint[] = entries
        .filter(([, metrics]) => typeof metrics.cer === 'number')
        .map(([model, metrics]) => ({
            model,
            value: metrics.cer as number,
        }))

    if (werItems.length === 0 && cerItems.length === 0) {
        return null
    }

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MetricChart title="WER" items={werItems} />
                <MetricChart title="CER" items={cerItems} />
            </div>
        </section>
    )
}
