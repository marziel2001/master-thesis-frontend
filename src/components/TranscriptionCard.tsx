import type { ReactNode } from 'react'
import styles from '../styles/theme.module.css'

export type TranscriptionCardStatus = 'idle' | 'loading' | 'success' | 'error'

export type TranscriptionCardProps = {
    status: TranscriptionCardStatus
    title: string
    subtitle?: string
    headerExtras?: ReactNode
    headerActions?: ReactNode
    headerContent?: ReactNode
    children: ReactNode
}

const STATUS_STYLES: Record<TranscriptionCardStatus, string> = {
    idle: styles.card,
    loading: `${styles.card} ${styles.statusLoading}`,
    success: `${styles.card} ${styles.statusSuccess}`,
    error: `${styles.card} ${styles.statusError}`,
}

export default function TranscriptionCard({
    status,
    title,
    subtitle,
    headerExtras,
    headerActions,
    headerContent,
    children,
}: TranscriptionCardProps) {
    return (
        <section
            className={`w-full rounded-xl p-4 shadow-sm transition-all duration-300 ease-out ${
                STATUS_STYLES[status]
            }`}
        >
            {headerContent ? (
                <div className="mb-3 w-full">{headerContent}</div>
            ) : (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            <p
                                className={`text-sm font-semibold ${styles.textPrimary}`}
                            >
                                {title}
                            </p>
                            {subtitle ? (
                                <p className={`text-xs ${styles.textMuted}`}>
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>
                        {headerExtras ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {headerExtras}
                            </div>
                        ) : null}
                    </div>
                    {headerActions ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {headerActions}
                        </div>
                    ) : null}
                </div>
            )}
            {children}
        </section>
    )
}
