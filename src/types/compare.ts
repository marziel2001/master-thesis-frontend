import type { AsyncStatus, Metrics } from './metrics'

/** One hypothesis being compared against the reference text. */
export type CompareEntry = {
    id: string
    modelId: string
    /** Variant reported by whatever produced this text, when known. */
    modelVersion?: string
    fileName: string
    text: string
    /** Bumped on every edit to `text`. */
    textVersion: number
    metrics: Metrics
    /** Reference-text version the metrics were computed against. */
    metricsVersion: number
    /** `textVersion` the metrics were computed against. */
    metricsTextVersion: number
    audioDuration: number | null
    status: AsyncStatus
}
