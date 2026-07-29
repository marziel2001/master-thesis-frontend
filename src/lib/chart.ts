import { readCssToken } from './cssTokens'

export const RELATIVE_SCALE_FRACTION_DIGITS = 2
export const ABSOLUTE_SCALE_FRACTION_DIGITS = 4

/** Longest axis label line before it is wrapped, in characters. */
export const AXIS_LABEL_WRAP_WIDTH = 18

function clamp01(value: number): number {
    if (Number.isNaN(value)) {
        return 0
    }

    return Math.max(0, Math.min(1, value))
}

/**
 * Metrics on an absolute 0-1 scale (WER, CER) are shown with more precision
 * than ones normalised against the largest value in the series.
 */
export function formatChartValue(
    value: number,
    useRelativeScale: boolean
): string {
    return value.toFixed(
        useRelativeScale
            ? RELATIVE_SCALE_FRACTION_DIGITS
            : ABSOLUTE_SCALE_FRACTION_DIGITS
    )
}

/** Bar width as a whole percentage of the track. */
export function getBarPercent(
    value: number,
    useRelativeScale: boolean,
    maxValue: number
): number {
    if (!useRelativeScale) {
        return Math.round(clamp01(value) * 100)
    }

    if (!(maxValue > 0)) {
        return 0
    }

    return Math.round(clamp01(value / maxValue) * 100)
}

/**
 * Splits a label into lines of at most `maxCharsPerLine`, breaking words that
 * are longer than a whole line. Chart.js renders a string array as one line
 * per entry.
 */
export function wrapLabel(label: string, maxCharsPerLine: number): string[] {
    const words = label.split(/\s+/).filter(Boolean)

    if (words.length === 0) {
        return [label]
    }

    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word

        if (nextLine.length <= maxCharsPerLine) {
            currentLine = nextLine
            continue
        }

        if (currentLine) {
            lines.push(currentLine)
        }

        if (word.length > maxCharsPerLine) {
            const chunks = word.match(
                new RegExp(`.{1,${maxCharsPerLine}}`, 'g')
            )
            if (chunks) {
                lines.push(...chunks.slice(0, -1))
                currentLine = chunks[chunks.length - 1]
                continue
            }
        }

        currentLine = word
    }

    if (currentLine) {
        lines.push(currentLine)
    }

    return lines.length > 0 ? lines : [label]
}

export type ChartColors = {
    barFill: string
    barBorder: string
    grid: string
    axisLabel: string
    axisTick: string
}

/**
 * Resolves the chart palette from the design tokens.
 *
 * Chart.js paints onto a canvas and cannot read CSS custom properties, so the
 * values are read once per render of the chart instead of being hardcoded.
 */
export function readChartColors(): ChartColors {
    return {
        barFill: readCssToken(
            '--app-color-chart-bar-fill',
            'rgb(37 99 235 / 0.82)'
        ),
        barBorder: readCssToken('--app-color-chart-bar-border', '#2563eb'),
        grid: readCssToken('--app-color-chart-grid', 'rgb(148 163 184 / 0.22)'),
        axisLabel: readCssToken('--app-color-chart-axis-label', '#334155'),
        axisTick: readCssToken('--app-color-chart-axis-tick', '#64748b'),
    }
}
