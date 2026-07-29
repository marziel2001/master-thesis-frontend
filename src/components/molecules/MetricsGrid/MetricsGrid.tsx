import type { ReactNode } from 'react'
import { MetricTile, Panel, Row, Text } from '../../atoms'
import {
    SECONDS_FRACTION_DIGITS,
    WER_CER_FRACTION_DIGITS,
    formatMetric,
} from '../../../lib/metrics'
import type { Metrics } from '../../../types/metrics'
import styles from './MetricsGrid.module.css'

export type MetricsGridProps = {
    metrics: Metrics
    /** Include the processing-time tile. */
    showTime?: boolean
    title?: string
    subtitle?: string
    footer?: ReactNode
}

export default function MetricsGrid({
    metrics,
    showTime = true,
    title,
    subtitle,
    footer,
}: MetricsGridProps) {
    const gridClassName = [styles.grid, showTime ? '' : styles.twoColumns]
        .filter(Boolean)
        .join(' ')

    return (
        <Panel padding="sm" elevation="sm">
            {title || subtitle ? (
                <div className={styles.header}>
                    {title ? (
                        <Text size="xs" weight="semibold" tone="muted" eyebrow>
                            {title}
                        </Text>
                    ) : null}
                    {subtitle ? (
                        <Text
                            size="xs"
                            tone="muted"
                            className={styles.subtitle}
                        >
                            {subtitle}
                        </Text>
                    ) : null}
                </div>
            ) : null}

            <div className={gridClassName}>
                <MetricTile
                    label="WER"
                    value={formatMetric(metrics.wer, WER_CER_FRACTION_DIGITS)}
                />
                <MetricTile
                    label="CER"
                    value={formatMetric(metrics.cer, WER_CER_FRACTION_DIGITS)}
                />
                {showTime ? (
                    <MetricTile
                        label="Time (s)"
                        value={formatMetric(
                            metrics.rtTime,
                            SECONDS_FRACTION_DIGITS
                        )}
                    />
                ) : null}
            </div>

            {footer ? (
                <Row gap={2} className={styles.footer}>
                    {footer}
                </Row>
            ) : null}
        </Panel>
    )
}
