import { buildCsvContent } from '../../lib/csv'
import type { CompareEntry } from '../../types/compare'

export type CompareCsvRow = {
    runName: string
    model: string
    modelVersion: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf: number | null
    audioDuration: number | null
}

/** Column order of the exported file. */
const CSV_HEADERS = [
    'runName',
    'model',
    'modelVersion',
    'wer',
    'cer',
    'rtTime',
    'rtf',
    'audioDuration',
] as const satisfies ReadonlyArray<keyof CompareCsvRow>

/** Entries with nothing measured are not worth a row. */
function hasExportableValues(entry: CompareEntry): boolean {
    return (
        entry.metrics.wer !== null ||
        entry.metrics.cer !== null ||
        entry.metrics.rtTime !== null ||
        entry.metrics.rtf !== null ||
        entry.audioDuration !== null
    )
}

export function toCompareCsvRows(
    entries: readonly CompareEntry[],
    runName: string
): CompareCsvRow[] {
    return entries.filter(hasExportableValues).map((entry) => ({
        runName,
        model: entry.modelId,
        modelVersion: entry.modelVersion ?? '',
        wer: entry.metrics.wer,
        cer: entry.metrics.cer,
        rtTime: entry.metrics.rtTime,
        rtf: entry.metrics.rtf,
        audioDuration: entry.audioDuration,
    }))
}

export function buildCompareCsv(rows: readonly CompareCsvRow[]): string {
    return buildCsvContent(CSV_HEADERS, rows)
}

export { hasExportableValues }
