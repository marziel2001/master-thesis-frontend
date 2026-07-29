/**
 * Reads a design token off the document root.
 *
 * Canvas-based renderers (Chart.js) cannot consume CSS custom properties, so
 * they resolve them here instead of hardcoding colour literals.
 */
export function readCssToken(name: string, fallback: string): string {
    if (typeof window === 'undefined') {
        return fallback
    }

    const value = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim()

    return value || fallback
}
