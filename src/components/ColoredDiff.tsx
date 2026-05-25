import { useEffect, useState, type ReactNode } from 'react'
import { getDiffHtml } from '../requests/diff'
import type { ColoredDiffProps } from './ColoredDiff.types'
import styles from '../styles/theme.module.css'

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
        <div
            className={`rounded-xl p-3 shadow-sm ${styles.border} ${styles.surface}`}
        >
            {title ? (
                <p
                    className={`mb-2 text-xs font-semibold uppercase tracking-wide ${styles.textMuted}`}
                >
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
            <p className={`text-xs ${styles.textMuted}`}>
                Add reference text to see notebook-style diff.
            </p>
        )
    }

    if (!hypothesisText.trim()) {
        return renderCard(
            <p className={`text-xs ${styles.textMuted}`}>
                Run transcription to see notebook-style diff.
            </p>
        )
    }

    if (loading) {
        return renderCard(
            <p className={`text-xs ${styles.textMuted}`}>Loading diff...</p>
        )
    }

    return renderCard(
        <div
            className="overflow-hidden"
            dangerouslySetInnerHTML={{ __html: diffHtml }}
        />
    )
}
