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

function formatMetricValue(value: number, useRelativeScale: boolean) {
    return useRelativeScale ? value.toFixed(2) : value.toFixed(4)
}

function getBarPercent(
    value: number,
    useRelativeScale: boolean,
    maxValue: number
) {
    if (useRelativeScale) {
        if (maxValue <= 0 || Number.isNaN(maxValue)) {
            return 0
        }

        return Math.round(getRelativeWidth(value, maxValue) * 100)
    }

    return Math.round(clamp01(value) * 100)
}

function MetricChart({
    title,
    items,
    useRelativeScale = false,
}: MetricChartProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                <p className="font-semibold text-gray-700">{title}</p>
                <p className="mt-2">No data yet.</p>
            </div>
        )
    }

    const maxValue = useRelativeScale
        ? Math.max(...items.map((item) => item.value))
        : 1

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-700">{title}</p>
            <div className="mt-2 space-y-2">
                {items.map((item) => {
                    const percent = getBarPercent(
                        item.value,
                        useRelativeScale,
                        maxValue
                    )

                    return (
                        <div key={item.model} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-700">
                                    {item.model}
                                </span>
                                <span className="text-gray-500">
                                    {formatMetricValue(
                                        item.value,
                                        useRelativeScale
                                    )}
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

function getRelativeWidth(value: number, maxValue: number) {
    if (maxValue <= 0 || Number.isNaN(maxValue)) {
        return 0
    }

    return Math.max(0, Math.min(1, value / maxValue))
}

export default function MetricsChartPanel({
    metricsByModel,
    title = 'Metrics overview',
    emptyTitle = 'Your comparison chart will appear here',
    emptyDescription = 'Click Count metrics to compare the entered texts and visualize WER, CER, and processing time in this area.',
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

    const timeItems: MetricPoint[] = entries
        .filter(([, metrics]) => typeof metrics.rtTime === 'number')
        .map(([model, metrics]) => ({
            model,
            value: metrics.rtTime as number,
        }))

    if (
        werItems.length === 0 &&
        cerItems.length === 0 &&
        timeItems.length === 0
    ) {
        return (
            <section className="rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">{emptyTitle}</p>
                    <p className="mt-1">{emptyDescription}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
                <MetricChart title="WER" items={werItems} />
                <MetricChart title="CER" items={cerItems} />
                <MetricChart
                    title="Processing time (s)"
                    items={timeItems}
                    useRelativeScale={true}
                />
            </div>
        </section>
    )
}
