import type { ReactNode } from 'react'

export type MetricsGridProps = {
    metrics: {
        wer: number | null
        cer: number | null
        rtTime?: number | null
    }
    showTime?: boolean
    title?: string
    subtitle?: string
    footer?: ReactNode
}
