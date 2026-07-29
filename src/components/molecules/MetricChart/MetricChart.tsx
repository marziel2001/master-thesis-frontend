import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { Button, Panel, ProgressBar, Row, Stack, Text } from '../../atoms'
import { useTheme } from '../../../hooks/useTheme'
import {
    ABSOLUTE_SCALE_FRACTION_DIGITS,
    AXIS_LABEL_WRAP_WIDTH,
    formatChartValue,
    getBarPercent,
    readChartColors,
    wrapLabel,
} from '../../../lib/chart'
import { downloadUrl, toFileNameSlug } from '../../../lib/files'
import styles from './MetricChart.module.css'

export type MetricPoint = {
    model: string
    value: number
}

export type MetricChartMode = 'chartjs' | 'classic'

export type MetricChartProps = {
    title: string
    items: MetricPoint[]
    mode: MetricChartMode
    /** Scale bars against the largest value rather than the 0-1 range. */
    useRelativeScale?: boolean
}

export default function MetricChart({
    title,
    items,
    mode,
    useRelativeScale = false,
}: MetricChartProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const chartRef = useRef<Chart | null>(null)
    const { theme } = useTheme()

    useEffect(() => {
        if (mode !== 'chartjs') {
            chartRef.current?.destroy()
            chartRef.current = null
            return
        }

        const context = canvasRef.current?.getContext('2d')
        if (!context) {
            return
        }

        const colors = readChartColors()

        chartRef.current?.destroy()
        chartRef.current = new Chart(context, {
            type: 'bar',
            data: {
                labels: items.map((item) => item.model),
                datasets: [
                    {
                        data: items.map((item) => item.value),
                        backgroundColor: colors.barFill,
                        borderColor: colors.barBorder,
                        borderWidth: 1,
                        borderRadius: 0,
                        borderSkipped: false,
                        maxBarThickness: 100,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => {
                                const numericValue = Number(tooltipItem.raw)

                                return ` ${numericValue.toFixed(
                                    ABSOLUTE_SCALE_FRACTION_DIGITS
                                )}`
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: colors.grid },
                        ticks: { color: colors.axisTick },
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            autoSkip: false,
                            color: colors.axisLabel,
                            callback: function (value) {
                                return wrapLabel(
                                    this.getLabelForValue(Number(value)),
                                    AXIS_LABEL_WRAP_WIDTH
                                )
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
        // `theme` is not read here, but it changes the resolved token values, so
        // the chart has to be rebuilt when it flips.
    }, [mode, items, theme])

    const handleDownloadPng = () => {
        const chart = chartRef.current
        if (!chart) {
            return
        }

        downloadUrl(
            chart.toBase64Image('image/png', 1),
            `${toFileNameSlug(title, 'chart')}.png`
        )
    }

    if (items.length === 0) {
        return (
            <Panel surface="muted" radius="lg" padding="sm">
                <Text size="xs" weight="semibold">
                    {title}
                </Text>
                <Text size="xs" tone="muted" className={styles.emptyMessage}>
                    No data yet.
                </Text>
            </Panel>
        )
    }

    if (mode === 'chartjs') {
        return (
            <Panel surface="muted" radius="lg" padding="sm" elevation="sm">
                <Row justify="between" gap={3}>
                    <div>
                        <Text size="xs" weight="semibold">
                            {title}
                        </Text>
                        <Text size="2xs" tone="muted">
                            Chart.js view
                        </Text>
                    </div>
                    <Button size="sm" onClick={handleDownloadPng}>
                        Download PNG
                    </Button>
                </Row>
                <div className={styles.canvasFrame}>
                    <canvas ref={canvasRef} />
                </div>
            </Panel>
        )
    }

    const maxValue = useRelativeScale
        ? Math.max(...items.map((item) => item.value))
        : 1

    return (
        <Panel surface="muted" radius="lg" padding="sm">
            <Text size="xs" weight="semibold">
                {title}
            </Text>
            <Stack gap={2} className={styles.bars}>
                {items.map((item) => (
                    <Stack key={item.model} gap={1}>
                        <Row justify="between" gap={2}>
                            <Text as="span" size="xs" weight="medium">
                                {item.model}
                            </Text>
                            <Text as="span" size="xs" tone="muted">
                                {formatChartValue(item.value, useRelativeScale)}
                            </Text>
                        </Row>
                        <ProgressBar
                            percent={getBarPercent(
                                item.value,
                                useRelativeScale,
                                maxValue
                            )}
                        />
                    </Stack>
                ))}
            </Stack>
        </Panel>
    )
}
