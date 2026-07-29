import { calculateRtf } from '../../lib/metrics'
import type { Metrics } from '../../types/metrics'

/** Shape written by the backend's transcription output files. */
type ResultJsonPayload = {
    modelName?: unknown
    modelVersion?: unknown
    computeTime?: unknown
    audioDuration?: unknown
    transcription?: unknown
    wer?: unknown
    cer?: unknown
}

export type ImportedResult = {
    /** Set only when the file names a model the catalog knows about. */
    modelId: string | null
    modelVersion: string
    transcription: string
    metrics: Metrics
    audioDuration: number | null
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const asNumber = (value: unknown) =>
    typeof value === 'number' ? value : null

/**
 * Parses a saved transcription result. Throws when the text is not valid JSON;
 * unexpected field types degrade to empty/null rather than failing.
 */
export function parseResultJson(
    text: string,
    knownModelIds: readonly string[]
): ImportedResult {
    const payload = JSON.parse(text || '{}') as ResultJsonPayload

    const rtTime = asNumber(payload.computeTime)
    const audioDuration = asNumber(payload.audioDuration)
    const modelName = asString(payload.modelName)

    return {
        modelId: knownModelIds.includes(modelName) ? modelName : null,
        modelVersion: asString(payload.modelVersion),
        transcription: asString(payload.transcription),
        metrics: {
            wer: asNumber(payload.wer),
            cer: asNumber(payload.cer),
            rtTime,
            rtf: calculateRtf(rtTime, audioDuration),
        },
        audioDuration,
    }
}
