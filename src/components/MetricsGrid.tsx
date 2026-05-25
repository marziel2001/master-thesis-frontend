import type { MetricsGridProps } from './MetricsGrid.types'
import styles from '../styles/theme.module.css'

export default function MetricsGrid({
    metrics,
    showTime = true,
    title,
    subtitle,
    footer,
}: MetricsGridProps) {
    const hasMetrics = metrics.wer !== null && metrics.cer !== null
    const hasTime = metrics.rtTime !== null && metrics.rtTime !== undefined
    const gridClassName = showTime ? 'grid-cols-3' : 'grid-cols-2'

    return (
        <div
            className={`mt-4 rounded-xl p-3 shadow-sm ${styles.surface} ${styles.border}`}
        >
            {title || subtitle ? (
                <div className="mb-3">
                    {title ? (
                        <p
                            className={`text-xs font-semibold uppercase tracking-wide ${styles.textMuted}`}
                        >
                            {title}
                        </p>
                    ) : null}
                    {subtitle ? (
                        <p className={`mt-1 text-xs ${styles.textMuted}`}>
                            {subtitle}
                        </p>
                    ) : null}
                </div>
            ) : null}
            <div className={`grid ${gridClassName} gap-3 text-xs`}>
                <div
                    className={`rounded-md p-2 ${styles.surfaceMuted} ${styles.border}`}
                >
                    <p className={`font-medium ${styles.textMuted}`}>WER</p>
                    <p className={styles.textPrimary}>
                        {hasMetrics ? metrics.wer.toFixed(4) : '-'}
                    </p>
                </div>
                <div
                    className={`rounded-md p-2 ${styles.surfaceMuted} ${styles.border}`}
                >
                    <p className={`font-medium ${styles.textMuted}`}>CER</p>
                    <p className={styles.textPrimary}>
                        {hasMetrics ? metrics.cer.toFixed(4) : '-'}
                    </p>
                </div>
                {showTime ? (
                    <div
                        className={`rounded-md p-2 ${styles.surfaceMuted} ${styles.border}`}
                    >
                        <p className={`font-medium ${styles.textMuted}`}>
                            Time (s)
                        </p>
                        <p className={styles.textPrimary}>
                            {hasTime && metrics.rtTime !== null
                                ? metrics.rtTime.toFixed(2)
                                : '-'}
                        </p>
                    </div>
                ) : null}
            </div>
            {footer ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {footer}
                </div>
            ) : null}
        </div>
    )
}
