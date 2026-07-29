/**
 * Metrics for a single transcription result.
 *
 * Replaces the previously duplicated `ModelMetrics` (MainPage) and
 * `EntryMetrics` (ComparePage), which were structurally identical.
 */
export type Metrics = {
    /** Word error rate. */
    wer: number | null
    /** Character error rate. */
    cer: number | null
    /** Wall-clock processing time in seconds. */
    rtTime: number | null
    /** Real-time factor: processing time divided by audio duration. */
    rtf: number | null
}

/**
 * Lifecycle of a single async unit of work.
 *
 * Replaces the duplicated `ModelStatus`, `EntryStatus` and
 * `TranscriptionCardStatus` unions.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
