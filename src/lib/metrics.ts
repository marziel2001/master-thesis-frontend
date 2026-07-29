import type { Metrics } from '../types/metrics'

export const EMPTY_METRICS: Metrics = {
    wer: null,
    cer: null,
    rtTime: null,
    rtf: null,
}

/** Placeholder shown wherever a metric has not been computed yet. */
export const MISSING_METRIC_LABEL = '-'

export const WER_CER_FRACTION_DIGITS = 4
export const SECONDS_FRACTION_DIGITS = 2

/**
 * Real-time factor: processing time relative to audio length.
 * Returns `null` unless both inputs are finite and the duration is positive.
 */
export function calculateRtf(
    rtTime: number | null | undefined,
    audioDuration: number | null | undefined
): number | null {
    if (typeof rtTime !== 'number' || typeof audioDuration !== 'number') {
        return null
    }

    if (
        !Number.isFinite(rtTime) ||
        !Number.isFinite(audioDuration) ||
        audioDuration <= 0
    ) {
        return null
    }

    return rtTime / audioDuration
}

/** True when at least one metric has been computed. */
export function hasAnyMetric(metrics: Metrics): boolean {
    return (
        metrics.wer !== null ||
        metrics.cer !== null ||
        metrics.rtTime !== null ||
        metrics.rtf !== null
    )
}

/** Formats a metric for display, falling back to the missing-value label. */
export function formatMetric(
    value: number | null | undefined,
    fractionDigits: number
): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return MISSING_METRIC_LABEL
    }

    return value.toFixed(fractionDigits)
}
