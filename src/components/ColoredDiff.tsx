import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getDiffHtml } from '../requests/diff'
import type { ColoredDiffProps } from './ColoredDiff.types'
import styles from '../styles/theme.module.css'

type DiffResponse = {
    ref_html: string
    hyp_html: string
}

export default function ColoredDiff({
    referenceText,
    hypothesisText,
    modelName,
    enabled,
    title,
}: ColoredDiffProps) {
    const [diff, setDiff] = useState<DiffResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [syncScroll, setSyncScroll] = useState(true)

    const refRef = useRef<HTMLDivElement | null>(null)
    const hypRef = useRef<HTMLDivElement | null>(null)

    const isSyncing = useRef(false)

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

    // 🔄 fetch diff
    useEffect(() => {
        const hasTexts =
            referenceText.trim().length > 0 && hypothesisText.trim().length > 0

        if (!enabled || !hasTexts) {
            setDiff(null)
            return
        }

        let cancelled = false

        const load = async () => {
            setLoading(true)
            try {
                const res = await getDiffHtml({
                    referenceText,
                    hypothesisText,
                    modelName,
                })

                if (!cancelled) {
                    setDiff(res)
                }
            } catch {
                if (!cancelled) setDiff(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void load()

        return () => {
            cancelled = true
        }
    }, [referenceText, hypothesisText, modelName, enabled])

    // 🔗 sync scroll logic
    const handleScroll = (source: 'ref' | 'hyp') => {
        if (!syncScroll) return
        if (isSyncing.current) return

        const from = source === 'ref' ? refRef.current : hypRef.current
        const to = source === 'ref' ? hypRef.current : refRef.current

        if (!from || !to) return

        isSyncing.current = true

        const ratio = from.scrollTop / (from.scrollHeight - from.clientHeight)

        to.scrollTop = ratio * (to.scrollHeight - to.clientHeight)

        requestAnimationFrame(() => {
            isSyncing.current = false
        })
    }

    if (!enabled) return null

    if (!referenceText.trim()) {
        return renderCard(
            <p className={`text-xs ${styles.textMuted}`}>
                Add reference text to see diff.
            </p>
        )
    }

    if (!hypothesisText.trim()) {
        return renderCard(
            <p className={`text-xs ${styles.textMuted}`}>
                Run transcription to see diff.
            </p>
        )
    }

    return renderCard(
        <div className="flex flex-col gap-2">
            {/* toggle */}
            <label
                className={`text-xs ${styles.textMuted} flex items-center gap-2`}
            >
                <input
                    type="checkbox"
                    checked={syncScroll}
                    onChange={(e) => setSyncScroll(e.target.checked)}
                />
                Sync scroll
            </label>

            {loading && (
                <p className={`text-xs ${styles.textMuted}`}>Loading diff...</p>
            )}

            {!loading && diff && (
                <div className="grid grid-cols-2 gap-2">
                    {/* REF */}
                    <div
                        ref={refRef}
                        onScroll={() => handleScroll('ref')}
                        className="h-[400px] overflow-auto border rounded p-2"
                        dangerouslySetInnerHTML={{ __html: diff.ref_html }}
                    />

                    {/* HYP t*/}
                    <div
                        ref={hypRef}
                        onScroll={() => handleScroll('hyp')}
                        className="h-[400px] overflow-auto border rounded p-2"
                        dangerouslySetInnerHTML={{ __html: diff.hyp_html }}
                    />
                </div>
            )}
        </div>
    )
}
