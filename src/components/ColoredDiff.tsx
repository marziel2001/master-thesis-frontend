import { useEffect, useState } from 'react'
import { getDiffHtml } from '../requests/diff'

type ColoredDiffProps = {
    referenceText: string
    hypothesisText: string
    modelName: string
    enabled: boolean
}

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
            <p className="mt-3 text-xs text-gray-500">
                Add reference text to see notebook-style diff.
            </p>
        )
    }

    if (!hypothesisText.trim()) {
        return (
            <p className="mt-3 text-xs text-gray-500">
                Run transcription to see notebook-style diff.
            </p>
        )
    }

    if (loading) {
        return <p className="mt-3 text-xs text-gray-500">Loading diff...</p>
    }

    return (
        <div className="mt-3" dangerouslySetInnerHTML={{ __html: diffHtml }} />
    )
}
