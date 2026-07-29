export const CSV_SEPARATOR = ';'
export const CSV_MIME_TYPE = 'text/csv;charset=utf-8;'

type CsvValue = string | number | null | undefined

/** Quotes and escapes a single cell per RFC 4180. */
function toCsvCell(value: CsvValue): string {
    if (value === null || value === undefined) {
        return ''
    }

    const rawValue = String(value)
    const escaped = rawValue.replace(/"/g, '""')

    return /[";\n\r]/.test(rawValue) ? `"${escaped}"` : escaped
}

/**
 * Renders a header row plus data rows as CSV text, with a trailing newline.
 * Columns are taken from `headers`, so the order is explicit and stable.
 */
export function buildCsvContent<Row extends Record<string, CsvValue>>(
    headers: ReadonlyArray<keyof Row & string>,
    rows: readonly Row[]
): string {
    const lines = [
        headers.join(CSV_SEPARATOR),
        ...rows.map((row) =>
            headers.map((header) => toCsvCell(row[header])).join(CSV_SEPARATOR)
        ),
    ]

    return `${lines.join('\n')}\n`
}
