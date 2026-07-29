import { useState } from 'react'
import { Button, Panel, Row, Text } from '../../atoms'
import MetricChart, {
    type MetricChartMode,
    type MetricPoint,
} from '../../molecules/MetricChart/MetricChart'
import SegmentedControl from '../../molecules/SegmentedControl/SegmentedControl'
import type { Metrics } from '../../../types/metrics'
import styles from './MetricsChartPanel.module.css'

const CHART_MODE_OPTIONS: ReadonlyArray<{
    value: MetricChartMode
    label: string
}> = [
    { value: 'chartjs', label: 'Chart.js' },
    { value: 'classic', label: 'Old view' },
]

export type MetricsChartPanelProps = {
    metricsByModel: Record<string, Metrics>
    title?: string
    emptyTitle?: string
    emptyDescription?: string
}

/** Drops models that have no value for the given metric. */
function toMetricPoints(
    metricsByModel: Record<string, Metrics>,
    metric: keyof Metrics
): MetricPoint[] {
    return Object.entries(metricsByModel).flatMap(([model, metrics]) => {
        const value = metrics[metric]

        return typeof value === 'number' ? [{ model, value }] : []
    })
}

export default function MetricsChartPanel({
    metricsByModel,
    title = 'Metrics overview',
    emptyTitle = 'Your comparison chart will appear here',
    emptyDescription = 'Click Count metrics to compare the entered texts and visualize WER, CER, processing time, and RTF in this area.',
}: MetricsChartPanelProps) {
    const [chartMode, setChartMode] = useState<MetricChartMode>('chartjs')
    const [areChartsExpanded, setAreChartsExpanded] = useState(false)

    const werItems = toMetricPoints(metricsByModel, 'wer')
    const cerItems = toMetricPoints(metricsByModel, 'cer')
    const timeItems = toMetricPoints(metricsByModel, 'rtTime')
    const rtfItems = toMetricPoints(metricsByModel, 'rtf')

    const hasAnyData = [werItems, cerItems, timeItems, rtfItems].some(
        (items) => items.length > 0
    )

    if (!hasAnyData) {
        return (
            <Panel as="section" elevation="sm">
                <Text as="h3" size="sm" weight="semibold">
                    {title}
                </Text>
                <Panel
                    surface="muted"
                    radius="lg"
                    className={styles.emptyBox}
                    padding="md"
                >
                    <Text weight="medium">{emptyTitle}</Text>
                    <Text
                        tone="muted"
                        className={styles.emptyDescription}
                    >
                        {emptyDescription}
                    </Text>
                </Panel>
            </Panel>
        )
    }

    const chartGridClassName = [
        styles.chartGrid,
        areChartsExpanded ? '' : styles.chartGridCompact,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <Panel as="section" elevation="sm">
            <Row justify="between" gap={3}>
                <Text as="h3" size="sm" weight="semibold">
                    {title}
                </Text>
                <Row gap={2}>
                    <Button
                        size="sm"
                        aria-pressed={areChartsExpanded}
                        onClick={() =>
                            setAreChartsExpanded((expanded) => !expanded)
                        }
                    >
                        {areChartsExpanded
                            ? 'Collapse charts'
                            : 'Expand charts'}
                    </Button>
                    <SegmentedControl
                        label="Chart rendering mode"
                        value={chartMode}
                        options={CHART_MODE_OPTIONS}
                        onChange={setChartMode}
                    />
                </Row>
            </Row>

            <Text size="xs" tone="muted" className={styles.description}>
                Switch views to compare the new Chart.js charts with the
                previous bar layout. PNG download is available in Chart.js mode.
            </Text>

            <div className={chartGridClassName}>
                <MetricChart title="WER" items={werItems} mode={chartMode} />
                <MetricChart title="CER" items={cerItems} mode={chartMode} />
                <MetricChart
                    title="Processing time (s)"
                    items={timeItems}
                    mode={chartMode}
                    useRelativeScale
                />
                <MetricChart
                    title="RTF"
                    items={rtfItems}
                    mode={chartMode}
                    useRelativeScale
                />
            </div>
        </Panel>
    )
}
