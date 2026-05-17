import { useEffect, useState, type ReactNode } from 'react'
import { getDiffHtml } from '../requests/diff'
import type { ColoredDiffProps } from './ColoredDiff.types'

export default function ColoredDiff({
    referenceText,
    hypothesisText,
    modelName,
    enabled,
    title,
}: ColoredDiffProps) {
    const [diffHtml, setDiffHtml] = useState('')
    const [loading, setLoading] = useState(false)

    const renderCard = (content: ReactNode) => (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {title ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {title}
                </p>
            ) : null}
            {content}
        </div>
    )

    useEffect(() => {
        const hasTexts =
            referenceText.trim().length > 0 && hypothesisText.trim().length > 0

        if (!enabled || !hasTexts) {
            setDiffHtml('')
            return
        }

        let cancelled = false

        const loadDiff = async () => {
            setLoading(true)
            try {
                const htmlFromApi = await getDiffHtml({
                    referenceText,
                    hypothesisText,
                    modelName,
                })

                if (!cancelled) {
                    setDiffHtml(htmlFromApi)
                }
            } catch {
                if (!cancelled) {
                    setDiffHtml(
                        '<div style="color:#b00020;">Failed to generate colored diff HTML.</div>'
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadDiff()

        return () => {
            cancelled = true
        }
    }, [referenceText, hypothesisText, modelName, enabled])

    if (!enabled) {
        return null
    }

    if (!referenceText.trim()) {
        return renderCard(
            <p className="text-xs text-gray-500">
                Add reference text to see notebook-style diff.
            </p>
        )
    }

    if (!hypothesisText.trim()) {
        return renderCard(
            <p className="text-xs text-gray-500">
                Run transcription to see notebook-style diff.
            </p>
        )
    }

    if (loading) {
        return renderCard(
            <p className="text-xs text-gray-500">Loading diff...</p>
        )
    }

    return renderCard(
        <div
            className="overflow-hidden"
            dangerouslySetInnerHTML={{ __html: diffHtml }}
        />
    )
}
