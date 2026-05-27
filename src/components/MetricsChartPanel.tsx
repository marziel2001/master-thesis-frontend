import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import styles from '../styles/theme.module.css'
import type {
    MetricChartProps,
    MetricPoint,
    MetricsChartPanelProps,
} from './MetricsChartPanel.types'

type ChartMode = 'chartjs' | 'classic'

type MetricChartViewProps = MetricChartProps & {
    chartMode: ChartMode
}

function clamp01(value: number) {
    if (Number.isNaN(value)) {
        return 0
    }
    return Math.max(0, Math.min(1, value))
}

function formatMetricValue(value: number, useRelativeScale: boolean) {
    return useRelativeScale ? value.toFixed(2) : value.toFixed(4)
}

function downloadChartAsPng(chart: Chart, fileName: string) {
    const url = chart.toBase64Image('image/png', 1)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
}

function buildFileName(title: string) {
    const normalized = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return `${normalized || 'chart'}.png`
}

function wrapLabel(label: string, maxCharsPerLine: number): string[] {
    const words = label.split(/\s+/).filter(Boolean)

    if (words.length === 0) {
        return [label]
    }

    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word

        if (nextLine.length <= maxCharsPerLine) {
            currentLine = nextLine
            continue
        }

        if (currentLine) {
            lines.push(currentLine)
        }

        if (word.length > maxCharsPerLine) {
            const chunks = word.match(
                new RegExp(`.{1,${maxCharsPerLine}}`, 'g')
            )
            if (chunks) {
                lines.push(...chunks.slice(0, -1))
                currentLine = chunks[chunks.length - 1]
                continue
            }
        }

        currentLine = word
    }

    if (currentLine) {
        lines.push(currentLine)
    }

    return lines.length > 0 ? lines : [label]
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
    chartMode,
}: MetricChartViewProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const chartRef = useRef<Chart | null>(null)

    useEffect(() => {
        if (chartMode !== 'chartjs') {
            chartRef.current?.destroy()
            chartRef.current = null
            return
        }

        const canvas = canvasRef.current

        if (!canvas) {
            return
        }

        const context = canvas.getContext('2d')

        if (!context) {
            return
        }

        chartRef.current?.destroy()

        chartRef.current = new Chart(context, {
            type: 'bar',
            data: {
                labels: items.map((item) => item.model),
                datasets: [
                    {
                        data: items.map((item) => item.value),
                        backgroundColor: 'rgba(37, 99, 235, 0.82)',
                        borderColor: 'rgba(37, 99, 235, 1)',
                        borderWidth: 1,
                        borderRadius: 0,
                        borderSkipped: false,
                        maxBarThickness: 20,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => {
                                const value = tooltipItem.raw
                                const numericValue =
                                    typeof value === 'number'
                                        ? value
                                        : Number(value)

                                return ` ${formatMetricValue(numericValue, false)}`
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.22)',
                        },
                        ticks: {
                            color: '#64748b',
                        },
                    },
                    y: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: '#334155',
                            callback: function (value) {
                                const rawLabel = this.getLabelForValue(
                                    Number(value)
                                )

                                return wrapLabel(rawLabel, 18)
                            },
                        },
                    },
                },
            },
        })

        return () => {
            chartRef.current?.destroy()
            chartRef.current = null
        }
    }, [chartMode, items])

    const handleDownload = () => {
        if (!chartRef.current) {
            return
        }

        downloadChartAsPng(chartRef.current, buildFileName(title))
    }

    if (items.length === 0) {
        return (
            <div
                className={`rounded-lg p-3 text-xs ${styles.border} ${styles.surfaceMuted} ${styles.textMuted}`}
            >
                <p className={`font-semibold ${styles.textPrimary}`}>{title}</p>
                <p className="mt-2">No data yet.</p>
            </div>
        )
    }

    const maxValue = useRelativeScale
        ? Math.max(...items.map((item) => item.value))
        : 1

    if (chartMode === 'chartjs') {
        return (
            <div
                className={`rounded-lg p-3 shadow-sm ${styles.border} ${styles.surfaceMuted}`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p
                            className={`text-xs font-semibold ${styles.textPrimary}`}
                        >
                            {title}
                        </p>
                        <p className={`text-[11px] ${styles.textMuted}`}>
                            Chart.js view
                        </p>
                    </div>
                    <button
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${styles.border} ${styles.surface} ${styles.textPrimary}`}
                        onClick={handleDownload}
                        type="button"
                    >
                        Download PNG
                    </button>
                </div>
                <div className={`mt-3 h-64 rounded-md p-2 ${styles.surface}`}>
                    <canvas ref={canvasRef} />
                </div>
            </div>
        )
    }

    return (
        <div
            className={`rounded-lg p-3 ${styles.border} ${styles.surfaceMuted}`}
        >
            <p className={`text-xs font-semibold ${styles.textPrimary}`}>
                {title}
            </p>
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
                                <span
                                    className={`font-medium ${styles.textPrimary}`}
                                >
                                    {item.model}
                                </span>
                                <span className={styles.textMuted}>
                                    {formatMetricValue(
                                        item.value,
                                        useRelativeScale
                                    )}
                                </span>
                            </div>
                            <div
                                className={`h-2 w-full rounded-full ${styles.barTrack}`}
                            >
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
    emptyDescription = 'Click Count metrics to compare the entered texts and visualize WER, CER, processing time, and RTF in this area.',
}: MetricsChartPanelProps) {
    const [chartMode, setChartMode] = useState<ChartMode>('chartjs')
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

    const rtfItems: MetricPoint[] = entries
        .filter(([, metrics]) => typeof metrics.rtf === 'number')
        .map(([model, metrics]) => ({
            model,
            value: metrics.rtf as number,
        }))

    if (
        werItems.length === 0 &&
        cerItems.length === 0 &&
        timeItems.length === 0 &&
        rtfItems.length === 0
    ) {
        return (
            <section
                className={`rounded-xl p-4 shadow-sm ${styles.surface} ${styles.border}`}
            >
                <h3 className={`text-sm font-semibold ${styles.textPrimary}`}>
                    {title}
                </h3>
                <div
                    className={`mt-3 rounded-lg p-4 text-sm ${styles.surfaceMuted} ${styles.border} ${styles.textMuted}`}
                >
                    <p className={`font-medium ${styles.textPrimary}`}>
                        {emptyTitle}
                    </p>
                    <p className="mt-1">{emptyDescription}</p>
                </div>
            </section>
        )
    }

    return (
        <section
            className={`rounded-xl p-4 shadow-sm ${styles.surface} ${styles.border}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={`text-sm font-semibold ${styles.textPrimary}`}>
                    {title}
                </h3>
                <div
                    className={`inline-flex rounded-lg p-1 text-xs font-medium ${styles.surfaceMuted} ${styles.border}`}
                >
                    <button
                        className={`rounded-md px-3 py-1.5 transition ${
                            chartMode === 'chartjs'
                                ? 'bg-gray-900 text-white shadow-sm'
                                : `${styles.textMuted} ${styles.surface}`
                        }`}
                        onClick={() => setChartMode('chartjs')}
                        type="button"
                    >
                        Chart.js
                    </button>
                    <button
                        className={`rounded-md px-3 py-1.5 transition ${
                            chartMode === 'classic'
                                ? 'bg-gray-900 text-white shadow-sm'
                                : `${styles.textMuted} ${styles.surface}`
                        }`}
                        onClick={() => setChartMode('classic')}
                        type="button"
                    >
                        Old view
                    </button>
                </div>
            </div>
            <p className={`mt-2 text-xs ${styles.textMuted}`}>
                Switch views to compare the new Chart.js charts with the
                previous bar layout. PNG download is available in Chart.js mode.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricChart
                    title="WER"
                    items={werItems}
                    chartMode={chartMode}
                />
                <MetricChart
                    title="CER"
                    items={cerItems}
                    chartMode={chartMode}
                />
                <MetricChart
                    title="Processing time (s)"
                    items={timeItems}
                    useRelativeScale={true}
                    chartMode={chartMode}
                />
                <MetricChart
                    title="RTF"
                    items={rtfItems}
                    useRelativeScale={true}
                    chartMode={chartMode}
                />
            </div>
        </section>
    )
}
