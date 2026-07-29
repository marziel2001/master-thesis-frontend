const pad2 = (value: number) => String(value).padStart(2, '0')

/** Strips the extension from a file name, e.g. `talk.wav` -> `talk`. */
export function removeFileExtension(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, '')
}

/**
 * Makes a string safe to use as a file-name stem, keeping only characters that
 * every target filesystem accepts.
 */
export function toSafeFileStem(value: string, fallback: string): string {
    const safe = value
        .replace(/[^a-z0-9._-]+/gi, '_')
        .replace(/^[_ .]+|[_ .]+$/g, '')

    return safe || fallback
}

/** Lower-case kebab slug, e.g. `Processing time (s)` -> `processing-time-s`. */
export function toFileNameSlug(value: string, fallback: string): string {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return slug || fallback
}

/** `20260729_1435` - compact stamp for run names. */
export function formatCompactTimestamp(date: Date): string {
    return (
        `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
        `_${pad2(date.getHours())}${pad2(date.getMinutes())}`
    )
}

/** `2026-07-29-14-35-07` - hyphen-separated stamp for exported files. */
export function formatHyphenTimestamp(date: Date): string {
    return date.toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

/** Triggers a browser download for an already-built URL. */
export function downloadUrl(url: string, fileName: string): void {
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
}

/** Triggers a browser download for in-memory text content. */
export function downloadTextFile(
    content: string,
    fileName: string,
    mimeType: string
): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    try {
        downloadUrl(url, fileName)
    } finally {
        URL.revokeObjectURL(url)
    }
}
