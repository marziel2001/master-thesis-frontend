import { useEffect, useRef } from 'react'
import { Row, Text, TextArea } from '../../atoms'
import TranscriptionCard from '../TranscriptionCard/TranscriptionCard'
import type { LiveModelState } from '../../../hooks/useLiveTranscription'
import type { AsyncStatus } from '../../../types/metrics'
import styles from './LiveModelPanel.module.css'

export type LiveModelPanelProps = {
    modelLabel: string
    state: LiveModelState
}

const CARD_STATUS: Record<LiveModelState['status'], AsyncStatus> = {
    pending: 'loading',
    listening: 'success',
    error: 'error',
}

const STATUS_LABEL: Record<LiveModelState['status'], string> = {
    pending: 'Connecting...',
    listening: 'Listening',
    error: 'Error',
}

/** One model's live-updating transcript, reusing the same status-tinted shell as the batch results. */
export default function LiveModelPanel({
    modelLabel,
    state,
}: LiveModelPanelProps) {
    const transcriptRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
        const element = transcriptRef.current
        if (element) {
            element.scrollTop = element.scrollHeight
        }
    }, [state.transcript])

    return (
        <TranscriptionCard
            status={CARD_STATUS[state.status]}
            header={
                <Row justify="between" gap={3}>
                    <Text size="sm" weight="semibold" truncate>
                        {modelLabel}
                    </Text>
                    <Text
                        size="xs"
                        tone={state.status === 'error' ? 'danger' : 'muted'}
                    >
                        {STATUS_LABEL[state.status]}
                    </Text>
                </Row>
            }
        >
            <TextArea
                ref={transcriptRef}
                className={styles.transcript}
                surface="muted"
                minHeight="md"
                value={state.transcript}
                readOnly
                placeholder="Waiting for speech..."
            />

            <Row justify="between" gap={2} className={styles.footer}>
                <Text size="2xs" tone="subtle">
                    {state.lastComputeTime !== null
                        ? `Last chunk: ${state.lastComputeTime.toFixed(2)}s`
                        : 'No chunk processed yet'}
                </Text>
                {state.skippedChunks > 0 ? (
                    <Text size="2xs" tone="dangerSubtle">
                        {state.skippedChunks} chunk(s) skipped - falling behind
                    </Text>
                ) : null}
            </Row>

            {state.lastErrorMessage ? (
                <Text size="xs" tone="danger" className={styles.errorMessage}>
                    {state.lastErrorMessage}
                </Text>
            ) : null}
        </TranscriptionCard>
    )
}
