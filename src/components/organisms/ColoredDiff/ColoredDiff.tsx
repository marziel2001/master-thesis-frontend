import { useEffect, useState, type ReactNode } from 'react'
import { Checkbox, FieldLabel, Panel, Stack, Text } from '../../atoms'
import { useSyncedScroll } from '../../../hooks/useSyncedScroll'
import { getDiffHtml } from '../../../requests/diff'
import type { GetDiffHtmlResponse } from '../../../requests/diff.types'
import styles from './ColoredDiff.module.css'

export type ColoredDiffProps = {
    referenceText: string
    hypothesisText: string
    modelName: string
    /** Skips fetching entirely while false. */
    enabled: boolean
    title?: string
}

export default function ColoredDiff({
    referenceText,
    hypothesisText,
    modelName,
    enabled,
    title,
}: ColoredDiffProps) {
    const [diff, setDiff] = useState<GetDiffHtmlResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isScrollSynced, setIsScrollSynced] = useState(true)

    const { primaryRef, secondaryRef, syncFrom } =
        useSyncedScroll<HTMLDivElement>(isScrollSynced)

    useEffect(() => {
        const hasBothTexts =
            referenceText.trim().length > 0 && hypothesisText.trim().length > 0

        if (!enabled || !hasBothTexts) {
            setDiff(null)
            return
        }

        let cancelled = false

        const load = async () => {
            setIsLoading(true)
            try {
                const response = await getDiffHtml({
                    referenceText,
                    hypothesisText,
                    modelName,
                })
                if (!cancelled) {
                    setDiff(response)
                }
            } catch (error) {
                console.error(error)
                if (!cancelled) {
                    setDiff(null)
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void load()

        return () => {
            cancelled = true
        }
    }, [referenceText, hypothesisText, modelName, enabled])

    if (!enabled) {
        return null
    }

    const renderCard = (content: ReactNode) => (
        <Panel padding="sm" elevation="sm">
            {title ? (
                <Text
                    size="xs"
                    weight="semibold"
                    tone="muted"
                    eyebrow
                    className={styles.title}
                >
                    {title}
                </Text>
            ) : null}
            {content}
        </Panel>
    )

    if (!referenceText.trim()) {
        return renderCard(
            <Text size="xs" tone="muted">
                Add reference text to see diff.
            </Text>
        )
    }

    if (!hypothesisText.trim()) {
        return renderCard(
            <Text size="xs" tone="muted">
                Run transcription to see diff.
            </Text>
        )
    }

    return renderCard(
        <Stack gap={2}>
            <FieldLabel inline size="xs" weight="normal" tone="muted">
                <Checkbox
                    checked={isScrollSynced}
                    onChange={(event) =>
                        setIsScrollSynced(event.target.checked)
                    }
                />
                Sync scroll
            </FieldLabel>

            {isLoading ? (
                <Text size="xs" tone="muted">
                    Loading diff...
                </Text>
            ) : null}

            {!isLoading && diff ? (
                <div className={styles.panes}>
                    {/* The markup is produced by our own backend, which escapes
                        every token it interpolates. */}
                    <div
                        ref={primaryRef}
                        className={styles.pane}
                        onScroll={() => syncFrom('primary')}
                        dangerouslySetInnerHTML={{ __html: diff.ref_html }}
                    />
                    <div
                        ref={secondaryRef}
                        className={styles.pane}
                        onScroll={() => syncFrom('secondary')}
                        dangerouslySetInnerHTML={{ __html: diff.hyp_html }}
                    />
                </div>
            ) : null}
        </Stack>
    )
}
