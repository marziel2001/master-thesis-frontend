import { useEffect, useState } from 'react'
import { getDiffHtml } from '../requests/diff'
import type { ColoredDiffProps } from './ColoredDiff.types'

export default function ColoredDiff({
    referenceText,
    hypothesisText,
    modelName,
    enabled,
}: ColoredDiffProps) {
    const [diffHtml, setDiffHtml] = useState('')
    const [loading, setLoading] = useState(false)

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
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-500 shadow-sm">
                Add reference text to see notebook-style diff.
            </div>
        )
    }

    if (!hypothesisText.trim()) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-500 shadow-sm">
                Run transcription to see notebook-style diff.
            </div>
        )
    }

    if (loading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-500 shadow-sm">
                Loading diff...
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div dangerouslySetInnerHTML={{ __html: diffHtml }} />
        </div>
    )
}
