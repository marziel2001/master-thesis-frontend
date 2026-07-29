import type { ReactNode } from 'react'
import { Row, Text } from '../../atoms'
import type { AsyncStatus } from '../../../types/metrics'
import styles from './TranscriptionCard.module.css'

const STATUS_CLASS: Record<AsyncStatus, string> = {
    idle: '',
    loading: styles.statusLoading,
    success: styles.statusSuccess,
    error: styles.statusError,
}

export type TranscriptionCardProps = {
    /** Tints the card to reflect the result's progress. */
    status: AsyncStatus
    /** Replaces the default title row entirely. */
    header?: ReactNode
    title?: string
    subtitle?: string
    /** Controls rendered next to the title. */
    titleAdornment?: ReactNode
    /** Controls aligned to the end of the header row. */
    actions?: ReactNode
    children: ReactNode
}

/** Status-tinted shell shared by the transcription and comparison results. */
export default function TranscriptionCard({
    status,
    header,
    title,
    subtitle,
    titleAdornment,
    actions,
    children,
}: TranscriptionCardProps) {
    const className = [styles.card, STATUS_CLASS[status]]
        .filter(Boolean)
        .join(' ')

    return (
        <section className={className}>
            <div className={styles.header}>
                {header ?? (
                    <div className={styles.defaultHeader}>
                        <Row gap={3}>
                            <div>
                                {title ? (
                                    <Text size="sm" weight="semibold">
                                        {title}
                                    </Text>
                                ) : null}
                                {subtitle ? (
                                    <Text size="xs" tone="muted">
                                        {subtitle}
                                    </Text>
                                ) : null}
                            </div>
                            {titleAdornment ? (
                                <Row gap={2}>{titleAdornment}</Row>
                            ) : null}
                        </Row>
                        {actions ? <Row gap={2}>{actions}</Row> : null}
                    </div>
                )}
            </div>
            {children}
        </section>
    )
}
