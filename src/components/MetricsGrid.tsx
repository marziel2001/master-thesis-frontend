import type { MetricsGridProps } from './MetricsGrid.types'

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
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {title || subtitle ? (
                <div className="mb-3">
                    {title ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {title}
                        </p>
                    ) : null}
                    {subtitle ? (
                        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
                    ) : null}
                </div>
            ) : null}
            <div className={`grid ${gridClassName} gap-3 text-xs`}>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                    <p className="font-medium text-gray-600">WER</p>
                    <p className="text-gray-900">
                        {hasMetrics ? metrics.wer.toFixed(4) : '-'}
                    </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                    <p className="font-medium text-gray-600">CER</p>
                    <p className="text-gray-900">
                        {hasMetrics ? metrics.cer.toFixed(4) : '-'}
                    </p>
                </div>
                {showTime ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                        <p className="font-medium text-gray-600">Time (s)</p>
                        <p className="text-gray-900">
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
